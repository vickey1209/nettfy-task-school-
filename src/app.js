require("dotenv").config();
const express = require("express");
const app = express();
const path = require("path");
const hbs = require("hbs");
const bcrypt = require("bcryptjs");
const cookieParser = require("cookie-parser");
// const multer = require("multer");
const auth = require("./middleware/auth");
const localstorage = require("local-storage");
// const LocalStorage = require('node-localstorage').LocalStorage,
// localStorage = new LocalStorage('./register');

// const upload = multer({ dest: "uploads/"})
require("./db/conn");
const Register = require("./models/registers");

const port = process.env.PORT || 3000;
const static_path = path.join(__dirname, "../public");
const template_path = path.join(__dirname, "../templates/views");
const partials_path = path.join(__dirname, "../templates/partials");

//app.use(express.static('templates/views'))
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true, useNewUrlParser: true }));
app.use(express.static(static_path));
app.set("view engine", "ejs");
app.set("views", template_path);
hbs.registerPartials(partials_path);

//console.log(process.env.SECRET_KEY);

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/secret", auth, (req, res) => {
  // console.log(`these are cookies : ${req.cookies.jwt}`);
  res.render("secret");
});

app.get("/logout", auth, async (req, res) => {
  try {
    console.log("user logout");

    // req.user.tokens = req.user.tokens.filter((currElement) => {
    //     return currElement.token !== req.token;
    // })

    req.user.tokens = [];

    res.clearCookie("jwt");

    console.log(req.user);
    await req.user.save();
    res.render("login");
  } catch (error) {
    res.status(500).send(error);
  }
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/register", async (req, res) => {
  try {
    // const file = req.body.file;
    const password = req.body.password;
    const cpassword = req.body.confirmpassword;
    // upload.single('file');

    if (password === cpassword) {
      const registerEmployee = new Register({
        firstname: req.body.firstname,
        lastname: req.body.lastname,
        email: req.body.email,
        gender: req.body.gender,
        phone: req.body.phone,
        age: req.body.age,
        file: req.body.file,
        password: password,
        confirmpassword: cpassword,
      });
      // console.log('the sucess part ' + registerEmployee);
      const token = await registerEmployee.generateAuthToken();
      // console.log("token part : " +token);
      //res.cookie("jwt", token, options);
      // console.log(token);
      res.cookie("jwt", token, {
        expires: new Date(Date.now() + 3600 * 100),
        httpOnly: true,
      });

      const registered = await registerEmployee.save();
      // console.log("the page part : " +registered);

      res.status(201).render("index");
    } else {
      res.send("password not matching");
    }
  } catch (e) {
    res.status(400).send(e);
  }
});

app.post("/login", async (req, res) => {
  try {
    const email = req.body.email;
    const password = req.body.password;
    // console.log(`${email} and password is ${password}`);
    const useremail = await Register.findOne({ email: email });
    const isMatch = bcrypt.compare(password, useremail.password);

    const token = await useremail.generateAuthToken();
    //console.log("token part : " +token);
    //res.send(useremail.password);
    //console.log(useremail);
    res.cookie("jwt", token, {
      expires: new Date(Date.now() + 600000),
      httpOnly: true,
    });

    if (isMatch) {
      res.status(201).render("index");
      console.log("login successful");
    } else {
      res.send("invalid login details");
    }
  } catch (e) {
    res.status(400).send("invalid login details");
  }
});

app.get("/display", (req, res) => {
  // const data=Register.find();
  //   console.log(data);
  Register.find({}, function (err, result) {
    if (err) {
      console.log(err);
    } else {
      // console.log(result);
      res.render("display", { details: result });
      // console.log(details.email);
    }
  });
});

app.get("/edit/:id", async (req, res) => {
  const _id = req.params.id;

  Register.findById(_id,  function (err, result) {
    if (err) {
      console.log(err);
    } else {
      res.render("edit", { details: result });
      // console.log(result);
      // res.send(result);
    }
  });
});

app.post("/edit/:id", async (req, res) => {
  try {
    const _id = req.params.id;
    const update = req.body;
    const result = await Register.findByIdAndUpdate(_id, update);
    // res.render("display");
    Register.find({}, function (err, result) {
      if (err) {
        console.log(err);
      } else {
        // console.log(result);
        res.render("display", { details: result });
        // console.log(details.email);
      }
    });
    // Register.findByIdAndUpdate(_id, Register, function (err) {
    //   if (err) {
    //     console.log(err);
    //   } else {
    //     res.render("index");
    //     // console.log(result);
    //     // res.send(result);
    //   }
    // });
  } catch (e) {
    console.log(e);
  }
});

app.get("/delete/:id", async (req, res) => {
  const _id = req.params.id;
  Register.findByIdAndDelete(_id, function (err, docs) {
    if (err){
      console.log(err)
    }
    else{
      res.redirect('/display');
    }
  });
  // Register.findByIdAndDelete(_id,  function (err, result) {
  //   if (err) {
  //     console.log(err);
  //   } else {
  //     res.render("index");
  //     // console.log(result);
  //     // res.send(result);
  //   }
  // });
});

// const securePassword = async(password) =>{
//     const passwordHash = await bcrypt.hash(password, 10);
//     console.log(passwordHash);

//     const passwordMatch = await bcrypt.compare(password, passwordHash);
//     console.log(passwordMatch);
// }
// securePassword("vaibhav@6");

const jwt = require("jsonwebtoken");

const createToken = async () => {
  const token = await jwt.sign(
    { _id: "619627530dc2e55b63d5d34d" },
    "mynameisvaibhavsingharjunsinghrajput",
    {
      expiresIn: "5 days",
    }
  );
  // console.log(token);

  const userVer = await jwt.verify(
    token,
    "mynameisvaibhavsingharjunsinghrajput"
  );
  console.log(userVer);
};
createToken();

app.listen(port, () => {
  console.log(`server is running at port ${port}`);
});
