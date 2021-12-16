require("dotenv").config();
const express = require("express");
const app = express();
const path = require("path");
const hbs = require("hbs");
const bcrypt = require("bcryptjs");
const cookieParser = require("cookie-parser");
// let pdf = require("html-pdf");
const Json2csvParser = require("json2csv").Parser;
const fs = require("fs");
const expresslayout = require("express-ejs-layouts");
// const multer = require("multer");
const auth = require("./middleware/auth");
const localstorage = require("local-storage");
// const LocalStorage = require('node-localstorage').LocalStorage,
// localStorage = new LocalStorage('./register');

// const upload = multer({ dest: "uploads/"})
require("./db/conn");
const Register = require("./models/registers");
const Login = require("./models/login");

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
app.engine("html", require("ejs").renderFile);
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

function pop(email) {
  return Register.findOne({ email: email })
    .populate("posts")
    .exec((err, posts) => {
      console.log("Populated User " + posts);
    });
}

app.post("/login", async (req, res) => {
  try {
    const email = req.body.email;
    const password = req.body.password;
    console.log(`${email} and password is ${password}`);
    const useremail = await Register.findOne({ email: email });
    const isMatch = bcrypt.compare(password, useremail.password);
    const date = Date();
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
      const loginEmployee = new Login({
        email: req.body.email,
        password: password,
        date: date,
      });

      await loginEmployee.save();
    } else {
      res.send("invalid login details");
    }
  } catch (e) {
    res.status(400).send("invalid login details");
  }
});

app.get("/displayall", async (req, res) => {
  Register.find({}, function (err, result) {
    if (err) {
      console.log(err);
    } else {
      // console.log(result);
      // console.log(result);
      res.render("display", { details: result });
    }
  }).sort({ firstname: 1 });
});

app.get("/display", paginatedResults(), (req, res) => {
  // res.json(res.paginatedResults);
  // console.log(res.paginatedResults);
  Register.count({}, function (err, count) {
    // console.log(count)
    let y = 3;
    let x = Math.ceil(count / y);
    res.render("display", { details: res.paginatedResults, x });
  });

  // res.paginatedResults;
});
function paginatedResults() {
  return async (req, res, next) => {
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);
    const skipIndex = (page - 1) * limit;
    try {
      res.paginatedResults = await Register.find()
        .sort({ _id: 1 })
        .limit(limit)
        .skip(skipIndex)
        .exec();

      next();
    } catch (e) {
      res.status(500).json({ message: "Error Occured" });
    }
  };
}

const pdf = require("pdf-creator-node");

app.get("/generateReport", (req, res) => {
  Register.find({}, function (err, data) {
    const html = fs.readFileSync("./templates/views/genpdf.html", "utf-8");
    const filename = Math.random(7) + "_doc" + ".pdf";

    let array = [];
    data.forEach((d) => {
      const prod = {
        firstname: d.firstname,
        email: d.email,
        gender: d.gender,
        phone: d.phone,
        age: d.age,
      };
      array.push(prod);
    });
    // console.log(array)

    const users = array;
    //  console.log(users);
    const document = {
      html: html,
      data: {
        users: users,
      },
      path: "./docs/" + filename,
    };

    let options = {
      format: "A3",
      orientation: "portrait",
      border: "10mm",
    };

    pdf
      .create(document, options)
      .then((res) => {
        console.log(res);
      })
      .catch((error) => {
        console.log(error);
      });
    const filepath = "http://localhost:3000/docs/" + filename;
    res.render("download", { details: data });
  }).sort({ age: 1 });
});

app.get("/invoice", (req, res) => {
  Register.find({}, function (err, data) {
    res.render("download", { details: data });
  });
  // res.render("invoice");
});

