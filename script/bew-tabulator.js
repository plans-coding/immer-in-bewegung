// TABULATOR  -----------------------------------------------------------------------

let sqlOutputTable = null;

async function user_sql_execution() {
await user_run_sql(get_code_editor('sql-input'));
const tabulator_data = JSON.parse(document.getElementById("sql_output_data").textContent);
console.log(tabulator_data);
refreshTable(tabulator_data);
}

function initiate_spreadsheet() {
sqlOutputTable = new Tabulator("#sql_output_table", {
    height: "100%",
    data: [],
    //layout: "fitData",
    resizableColumns: false,
    virtualDom: true,
    columns: [],
    selectableRange: 1,
    selectableRangeColumns: true,
    selectableRangeRows: true,
    selectableRangeClearCells: true,
    clipboard: true,
    clipboardCopyStyled: false,
    clipboardCopyConfig: {
        rowHeaders: false,
        columnHeaders: false,
    },
    clipboardCopyRowRange: "range",
    clipboardPasteParser: "range",
    clipboardPasteAction: "range",
    dataLoader: true,
    dataLoaderLoading: false,
    cellSelection: true,
    selectable: true,
    headerSortClickElement: "icon",
});

// cellClick
sqlOutputTable.on("cellClick", function(e, cell){
    document.getElementById("cellViewer").textContent = cell.getValue();
});

}


function refreshTable(tabulator_data) {

document.getElementById("run_query_button").classList.add("inactivated-button");
document.getElementById("loading-overlay").style.display = "block";

if (!tabulator_data || tabulator_data.length === 0) {
    sqlOutputTable.setColumns([]);
    sqlOutputTable.setData([]);
    return;
}

const rownumColumn = {
    title: "",
    formatter: "rownum",
        frozen: true,
        width: 50,
        hozAlign: "center",
        headerSort: false,
};

const columns = tabulator_data.columns;
const rows = tabulator_data.rows;

const dataColumns = columns.map(colName => ({
    title: colName,
    field: colName,
    resizable: true,
    headerSort: true,
    headerFilter:"input"
}));

const allColumns = [rownumColumn, ...dataColumns];

const objectRows = rows.map((row, index) => {
    const obj = {};
    columns.forEach((colName, i) => {
        obj[colName] = row[i];
    });
    obj["_rownum"] = index + 1;
    return obj;
});

sqlOutputTable.setColumns(allColumns);

setTimeout(() => {
    sqlOutputTable.setData(objectRows);
    document.getElementById("loading-overlay").style.display = "none";
    document.getElementById("run_query_button").classList.remove("inactivated-button");
}, 50);

}
