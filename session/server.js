const express = require("express");
const session = require("express-session");
const MongoDBSession = require("connect-mongodb-session")(session);
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const app = express();

const UserModel = require("./models/user");

const mongoURI = "mongodb://localhost:27017/sessions"
mongoose.connect(mongoURI)
.then(() =>{
    console.log("connection success")
}).catch((e) =>{
    console.log("no connction")
})

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true}));

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

const isAuth = (req,res,next) =>{
    if(req.session.isAuth){
    next();
    }else{
    res.redirect('/login')
    }
}
app.get("/", (req, res) =>{
    // req.session.isAuth = true;
    // console.log(req.session);
    // res.send("hello session");
    res.render("landing")
});

app.get("/login", (req, res) =>{
    res.render("login")
});

app.post("/login", async(req, res) =>{
      const { email, password} = req.body;
      const user = await UserModel.findOne({email});

      if(!user) {
          return res.redirect('/login')
      }
      const isMatch = await bcrypt.compare(password, user.password)

      if(!isMatch){
          return res.redirect("/login");
      }
      req.session.isAuth = true;
      res.redirect("/dashboard");
});


app.get("/register", (req, res) =>{
    res.render("register")
});
app.post("/register", async(req, res) =>{
    const {username, email, password} = req.body;
    let user = await UserModel.findOne({email});

    if(user){
        return res.redirect("/register");
    }
    const hashedPwd = await bcrypt.hash(password, 10);
    user = new UserModel({
        username,
        email,
        password: hashedPwd
    });

    await user.save();
    res.redirect('/login');
});
app.get("/dashboard", isAuth, (req, res) =>{
    res.render("dashboard")
});

app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if(err) throw err;
        res.redirect("/");
    });
});

app.listen(5000, console.log("server running"));