app.get("/generate/:id", async (req, res) => {
  const _id = req.params.id;

  Register.findById(_id, async function (err, data) {
    if (err) {
      console.log(err);
    } else {
      const html = fs.readFileSync("./templates/views/invoice.html", "utf-8");
      const filename = Math.random(10) + "_doc" + ".pdf";

      let array = [];
      const prod = {
        firstname: data.firstname,
        lastname: data.lastname,
        email: data.email,
        gender: data.gender,
        phone: data.phone,
        age: data.age,
      };
      array.push(prod);
      console.log(array);

      const users = array;
      console.log(users);
      const document = {
        html: html,
        data: {
          users: users,
        },
        path: "./docs/" + filename,
      };

      let options = {
        formate: "A3",
        orientation: "portrait",
        border: "2mm",
        header: {
          height: "15mm",
          contents:
            '<h4 style=" color: red;font-size:20;font-weight:800;text-align:center;">CUSTOMER INVOICE</h4>',
        },
      };
      await pdf
        .create(document, options)
        .then((res) => {
          console.log(res);
        })
        .catch((error) => {
          console.log(error);
        });
      // const filepath = "http://localhost:3000/docs/" + filename;
      // console.log(filename)
      // console.log(filepath)
      const filepath =
        "C:/Users/Vaibhav Personal/Desktop/CRUD/mernbackend/docs/" + filename;
      res.download(filepath, filename);
      console.log(filepath);

      // fs.unlink(filepath, (err) => {
      //   if (err) {
      //     console.error(err);
      //     return;
      //   }
      // });
    }
  });
});

// Register.find({}, function (err, result) {
//   if (err) {
//     console.log(err);
//   } else {
//     res.render("display", { details: result });
//   }
//  });
// });

// app.get("/generateReport", (req, res) => {
//   Register.find({}, function (err, data) {
//     let options = {
//       height: "11.25in",
//       width: "8.5in",
//       header: {
//         height: "20mm",
//       },
//       footer: {
//         height: "20mm",
//       },
//     };
//     var data = fs.readFileSync("./vaibhav.csv", 'utf8');
//     // console.log(data);
//     pdf.create(data, options).toFile("report.pdf", function (err, data) {
//       if (err) {
//         res.send(err);
//       } else {
//         console.log("File created successfully");
//       }
//     });
//   });
//   Register.find({}, function (err, result) {
//     if (err) {
//       console.log(err);
//     } else {
//       res.render("display", { details: result });
//     }
//   });
// });

app.get("/edit/:id", async (req, res) => {
  const _id = req.params.id;

  Register.findById(_id, function (err, result) {
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
    if (err) {
      console.log(err);
    } else {
      res.redirect("/display");
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

// app.get("/download", async (req, res) => {
//   try {
//     await Register.find({})
//       .lean()
//       .exec((err, data) => {
//         if (err) throw err;
//         const csvFields = ['firstname', 'password'];
//         console.log(csvFields);

//         const json2csvParser = new Json2csvParser({
//           csvFields,
//         });
//         const csvData = json2csvParser.parse(data);
//         // console.log(data);
//         fs.writeFile("vaibhav.csv", csvData, function (error) {
//           if (error) throw error;
//           console.log("Write to vaibhav.csv successful!");
//         });
//         Register.find({}, function (err, result) {
//             if (err) {
//               console.log(err);
//             } else {
//               res.render("display", { details: result });
//             }
//           });
//       });
//   } catch (e) {
//     console.log(e);
//   }
// });

const createCsvWriter = require("csv-writer").createObjectCsvWriter;
app.get("/download", async (req, res) => {
  try {
    await Register.find({}).exec((err, data) => {
      if (err) throw err;

      // console.log(data);
      const csvWriter = createCsvWriter({
        path: "csvWriter.csv",
        header: [
          { id: "firstname", title: "firstname" },
          { id: "phone", title: "phone" },
        ],
      });

      csvWriter
        .writeRecords(data)
        .then(() => console.log("Write to csv successfully!"));
    });
    Register.find({}, function (err, result) {
      if (err) {
        console.log(err);
      } else {
        res.render("display", { details: result });
      }
    });
  } catch (e) {
    console.log(e);
  }
});

app.post("/search", async (req, res) => {
  try {
    const search = req.body.search;
    // if( Register.findOne({ firstname: search }) != null){
    const username = await Register.findOne({ firstname: search });
    if(username === null){
      Register.find({}, function (err, result) {
        res.render("display", { details: result });
      });
    }else{
      Register.find({ firstname: search }, function (err, result) {
        if (err) {
          console.log(err);
        } else if (search == "") {
          Register.find({}, function (err, result) {
            res.render("display", { details: result });
          });
        }else if (username.firstname === null) {
          Register.find({}, function (err, result) {
            res.render("display", { details: result });
          });
        }
        else {
          // console.log(username.firstname);
          res.render("display", { details: result });
        }
      });
    }

}
catch (e) {
    res.status(400);
  }
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
