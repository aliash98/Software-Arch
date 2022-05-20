require('dotenv').config()
var express = require('express')
var cors = require('cors')
var app = express()
const jwt = require("jsonwebtoken");

app.use(express.json())
app.use(cors())
app.use(express.urlencoded())


// parse server and dashboard
var ParseServer = require('parse-server').ParseServer;
var api = new ParseServer({
    databaseURI: 'mongodb://localhost:27017/devvv', // Connection string for your MongoDB database
    cloud: './cloud/main.js', // Path to your Cloud Code
    appId: 'myAppId',
    masterKey: 'myMasterKey', // Keep this key secret!
    fileKey: 'optionalFileKey',
    serverURL: 'http://localhost:1337/parse' // Don't forget to change to https if needed
});

// Serve the Parse API on the /parse URL prefix
app.use('/parse', api);

app.listen(1337, function() {
  console.log('parse-server-example running on port 1337.');
});

var ParseDashboard = require('parse-dashboard');
var dashboard = new ParseDashboard({
    "apps": [
      {
        "serverURL": "http://localhost:1337/parse",
        "appId": "myAppId",
        "masterKey": "myMasterKey",
        "appName": "MyApp"
      }
    ]
});
app.use('/dashboard', dashboard);
//-------------------------------------------------------------------------

