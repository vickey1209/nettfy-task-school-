const mongoose = require("mongoose");

const loginSchema = new mongoose.Schema({
    regId:{
        type: mongoose.Schema.Types.ObjectId, ref:'Register',
    },
    emailid :{
        type:String,
        required:true
    },
    password :{
        type:String,
        required:true
    },
    date:{
        type:String
    }
})

const Login = new mongoose.model("Login", loginSchema);

module.exports = Login;