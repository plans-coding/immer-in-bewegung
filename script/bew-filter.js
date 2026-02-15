async function save_filter_OPFS() {

    try {
        const tripDomainSelect = document.getElementById("TripDomain");
        const participantGroupSelect = document.getElementById("ParticipantGroup");
        const tripDomainValues = Array.from(tripDomainSelect.selectedOptions).map(o => o.value);
        const participantGroupValues = Array.from(participantGroupSelect.selectedOptions).map(o => o.value);

        const filterObj = {
            tripDomain: tripDomainValues,
            participantGroup: participantGroupValues
        };
        const root = await navigator.storage.getDirectory();
        const fileHandle = await root.getFileHandle('filter.json', { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(filterObj, null, 2)); // pretty-print JSON
        await writable.close();
        //console.log("Saved filter to OPFS:", filterObj);

        updateFilterButtonVisibility();
        page_load();

    } catch (err) {
        console.error("Failed to save filter to OPFS:", err);
    }
}

async function load_filter_OPFS() {

    try {
        const root = await navigator.storage.getDirectory();
        const fileHandle = await root.getFileHandle('filter.json');
        const file = await fileHandle.getFile();
        const filterObj = JSON.parse(await file.text());

        const tripDomainSelect = document.getElementById("TripDomain");
        Array.from(tripDomainSelect.options).forEach(opt => {
            opt.selected = filterObj.tripDomain.includes(opt.value);
        });

        const participantGroupSelect = document.getElementById("ParticipantGroup");
        Array.from(participantGroupSelect.options).forEach(opt => {
            opt.selected = filterObj.participantGroup.includes(opt.value);
        });
        //console.log("Loaded filter from OPFS:", filterObj);
        updateFilterButtonVisibility();

    } catch (err) {
        console.warn("No saved filter found or failed to load:", err);
    }

}


async function get_filter_value_OPFS() {
    try {
        const root = await navigator.storage.getDirectory();
        const fileHandle = await root.getFileHandle('filter.json');
        const file = await fileHandle.getFile();
        const filterObj = JSON.parse(await file.text());
        //console.log("Get filter value from OPFS:", filterObj);
        return filterObj;
    } catch (err) {
        console.warn("No saved filter found or failed to load:", err);
    }
}

async function remove_filter() {
    const trip = document.getElementById("TripDomain");
    const group = document.getElementById("ParticipantGroup");

    Array.from(trip.options).forEach(o => o.selected = false);
    Array.from(group.options).forEach(o => o.selected = false);

    const dir = await navigator.storage.getDirectory();
    await dir.removeEntry('filter.json').catch(()=>{});

    updateFilterButtonVisibility();
    page_load();
}

function updateFilterButtonVisibility() {
    const tripDomainSelect = document.getElementById("TripDomain");
    const participantGroupSelect = document.getElementById("ParticipantGroup");
    const btn = document.getElementById("filter-button-overmenu");

    const hasTrip = tripDomainSelect.selectedOptions.length > 0;
    const hasGroup = participantGroupSelect.selectedOptions.length > 0;

    btn.style.display = (hasTrip || hasGroup) ? "inline" : "none";
}
