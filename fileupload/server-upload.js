const express = require("express");
const multer = require("multer");
const uuid = require("uuid").v5;

const storage = multer.diskStorage({
    destination: (req, file, cb)=>{
        cb(null, 'upload');
    },
    filename: (req, file, cb)=>{
        const { originalname } = file;
        cb(null, originalname);
    }
});
const upload = multer({storage});

const app = express();
app.use(express.static('public'));

app.post('/upload', upload.single('avatar'), (req, res) =>{
    return res.json({status: 'OK'});
})

app.listen(3001, () => console.log('app is running'));