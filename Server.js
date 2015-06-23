var express = require("express");
var app     = express();
var bodyParser = require("body-parser");
var path = require("path");

// Configuring express to use body-parser as middle-ware.
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/',function(req,res) {
    res.sendFile(path.join(__dirname+'/index.html'));
});

app.get('/create',function(req,res) {
    res.sendFile(path.join(__dirname+'/create.html'));
});

var itemRouter = express.Router();
var statsRouter = express.Router();

itemRouter.use(function (req, res, next) {
    res.sendfile("item.html");
});

statsRouter.use(function (req, res, next) {

    var fullPathOfRequest = req.originalUrl;

    if(fullPathOfRequest != null) {
        var itemIndex = fullPathOfRequest.substring(fullPathOfRequest.indexOf('stats/') + 6);

        var mysql = require('mysql');
    
        var connection = mysql.createConnection({
            host     : 'localhost',
            user     : 'antoine',
            password : 'santab22',
            database : 'looted',
        });

        connection.connect();

        var levelReq = 80;

        //Querey for selecting from Name column by lastname: lastName
        var queryString = "select name, slot, icon_number, durability_numerator, durability_denominator, level_required, stat_1, stat_2, stat_3, bonus_1, bonus_2, create_date from Items WHERE id=" + itemIndex;

        connection.query(queryString, function(err, rows, fields) {

            if(rows != null) {
                var itemInfo = Array(rows[0].name, rows[0].slot, rows[0].icon_number.toString(), rows[0].durability_numerator.toString(), rows[0].durability_denominator.toString(), rows[0].level_required.toString(), rows[0].stat_1, rows[0].stat_2, rows[0].stat_3, rows[0].bonus_1, rows[0].bonus_2, rows[0].create_date);
                var itemInfoResponse = "";

                console.log(rows[0].slot);

                for(var i = 0; i < itemInfo.length; i++) {
                    itemInfoResponse += itemInfo[i];
                    if(i < itemInfo.length - 1) {
                        itemInfoResponse += "|<||@";
                    }
                }

                res.writeHead(200, {"Content-Type": "text/plain"});
                res.end(itemInfoResponse);
            }
        });

        connection.end();
    }
});

app.use("/css", express.static(__dirname + '/css'));
app.use("/js", express.static(__dirname + '/js'));
app.use("/img", express.static(__dirname + '/img'));

//Registering the stats router
app.use('/item/', itemRouter);
app.use('/stats/', statsRouter)

/* Handle posts from the create item page */
app.post('/createitem', function(req, res) {
    createNewItem(res, req.body);
});

function getCurrentDateTime() {
    var date = new Date();

    var monthNumber = date.getMonth();
    monthNumber++;
    if(monthNumber < 10) {
        monthNumber = "0" + monthNumber;
    }

    var dayNumber = date.getDate();
    if(dayNumber < 10) {
        dayNumber = "0" + dayNumber;
    }

    return date.getFullYear() + "-" + monthNumber + "-" + dayNumber + " 00:00:00";
}

function createNewItem(res, requestOfBody) {
    var mysql = require('mysql');
    
    var connection = mysql.createConnection({
        host     : 'localhost',
        user     : 'antoine',
        password : 'santab22',
        database : 'looted',
    });

    connection.connect();

    var nowDateTime = getCurrentDateTime();

    console.log(requestOfBody.slot);

    queryString = "INSERT INTO Items (name, slot, icon_number, durability_numerator, durability_denominator, level_required, stat_1, stat_2, stat_3, bonus_1, bonus_2, create_date) VALUES ('" + requestOfBody.name + "', '" + requestOfBody.slot + "', " + requestOfBody.iconNumber + ", " + requestOfBody.durabilityNumerator + ", " + requestOfBody.durabilityDenominator + ", " + requestOfBody.levelRequired + ", '" + requestOfBody.statOne + "', '" + requestOfBody.statTwo + "', '" + requestOfBody.statThree + "', '" + requestOfBody.bonusOne + "', '" + requestOfBody.bonusTwo + "', '" + nowDateTime + "');"
    
    console.log(queryString);
    //console.log(queryString);
    connection.query(queryString, function(err, rows, fields) {
        res.writeHead(301,
            {Location: "http://104.131.219.239:3000/item/" + rows.insertId}
        );
        res.end();
    });

    connection.end();
}

app.listen(3000);

console.log("Running at Port 3000");
