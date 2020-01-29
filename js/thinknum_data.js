(function () {
    // Create the connector object
    var myConnector = tableau.makeConnector();

    // Initial code
    myConnector.init = function(initCallback){
        $.ajaxSetup({
            headers: {
                'X-API-Version': '20151130',
                'Accept': 'application/json'
            }
        });
        $.getJSON("https://data.thinknum.com/datasets/", function (resp) {
            var dataset_select = document.getElementById('dataset_id');
            for (i = 0; i < resp.datasets.length; i++) {
                var dataset = resp.datasets[i]
                var option = document.createElement("option");
                option.value = resp.datasets[i].id
                option.text = resp.datasets[i].display_name
                dataset_select.add(option, null);
                console.log(dataset);
            }
        });
        initCallback();
    };

    // Define the schema
    myConnector.getSchema = function (schemaCallback) {
        var dataObj = JSON.parse(tableau.connectionData);
        var dataset_id = dataObj.dataset_id;
        var cols = [];
        var tableSchema = null;

        $.ajaxSetup({
            headers: {
                'Authorization': `token ${dataObj.token}`,
                'X-API-Version': '20151130',
                'Accept': 'application/json'
            }
        });
        $.getJSON(`https://data.thinknum.com/datasets/${dataObj.dataset_id}`, function (resp) {
            for (i = 0; i < resp.dataset_fields.length; i++) {
                var field_type = resp.dataset_fields[i].type
                var column_type = ''
                if (resp.dataset_fields[i].type == 'invisible') {
                    continue;
                }
                

                if (field_type == "date") {
                    column_type = tableau.dataTypeEnum.date
                } else if (field_type == "number") {
                    if (resp.dataset_fields[i].format == 'percent') {
                        column_type = tableau.dataTypeEnum.float
                    } else {
                        column_type = tableau.dataTypeEnum.int
                    }
                } else if (field_type == "geometry") {
                    column_type = tableau.dataTypeEnum.geometry
                } else if (field_type == "string") {
                    column_type = tableau.dataTypeEnum.string
                } else if (field_type == "boolean") {
                    column_type = tableau.dataTypeEnum.bool
                } else {
                    continue;
                }
                console.log(resp.dataset_fields[i].id);
                cols.push({
                    id: resp.dataset_fields[i].id,
                    alias: resp.dataset_fields[i].display_name,
                    dataType: column_type
                })
            }
            tableSchema = {
                id: dataset_id,
                alias: resp.display_name ? resp.display_name : dataset_id,
                columns: cols
            };
            schemaCallback([tableSchema]);
        });
    };

    // Download the data
    myConnector.getData = function (table, doneCallback) {
        var dataObj = JSON.parse(tableau.connectionData);
        var date_column = 'date_updated'
        $.ajax({
            url: `https://data.thinknum.com/connections/dataset/${dataObj.dataset_id}/query/new`,
            type: "POST",
            headers: {
                'Authorization': `token ${dataObj.token}`,
                'X-API-Version': '20151130',
                'Accept': 'application/json',
            },
            dataType: 'json',
            data: {
                request: JSON.stringify({
                    "tickers": [],
                    "filters": [{
                        "column": date_column,
                        "type": "[]",
                        "value": [dataObj.start_date, dataObj.end_date]
                    }],
                }),
                start: parseInt(dataObj.start),
                limit: parseInt(dataObj.limit),
            },
            success: function(data){
                var fieldIds = []
                for (i=0; i< data.items.fields.length; i++ ) {
                    fieldIds.push(data.items.fields[i].id)
                }
                
                var tableData = []
                for (i=0; i< data.items.rows.length; i++) {
                    var row = {};
                    for (j=0; j < fieldIds.length; j++ ) {
                        row[fieldIds[j]] = data.items.rows[i][j]
                    }
                    tableData.push(row);
                }

                table.appendRows(tableData);
                doneCallback();
            },
            error: function (jqXHR, textStatus, errorThrown) {
                $('#errorMsg').html("Error");
            }
        })
    };

    tableau.registerConnector(myConnector);

    $(document).ready(function () {
        $("#submitButton").click(function () {
            var token = $("#token").val().trim();
            var dataset_id = $("#dataset_id").val().trim();
            var start_date = $("#start_date").val().trim();
            var end_date = $("#end_date").val().trim();
            var start = $("#start").val().trim();
            var limit = $("#limit").val().trim();

            function isValidDate(dateStr) {
                var d = new Date(dateStr);
                return !isNaN(d.getDate());
            }

            function isNumeric(num){
                return !isNaN(num)
              }

            if (!token) {
                $('#errorMsg').html("Enter Token");
                return
            }
            if (!dataset_id) {
                $('#errorMsg').html("Enter Dataset");
                return
            }
            if (!isValidDate(start_date)) {
                $('#errorMsg').html("Enter valid start date. For example, 2016-05-08.");
                return
            }
            if (!isValidDate(end_date)) {
                $('#errorMsg').html("Enter valid end date. For example, 2016-05-08.");
                return
            }
            if (!isNumeric(start) || parseInt(start) < 1) {
                $('#errorMsg').html("Enter valid start. For example, 1, 100, 100000");
                return
            }
            if (!isNumeric(limit) || parseInt(limit) < 1 || parseInt(limit) > 100000) {
                $('#errorMsg').html("Enter valid limit. For example, 1, 100, 100000");
                return
            }

            tableau.connectionData = JSON.stringify({
                dataset_id: dataset_id,
                token: token,
                start_date: start_date,
                end_date: end_date,
                start: start,
                limit: limit
            });
            tableau.connectionName = "Thinknum Alternative Data";
            tableau.submit();
        });
    });
})();
