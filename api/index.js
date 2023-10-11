const express = require("express");
const bodyParser = require("body-parser");
const {MongoClient, ObjectId } = require("mongodb");
const PgMem = require("pg-mem");

const db = PgMem.newDb();

    const render = require("./render.js");
// Measurements database setup and access

let database = null;
const collectionName = "measurements";

async function startDatabase() {
    const uri = "mongodb://localhost:27017/?maxPoolSize=20&w=majority";	
    const connection = await MongoClient.connect(uri, {useNewUrlParser: true});
    database = connection.db();
    console.log("database started successfully");
}

async function getDatabase() {
    if (!database) await startDatabase();
    return database;
}

async function insertMeasurement(message) {
    const {insertedId} = await database.collection(collectionName).insertOne(message);
    return insertedId;
}

async function getMeasurements() {
    return await database.collection(collectionName).find({}).toArray();	
}

async function getMeasurementById(id) {
    return await database.collection(collectionName).findOne({ _id: ObjectId(id) });	
}


// API Server

const app = express();

app.use(bodyParser.urlencoded({extended:false}));
app.use(express.static('spa/static'));

const PORT = 8080;

app.post('/measurement', function (req, res) {
-       console.log("device id    : " + req.body.id + " key         : " + req.body.key + " temperature : " + req.body.t + " humidity    : " + req.body.h + " timestamp  : " + timestamp);	
   
        // Validar measurement
        if (req.body.h < 0) {
                console.log("Measurement error: negative humidity")
        }

	
        if (req.body.h > 1.10) {
                console.log("Measurement error: humidity too high")
        }


        if (req.body.t < 5) {
                console.log("Measurement error: temperature too low")
        }

	
        if (req.body.t > 70) {
                console.log("Measurement error: temperature too high")
        }





	const {insertedId} = insertMeasurement({id:req.body.id, t:req.body.t, h:req.body.h, timestamp});
	res.send("received measurement into " +  insertedId);
});

app.post('/device', function (req, res) {
	console.log("device id    : " + req.body.id + " name        : " + req.body.n + " key         : " + req.body.k + " timestamp   : " + timestamp);

	// Crear variable con la marca de tiempo actual
	//const timestamp = new Date();
	const timestamp = 'z'

    db.public.none("INSERT INTO devices VALUES ('"+req.body.id+ "', '"+req.body.n+"', '"+req.body.k+ "', '" +timestamp+"')");
	res.send("received new device");
});


app.get('/web/device', function (req, res) {
	var devices = db.public.many("SELECT * FROM devices").map( function(device) {
		console.log(device);
		return '<tr><td><a href=/web/device/'+ device.device_id +'>' + device.device_id + "</a>" +
			       "</td><td>"+ device.name+"</td><td>"+ device.key+"</td><td>"+device.timestamp+"</td></tr>";
	   }
	);
	res.send("<html>"+
		     "<head><title>Sensores</title></head>" +
		     "<body>" +
		        "<table border=\"1\">" +
		           "<tr><th>id</th><th>name</th><th>key</th><th>timestamp</th></tr>" +
		           devices +
		        "</table>" +
		     "</body>" +
		"</html>");
});

app.get('/web/measurement', async function (req, res) {
    var allMeasurements = await getMeasurements()
    var measurements = allMeasurements.map(function(measurement) {
		console.log(measurement);
		return '<tr><td><a href=/web/measurement/'+ measurement._id +'>' + measurement._id + "</a>" + 
			       "</td><td>" + measurement.t + "</td><td>" + measurement.id + "</td><td>" + measurement.h+"</td><td>"+measurement.ts+"</td></tr>";
	   }
	);
	res.send("<html>"+
		     "<head><title>Sensores</title></head>" +
		     "<body>" +
		        "<table border=\"1\">" +
		           "<tr><th>_id</th><th>t</th><th>id</th><th>h</th><th>ts</th></tr>" +
		           measurements.join('') +
		        "</table>" +
		     "</body>" +
		"</html>");
});

app.get('/web/measurement/:id', async function (req,res) {
    var template = "<html>"+
                     "<head><title>Measuremt ID #{{_id}}</title></head>" +
                     "<body>" +
		        "<h1>{{ _id }}</h1>"+
		        "t  : {{ t }}<br/>" +
		        "h : {{ h }}<br/>" +
		        "ts  : {{ts}}" +
                     "</body>" +
                "</html>";


    var measurement = await getMeasurementById(req.params.id)            
   
    console.log(measurement);
    res.send(render(template,{_id:measurement._id, t: measurement.t, h: measurement.h, ts: measurement.ts }));
});	

app.get('/web/device/:id', function (req,res) {
    var template = "<html>"+
                     "<head><title>Sensor {{name}}</title></head>" +
                     "<body>" +
		        "<h1>{{ name }}</h1>"+
		        "id  : {{ id }}<br/>" +
		        "Key : {{ key }}<br/>" +
		        "ts  : {{timestamp}}" +
                     "</body>" +
                "</html>";


    var device = db.public.many("SELECT * FROM devices WHERE device_id = '"+req.params.id+"'");
    console.log(device);
    res.send(render(template,{id:device[0].device_id, key: device[0].key, name:device[0].name, timestamp:device[0].timestamp}));
});	


app.get('/term/device/:id', function (req, res) {
    var red = "\33[31m";
    var green = "\33[32m";
    var blue = "\33[33m";
    var reset = "\33[0m";
    var template = "Device name " + red   + "   {{name}}" + reset + "\n" +
		   "       id   " + green + "       {{ id }} " + reset +"\n" +
	           "       key  " + blue  + "  {{ key }}" + reset +"\n";
    var device = db.public.many("SELECT * FROM devices WHERE device_id = '"+req.params.id+"'");
    console.log(device);
    res.send(render(template,{id:device[0].device_id, key: device[0].key, name:device[0].name}));
});

app.get('/measurement', async (req,res) => {
    res.send(await getMeasurements());
});

app.get('/device', function(req,res) {
    res.send( db.public.many("SELECT * FROM devices") );
});

startDatabase().then(async() => {

    const addAdminEndpoint = require("./admin.js");
    addAdminEndpoint(app, render);

    await insertMeasurement({id:'00', t:'18', h:'78', ts: 'a'});
    await insertMeasurement({id:'00', t:'19', h:'77', ts: 'b'});
    await insertMeasurement({id:'00', t:'17', h:'77', ts: 'c'});
    await insertMeasurement({id:'01', t:'17', h:'77', ts: 'd'});
    console.log("mongo measurement database Up");

   // db.public.none("SET timezone = 'America/Argentina/Buenos_Aires'");
   //db.public.none("CREATE TABLE devices (device_id VARCHAR, name VARCHAR, key VARCHAR, timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
    db.public.none("CREATE TABLE devices (device_id VARCHAR, name VARCHAR, key VARCHAR, timestamp VARCHAR)");
    db.public.none("INSERT INTO devices VALUES ('00', 'Fake Device 00', '123456', 'timestamp_dev1')");
    db.public.none("INSERT INTO devices VALUES ('01', 'Fake Device 01', '234567', 'timestamp_dev2')");
    
    db.public.none("CREATE TABLE users (user_id VARCHAR, name VARCHAR, key VARCHAR, timestamp VARCHAR)");
    db.public.none("INSERT INTO users VALUES ('1','Ana','admin123', 'timestamp_user1')");
    db.public.none("INSERT INTO users VALUES ('2','Beto','user123', 'timestamp_user2')");
    
    console.log("sql device database up");

    app.listen(PORT, () => {
        console.log(`Listening at ${PORT}`);
    });
});
