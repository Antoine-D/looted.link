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

app.get('/api',function(req,res) {
    res.sendFile(path.join(__dirname+"/api.html"));
});

/* Api Router */
var apiRouter = express.Router();


apiRouter.use(function (req, res, next) {

    // Querey for selecting elements of the item
    var queryString = "select id, " +
        "name, " +
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
        "from Items WHERE ";

    var fullPathOfRequest = req.originalUrl.toLowerCase();

    var mysql = require('mysql');
    
    var connection = mysql.createConnection({
        host     : 'localhost',
        user     : 'antoine',
        password : 'santab22',
        database : 'looted',
    });

    var isSingleItem = false;

    // api request for multiple items
    if(fullPathOfRequest.indexOf("items") > -1)
    {
        if(fullPathOfRequest.indexOf("all") > -1)
        {
            queryString += "id>0";
        }

        else if(fullPathOfRequest.indexOf("quality") > -1)
        {
            var qualityIndex = fullPathOfRequest.indexOf("quality/") + "quality/".length;
            var quality = fullPathOfRequest.substring(qualityIndex);
            quality = quality.charAt(0).toUpperCase() + quality.slice(1);
            queryString += ("rarity = " + connection.escape(quality));
        }

        else if(fullPathOfRequest.indexOf("slot") > -1)
        {
            var slotIndex = fullPathOfRequest.indexOf("slot/") + "slot/".length;
            var slot = fullPathOfRequest.substring(slotIndex);
            slot = slot.charAt(0).toUpperCase() + slot.slice(1);
            queryString += ("slot = " + connection.escape(slot));
        }

        else
        {
            res.json("Could not interpret request, see looted.link/api for assistance.");
            return;
        }
    }

    // api request for single item
    else if(fullPathOfRequest.indexOf("item") > -1)
    {
        var idNumberIndex = fullPathOfRequest.indexOf("item/") + "item/".length;
        var idNumber = connection.escape(fullPathOfRequest.substring(idNumberIndex));
        queryString += ("id = " + idNumber);
        isSingleItem = true;
    }

    else
    {
        res.json("Could not interpret request, see looted.link/api for assistance.");
        return;
    }

    //begin database connection
    connection.connect();

    connection.query(queryString, function(err, rows, fields) {

        if(rows != null) 
        {
            var queryResults = {};
            queryResults.items = rows;

            // add the link as an attribute and rename 'rarity' attribute to 'quailty'
            for(var i = 0; i < queryResults.items.length; i++)
            {
                queryResults.items[i].link = "http://looted.link/item/" + queryResults.items[i].id.toString();
                var qualityValue = queryResults.items[i].rarity;
                delete queryResults.items[i].rarity;
                queryResults.items[i].quality = qualityValue;
            }

            if(!isSingleItem)
            {
                res.json(queryResults);
            }
            
            else if(queryResults.items.length > 0)
            {
                res.json(queryResults.items[0]);
            }

            else
            {
                res.json({});
            }
        }

        else
        {
            res.json({});
        }
    });

    connection.end();
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
            fullPathOfRequest.indexOf("stats/") + "stats/".length);

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

            if(rows != null && Array.isArray(rows) && rows.length >= 1) {

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

// Registering the routers
app.use('/stats/', statsRouter)
app.use('/item/', itemRouter);
app.use('/api/', apiRouter);


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

app.listen(5000);
