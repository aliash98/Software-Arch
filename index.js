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