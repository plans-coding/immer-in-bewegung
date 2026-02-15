use sqlite_wasm_rs as ffi;

use std::ffi::CString;
use std::ptr;
use serde_json::{Value, Map};

unsafe fn run_query(db: *mut ffi::sqlite3, sql: &str) -> Vec<Value> {
    let mut stmt: *mut ffi::sqlite3_stmt = ptr::null_mut();
    let csql = CString::new(sql).expect("ERROR");
    ffi::sqlite3_prepare_v2(db, csql.as_ptr(), -1, &mut stmt, ptr::null_mut());

    let mut rows = Vec::new();

    loop {
        let rc = ffi::sqlite3_step(stmt);
        if rc == ffi::SQLITE_ROW {
            let mut row = Map::new();
            let col_count = ffi::sqlite3_column_count(stmt);

            for i in 0..col_count {
                let name_ptr = ffi::sqlite3_column_name(stmt, i);
                let name = std::ffi::CStr::from_ptr(name_ptr)
                .to_string_lossy()
                .to_string();

                let col_type = ffi::sqlite3_column_type(stmt, i);

                let value = match col_type {
                    ffi::SQLITE_INTEGER => Value::from(ffi::sqlite3_column_int64(stmt, i)),
                    ffi::SQLITE_FLOAT => Value::from(ffi::sqlite3_column_double(stmt, i)),
                    ffi::SQLITE_TEXT => {
                        let text_ptr = ffi::sqlite3_column_text(stmt, i);
                        let text = std::ffi::CStr::from_ptr(text_ptr as *const i8)
                        .to_string_lossy()
                        .to_string();
                        Value::from(text)
                    }
                    ffi::SQLITE_NULL => Value::Null,
                    _ => Value::Null,
                };

                row.insert(name, value);
            }

            rows.push(Value::Object(row));
        } else {
            break;
        }
    }

    ffi::sqlite3_finalize(stmt);
    rows
}

pub async fn get_query_data(
    db_vec: &[u8],
    queries: Vec<(String, String)>,
) -> Value {
    unsafe {
        let mut db: *mut ffi::sqlite3 = ptr::null_mut();
        let flags = ffi::SQLITE_OPEN_READWRITE | ffi::SQLITE_OPEN_CREATE | ffi::SQLITE_OPEN_MEMORY;

        let ret = ffi::sqlite3_open_v2(
            b"memdb\0".as_ptr().cast(),
                                       &mut db,
                                       flags,
                                       ptr::null(),
        );
        assert_eq!(ret, ffi::SQLITE_OK, "Failed to open SQLite");

        // Deserialize the database into memory
        let ret = ffi::sqlite3_deserialize(
            db,
            b"main\0".as_ptr() as *const _,
                                           db_vec.as_ptr() as *mut u8,
                                           db_vec.len() as i64,
                                           db_vec.len() as i64,
                                           ffi::SQLITE_DESERIALIZE_READONLY,
        );
        assert_eq!(ret, ffi::SQLITE_OK, "Failed to deserialize DB");

        // Run each query and insert results into a JSON object
        let mut out = Map::new();
        for (name, sql) in queries {
            let rows = run_query(db, &sql);
            out.insert(name, Value::Array(rows));
        }

        ffi::sqlite3_close(db);
        Value::Object(out)
    }
}


pub async fn get_query_data_preserve_order(db_vec: &[u8], queries: Vec<(String, String)>) -> Value {
    unsafe {
        // Open in-memory database
        let mut db: *mut ffi::sqlite3 = ptr::null_mut();
        let flags = ffi::SQLITE_OPEN_READWRITE | ffi::SQLITE_OPEN_CREATE | ffi::SQLITE_OPEN_MEMORY;

        let ret = ffi::sqlite3_open_v2(
            b"memdb\0".as_ptr().cast(),
                                       &mut db,
                                       flags,
                                       ptr::null(),
        );
        assert_eq!(ret, ffi::SQLITE_OK, "Failed to open SQLite");

        // Deserialize the database into memory
        let ret = ffi::sqlite3_deserialize(
            db,
            b"main\0".as_ptr() as *const _,
                                           db_vec.as_ptr() as *mut u8,
                                           db_vec.len() as i64,
                                           db_vec.len() as i64,
                                           ffi::SQLITE_DESERIALIZE_READONLY,
        );
        assert_eq!(ret, ffi::SQLITE_OK, "Failed to deserialize DB");

        let mut out = Map::new();

        for (name, sql) in queries {
            let csql = CString::new(sql).expect("Failed to convert SQL to CString");
            let mut stmt: *mut ffi::sqlite3_stmt = ptr::null_mut();
            ffi::sqlite3_prepare_v2(db, csql.as_ptr(), -1, &mut stmt, ptr::null_mut());

            let mut rows = Vec::new();
            let mut columns = Vec::new();

            let col_count = ffi::sqlite3_column_count(stmt);

            // Capture column names once
            for i in 0..col_count {
                let name_ptr = ffi::sqlite3_column_name(stmt, i);
                let col_name = std::ffi::CStr::from_ptr(name_ptr)
                .to_string_lossy()
                .to_string();
                columns.push(col_name);
            }

            loop {
                let rc = ffi::sqlite3_step(stmt);
                if rc == ffi::SQLITE_ROW {
                    let mut row = Vec::with_capacity(col_count as usize);

                    for i in 0..col_count {
                        let col_type = ffi::sqlite3_column_type(stmt, i);
                        let value = match col_type {
                            ffi::SQLITE_INTEGER => Value::from(ffi::sqlite3_column_int64(stmt, i)),
                            ffi::SQLITE_FLOAT => Value::from(ffi::sqlite3_column_double(stmt, i)),
                            ffi::SQLITE_TEXT => {
                                let text_ptr = ffi::sqlite3_column_text(stmt, i);
                                let text = std::ffi::CStr::from_ptr(text_ptr as *const i8)
                                .to_string_lossy()
                                .to_string();
                                Value::from(text)
                            }
                            ffi::SQLITE_NULL => Value::Null,
                            _ => Value::Null,
                        };
                        row.push(value);
                    }

                    rows.push(Value::Array(row));
                } else {
                    break;
                }
            }

            ffi::sqlite3_finalize(stmt);

            // Store as object with columns + rows
            let mut query_obj = Map::new();
            query_obj.insert("columns".to_string(), Value::Array(columns.iter().map(|c| Value::from(c.clone())).collect()));
            query_obj.insert("rows".to_string(), Value::Array(rows));

            out.insert(name, Value::Object(query_obj));
        }

        ffi::sqlite3_close(db);
        Value::Object(out)
    }
}
