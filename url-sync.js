'use strict';

// JSON Patch outbox. Arrays are compared as a unit: an index shift must never
// silently apply an offline edit to a different day. Objects merge by property.
const SyncJSON = {
  copy: value => structuredClone(value),
  equal(a, b) {
    if (a === b) return true;
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    const keys = Object.keys(a);
    return keys.length === Object.keys(b).length && keys.every(k => Object.hasOwn(b, k) && this.equal(a[k], b[k]));
  },
  diff(before, after, path = []) {
    if (this.equal(before, after)) return [];
    if (before && after && typeof before === 'object' && typeof after === 'object' && !Array.isArray(before) && !Array.isArray(after)) {
      return [...new Set([...Object.keys(before), ...Object.keys(after)])].flatMap(key => {
        const p = [...path, key];
        if (!Object.hasOwn(after, key)) return [{ path:p, had:true, before:before[key], has:false }];
        if (!Object.hasOwn(before, key)) return [{ path:p, had:false, has:true, value:after[key] }];
        return this.diff(before[key], after[key], p);
      });
    }
    return [{ path, had:true, before, has:true, value:after }];
  },
  pointer: path => '/' + path.map(k => k.replace(/~/g, '~0').replace(/\//g, '~1')).join('/'),
  at(document, path) {
    let value = document;
    for (const key of path) {
      if (!value || typeof value !== 'object' || !Object.hasOwn(value, key)) return { has:false };
      value = value[key];
    }
    return { has:true, value };
  },
  rebase(document, changes, choice) {
    let result = this.copy(document);
    const conflicts = [], patch = [];
    for (const change of changes) {
      const current = this.at(result, change.path);
      if (current.has === change.has && (!change.has || this.equal(current.value, change.value))) continue;
      const matches = current.has === change.had && (!change.had || this.equal(current.value, change.before));
      if (!matches) {
        conflicts.push({ ...change, server:current });
        if (choice !== 'local') continue;
      }
      if (!change.path.length) {
        result = this.copy(change.value);
        patch.push({ op:'replace', path:'', value:this.copy(change.value) });
        continue;
      }
      const parent = this.at(result, change.path.slice(0, -1));
      // A deleted parent needs explicit review; never recreate a partial trip.
      if (!parent.has || !parent.value || typeof parent.value !== 'object') {
        if (matches) conflicts.push({ ...change, server:current });
        continue;
      }
      const key = change.path.at(-1), path = this.pointer(change.path);
      if (change.has) {
        Object.defineProperty(parent.value, key, { value:this.copy(change.value), enumerable:true, configurable:true, writable:true });
        patch.push({ op:current.has ? 'replace' : 'add', path, value:this.copy(change.value) });
      } else {
        delete parent.value[key];
        patch.push({ op:'remove', path });
      }
    }
    return { document:result, patch, conflicts };
  }
};

class URLSync {
  constructor(url, { read, write, fetch:request = fetch, update = () => {}, lock } = {}) {
    this.url = url;
    this.read = read;
    this.write = write;
    this.request = (...args) => request(...args);
    this.update = update;
    this.lock = lock || (fn => navigator.locks.request('chronik-sync:' + url, fn));
    this.record = null;
    this.chain = Promise.resolve();
    this.stopped = false;
    this.delay = 2000;
  }
  serial(fn) {
    const task = this.chain.then(() => this.lock(fn));
    this.chain = task.catch(() => {});
    return task;
  }
  async persist(record) {
    await this.write(SyncJSON.copy(record));
    this.record = record;
  }
  status(state, message = '') {
    this.state = state;
    this.message = message;
    if (!this.stopped) this.update(this);
  }
  log(kind, changes = [], message = '') {
    this.activity = this.activity || [];
    this.activity.push({ time:Date.now(), kind, changes:SyncJSON.copy(changes), message });
    if (this.activity.length > 100) this.activity = this.activity.slice(-100);
    if (!this.stopped) this.update(this);
  }
  async get() {
    const response = await this.request(this.url, { cache:'no-store', credentials:'include', signal:AbortSignal.timeout(12000), headers:{ Accept:'application/json' } });
    if (!response.ok) throw new Error(`Server returned HTTP ${response.status}`);
    const document = await response.json();
    if (!document.Settings || !document.Trips) throw new Error('The URL did not return a trip document. Check your sign-in.');
    const etag = response.headers.get('ETag');
    let accept = response.headers.get('Accept-Patch') || '';
    if (!accept) {
      try {
        const options = await this.request(this.url, { method:'OPTIONS', cache:'no-store', credentials:'include', signal:AbortSignal.timeout(5000) });
        if (options.ok) accept = options.headers.get('Accept-Patch') || '';
      } catch {}
    }
    return { document, etag, enabled:accept.split(',').some(v => v.trim().split(';')[0] === 'application/json-patch+json') && !!etag && !etag.startsWith('W/') };
  }
  async open() {
    return this.serial(async () => {
      const saved = await this.read();
      try {
        const remote = await this.get();
        // Never replace an outbox on reload, including when capability disappears.
        if (saved?.pending.length) this.record = saved;
        else await this.persist({ url:this.url, enabled:remote.enabled, etag:remote.etag, base:remote.document, working:remote.document, pending:[] });
        this.status(this.record.pending.length ? 'pending' : 'synced');
      } catch (error) {
        if (!saved) throw error;
        this.record = saved;
        this.status('offline', error.message);
      }
      this.committed = SyncJSON.copy(this.record.working);
      return SyncJSON.copy(this.record.working);
    });
  }
  async commit(document) {
    // Capture the user action now, before waiting for an in-flight request.
    const changes = SyncJSON.copy(SyncJSON.diff(this.committed, document));
    if (!changes.length) return;
    await this.serial(async () => {
      const record = await this.read() || this.record;
      const merged = SyncJSON.rebase(record.working, changes);
      if (merged.conflicts.length) throw new Error('Another tab changed the same fields. Reload and review before saving.');
      record.working = merged.document;
      record.pending.push({ id:crypto.randomUUID(), time:Date.now(), changes });
      await this.persist(record);
      this.committed = SyncJSON.copy(record.working);
      this.status('pending');
    });
    this.schedule(0);
  }
  schedule(delay = this.delay) {
    clearTimeout(this.timer);
    if (!this.stopped && this.record?.enabled && this.record.pending.length) {
      this.timer = setTimeout(() => this.sync(), delay);
    }
  }
  async sync(choice) {
    if (this.stopped || this.running) return;
    clearTimeout(this.timer);
    this.running = true;
    try {
      await this.serial(async () => {
        this.record = await this.read() || this.record;
        if (!this.record.enabled) return;
        if (!this.activity || this.state === 'synced') this.activity = [];
        this.status('syncing');
        this.log('checking');
        const remote = await this.get();
        if (!remote.enabled) throw new Error('The server no longer advertises JSON Patch support. Pending changes are kept on this device.');
        let record = SyncJSON.copy(this.record);
        const incoming = SyncJSON.diff(record.base, remote.document);
        if (incoming.length) this.log('incoming', incoming);
        // Combine the pending intent against its saved base. This also recognizes
        // a PATCH that succeeded when its response was lost, without replaying adds.
        let changes = SyncJSON.diff(record.base, record.working);
        const syncedDescriptions = changes.map(change => {
          const path = change.path.map(String);
          let subject = path.map(part => part.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ')).join(' › ');
          if (path[0] === 'Trips' && path.length > 1) {
            const trip = record.working.Trips?.[path[1]] || record.base.Trips?.[path[1]];
            const name = trip && (trip.Title || trip.Name || trip.Destination);
            subject = ['Trips', name || path[1], ...path.slice(2).map(part => part.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' '))].join(' › ');
          }
          const action = !change.has ? 'Removed' : !change.had ? 'Added' : 'Updated';
          return `${action}: ${subject || 'document'}`;
        });
        let merged = SyncJSON.rebase(remote.document, changes);
        if (merged.conflicts.length) {
          // A review decision applies only to the exact server version displayed.
          if (!choice || this.conflictETag !== remote.etag) {
            this.conflicts = merged.conflicts;
            this.conflictETag = remote.etag;
            this.log('conflicts', merged.conflicts);
            this.status('conflict', 'The server changed the same fields. Review before syncing.');
            return;
          }
          if (choice === 'local') {
            // Resolve a removed parent using the complete local subtree.
            changes = changes.map(c => {
              let path = c.path;
              while (path.length > 1) {
                const parent = SyncJSON.at(remote.document, path.slice(0, -1));
                if (parent.has && parent.value && typeof parent.value === 'object') break;
                path = path.slice(0, -1);
              }
              const local = SyncJSON.at(record.working, path), old = SyncJSON.at(remote.document, path);
              return { path, had:old.has, before:old.value, has:local.has, value:local.value };
            });
            merged = SyncJSON.rebase(remote.document, changes, 'local');
          }
          this.log(choice === 'local' ? 'keepLocal' : 'keepServer');
          // 'server' keeps the non-conflicting local edits from the first rebase.
        }
        // Save the rebase before sending: on a timeout the new base and intended
        // result are sufficient to determine whether the write already happened.
        record.base = remote.document;
        record.etag = remote.etag;
        record.working = merged.document;
        await this.persist(record);
        const outgoing = SyncJSON.diff(remote.document, merged.document);
        if (merged.patch.length) {
          this.log('sending', outgoing);
          const response = await this.request(this.url, {
            method:'PATCH', cache:'no-store', credentials:'include', signal:AbortSignal.timeout(12000),
            headers:{ 'Content-Type':'application/json-patch+json', 'If-Match':remote.etag },
            body:JSON.stringify(merged.patch)
          });
          if (response.status === 412) { this.log('retrying'); this.status('pending', 'Server changed; checking again.'); this.schedule(0); return; }
          if (!response.ok || response.redirected || !response.headers.get('ETag')) throw new Error(`Sync was not confirmed (HTTP ${response.status}). Check your sign-in or server.`);
          record.etag = response.headers.get('ETag');
          this.log('confirmed');
        }
        record.base = SyncJSON.copy(record.working);
        record.pending = [];
        await this.persist(record);
        this.committed = SyncJSON.copy(record.working);
        this.conflicts = null;
        this.lastSyncedChanges = syncedDescriptions;
        this.delay = 2000;
        this.log(incoming.length || outgoing.length ? 'complete' : 'unchanged');
        this.status('synced');
      });
    } catch (error) {
      this.log('failed', [], error.message);
      this.status('error', error.message);
      this.schedule();
      this.delay = Math.min(this.delay * 2, 60000);
    } finally { this.running = false; }
  }
  stop() { this.stopped = true; clearTimeout(this.timer); }
}

if (typeof module !== 'undefined') module.exports = { SyncJSON, URLSync };
