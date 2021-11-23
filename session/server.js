const express = require("express");
const session = require("express-session");
const MongoDBSession = require("connect-mongodb-session")(session);
const mongoose = require("mongoose");
const app = express();

const mongoURI = "mongodb://localhost:27017/sessions"
mongoose.connect(mongoURI)
.then(() =>{
    console.log("connection success")
}).catch((e) =>{
    console.log("no connction")
})

const store = new MongoDBSession({
    uri: mongoURI,
    collection: "mySessions"
})

app.use(session({
    secret: 'key for asigning cookie',
    resave: false,
    saveUninitialized: false,
    store: store
}));

app.get("/", (req, res) =>{
    req.session.isAuth = true;
    console.log(req.session);
    res.send("hello session");
});

app.listen(5000, console.log("server running"));