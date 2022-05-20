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
// --------- SignUp ------------ 

app.post('/api/signup', (req, res) => {
  var p1 = signUp(req.body.email, req.body.password);
  p1.then(value => {
      res.status(201).send({"message": "user has been created."}); // Success!
    }, reason => {
      let header_status = 400;
      if (reason.code==202) {
          header_status = 409;
      } else if (reason.code == 125) {
          header_status == 400;
      }
      res.status(header_status).send(reason); // Error!
  });
})


async function signUp(mail, userpass) {
  if(userpass.length < 5) {
      let messageErr = {code:125 ,message:"filed `password`.length should be > 5"};
      return Promise.reject(messageErr);
  }
  Parse.User.enableUnsafeCurrentUser()
  const user = new Parse.User();
  user.set("username", mail);
  user.set("email", mail);
  user.set("password", userpass); 
  try {
      await user.signUp();
      return "Hooray! Let them use the app now.";
  } catch (error) {
      let messageErr = {code:error.code ,message:error.message};
      return Promise.reject(messageErr);
  }

}


// ----------- SignIn -------------

app.post('/api/signin', (req,res) =>{
  var p1 = signIn(req.body.email, req.body.password);
  p1.then(value => {
      const username = req.body.email;
      const user = { name : username };
      const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET);
      console.log(accessToken);
      res.json({ accessToken : accessToken });
    }, reason => {
        console.log(reason);
      let header_status = 400;
      if (reason.code==201) {
          header_status = 400;
      } else if (reason.code == 101) {
          header_status == 401;
      }
      res.status(header_status).send(reason); 
  });

})

async function signIn(username, userpass) {
  if(false) { // todo username is not email
      let messageErr = {code:201 ,message:"filed `email` is not valid"};
      return Promise.reject(messageErr);
  } else if (username === undefined || userpass === undefined) { //todo request length
      let messageErr = {code:201 ,message:"Request Length should be 2"};
      return Promise.reject(messageErr);
  }
  Parse.User.enableUnsafeCurrentUser()
  try {
      const user = await Parse.User.logIn(username, userpass);
      return user.getEmail();
  } catch (error) {
      let messageErr = {code:error.code ,message:error.message};
      return Promise.reject(messageErr);
  }
  
}

// ---------- Making a Ride ---------------

app.post('/api/makeride', authenticateToken, (req, res)=>{
    let bikeID = req.body.bikeID;
    console.log(bikeID)
    if(bikeID === undefined || bikeID == '') {
        res.status(400).send({"message": "Request is not correct!"});
        return;
    }
    createRide(bikeID, req.user).then(value => {res.status(201).send({'id':value});}, reason => {
        res.status(400).send({"message": reason.message});
    })
})


async function createRide(bikeID, user) {
    const User = Parse.Object.extend("User");
    const query2 = new Parse.Query(User);
    query2.equalTo("username", user.name);
    const myusers = await query2.find();
    const myuser = myusers[0];

    const Bike = Parse.Object.extend("Bike");
    const query = new Parse.Query(Bike);
    query.equalTo("objectId", bikeID);
    const bikes = await query.find();
    const bike = bikes[0];

    console.log(myuser);
    console.log(bike);

    // check the distance of the bike and the user

    if (bike.get('Available') ==  false) {
        throw new Error("premission denied");
    }
    const Ride = Parse.Object.extend("Ride");
    const ride = new Ride();
    ride.set('BikeInUse', bike);
    ride.set('UserRiding', myuser);
    await ride.save()

    // set the bike availablity false
    bike.set('Available', false)
    await bike.save()
}

// ---------- Finishing a Ride ---------------

app.post('/api/finishride', authenticateToken, (req, res)=>{
    let rideID = req.body.rideID;
    console.log(rideID)
    if(rideID === undefined || rideID == '') {
        res.status(400).send({"message": "Request is not correct!"});
        return;
    }
    finishRide(rideID).then(value => {res.status(201).send({'id':value});}, reason => {
        res.status(400).send({"message": reason.message});
    })
})


async function finishRide(rideID) {
    const myRide = Parse.Object.extend("Ride");
    const query = new Parse.Query(myRide);
    query.equalTo("objectId", rideID);
    const rides = await query.find();
    const ride = rides[0];

    console.log(ride);

    // check the distance of the bike and the user

    if (ride.get('IsFinished') ==  true) {
        throw new Error("premission denied");
    }
    ride.set('IsFinished', true);
    await ride.save()

    mybike = ride.get('BikeInUse')

    const Bike = Parse.Object.extend("Bike");
    const query2 = new Parse.Query(Bike);
    query2.equalTo("objectId", mybike.get('objectID'));
    const bikes = await query2.find();
    const bike = bikes[0];
    
    bike.set('Available', true)
    await bike.save()
}



function authenticateToken(req, res, next){
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null)
      return res.sendStatus(401);
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) =>{
      if (err)
          return res.sendStatus(403);
      req.user = user;
      console.log("authenticated successfuly")
      next(); 
  })

}

