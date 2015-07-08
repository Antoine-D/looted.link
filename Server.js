var express = require("express");
var app     = express();
var bodyParser = require("body-parser");
var path = require("path");

// configuring express to use body-parser as middle-ware.
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/',function(req,res) {
    res.sendFile(path.join(__dirname+"/index.html"));
});

app.get('/create',function(req,res) {
    res.sendFile(path.join(__dirname+"/create.html"));
});

var itemRouter = express.Router();
var statsRouter = express.Router();

itemRouter.use(function (req, res, next) {
    res.sendFile(path.join(__dirname+"/item.html"));
});

statsRouter.use(function (req, res, next) {

    var fullPathOfRequest = req.originalUrl;

    if(fullPathOfRequest != null) {
        var itemIndex = fullPathOfRequest.substring(
            fullPathOfRequest.indexOf('stats/') + 6);

        var mysql = require('mysql');
    
        var connection = mysql.createConnection({
            host     : 'localhost',
            user     : 'antoine',
            password : 'santab22',
            database : 'looted',
        });

        connection.connect();

        // Querey for selecting elements of the item
        var queryString = "select name, " +
            "slot, " +
            "icon_number, " +
            "durability_numerator, " +
            "durability_denominator, " +
            "level_required, " +
            "stat_1, " +
            "stat_2, " +
            "stat_3, " +
            "bonus_1, " +
            "bonus_2, " +
            "create_date, " +
            "rarity, " +
            "description " +
            "from Items WHERE id=" + 
            connection.escape(itemIndex);

        connection.query(queryString, function(err, rows, fields) {

            if(rows != null) {

                var itemInfo = Array(
                    rows[0].name, 
                    rows[0].slot, 
                    rows[0].icon_number.toString(), 
                    rows[0].durability_numerator.toString(), 
                    rows[0].durability_denominator.toString(), 
                    rows[0].level_required.toString(), 
                    rows[0].stat_1, 
                    rows[0].stat_2, 
                    rows[0].stat_3, 
                    rows[0].bonus_1, 
                    rows[0].bonus_2, 
                    rows[0].create_date, 
                    rows[0].rarity, 
                    rows[0].description);

                var itemInfoResponse = "";

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

// static files
app.use("/css", express.static(__dirname + '/css'));
app.use("/js", express.static(__dirname + '/js'));
app.use("/img", express.static(__dirname + '/img'));

// Registering the stats router (used in ajax call in item.html) and 
// the item router (redirected to after creation of item)
app.use('/stats/', statsRouter)
app.use('/item/', itemRouter);

// Handle posts from the create item page
app.post('/createitem', function(req, res) {
    createNewItem(res, req.body);
});

// fuction for getting the current datetime as string for inserting in
// the Items table as mysql TIMESTAMP (format 2038-01-19 03:14:07)
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

// create a new item and insert it as a row in the Item table using 
// the data from the post (requestOfBody).
function createNewItem(res, requestOfBody) {
    var mysql = require('mysql');
    
    var connection = mysql.createConnection({
        host     : 'localhost',
        user     : 'antoine',
        password : 'santab22',
        database : 'looted',
    });

    connection.connect();

    // current date for timestamp of creation (inserted into table)
    var nowDateTime = getCurrentDateTime();

    // querey for inserting the new items as a row in the table
    var queryString = "INSERT INTO Items (" + 
        "name," +  
        "slot," +  
        "icon_number," +  
        "durability_numerator," +  
        "durability_denominator," +  
        "level_required," +  
        "stat_1," + 
        "stat_2," +  
        "stat_3," +  
        "bonus_1," +  
        "bonus_2," +  
        "create_date," +  
        "rarity," +  
        "description) VALUES (" + 
        connection.escape(requestOfBody.name) + ", " + 
        connection.escape(requestOfBody.slot) + ", " + 
        connection.escape(requestOfBody.iconNumber) + ", " + 
        connection.escape(requestOfBody.durabilityNumerator) + ", " + 
        connection.escape(requestOfBody.durabilityDenominator) + ", " + 
        connection.escape(requestOfBody.levelRequired) + ", " + 
        connection.escape(requestOfBody.statOne) + ", " + 
        connection.escape(requestOfBody.statTwo) + ", " + 
        connection.escape(requestOfBody.statThree) + ", " + 
        connection.escape(requestOfBody.bonusOne) + ", " + 
        connection.escape(requestOfBody.bonusTwo) + ", '" + 
        nowDateTime + "', " + 
        connection.escape(requestOfBody.rarity) + ", " + 
        connection.escape(requestOfBody.description) + ");";
    
    // redirect user to item/<new item index>
    connection.query(queryString, function(err, rows, fields) {
        res.writeHead(301,
            {Location: "http://looted.link/item/" + rows.insertId}
        );
        res.end();
    });

    connection.end();
}

app.listen(3000);
