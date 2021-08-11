const express = require('express');
const carbone = require('carbone');
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
var convertapi = require('convertapi')('xAhHvC71xhmbCZXR');
require('dotenv').config();
const app = express();
app.use(cors());
// parse application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));
// parse application/json
app.use(express.json());
app.use(express.static(path.join(__dirname, "templates")));
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept"
    );
    res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, PATCH, DELETE, OPTIONS"
    );
    next();
});
//Multer storage
//multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        var dir = "./templates";
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    },
});
const upload = multer({ storage: storage });

const addFileMetaData = (fileName, outputFile) => {
    let usersjson = fs.readFileSync("file.json", "utf8");
    let users = JSON.parse(usersjson || "[]");

    const lastItem = [...users].pop();

    if (lastItem == undefined) {
        users.push({
            id: 1,
            filename: fileName,
            outputFileName: outputFile,
            createdAt: Date.now(),
        });
        usersjson = JSON.stringify(users);
        fs.writeFileSync("file.json", usersjson, "utf-8");
    } else {
        users.push({
            id: lastItem.id + 1,
            filename: fileName,
            outputFileName: outputFile,
            createdAt: Date.now(),
        });

        usersjson = JSON.stringify(users);
        fs.writeFileSync("file.json", usersjson, "utf-8");
    }
    const lastIdcall = users.pop();
    return lastIdcall;
};
app.get("/", async (req, res) => {
    const file_array =[]
    const directory = "templates";
    await fs.readdir(directory,(err,files)=>{
      for (const file of files) {
        if(file!='11.PNG'){
          file_array.push({
            file_name:file
          })
        } 
      }
      console.log(file_array)
      file_array.forEach(x=>{
        fs.unlink(`./templates/${x.file_name}`,(resp)=>{
          console.log('file deleted')
        })
      })
    })
    return res.json({
        message:"Going to home screen"
    })
  });
  
app.post("/addtemplate", upload.single("template"), async (req, res, next) => {
    try {
        const file = req.file;
        if (!file) {
            return res.json({
                error: "Use the form data",
            });
        }
        const fileName = file.originalname
        const lastIndex = fileName.lastIndexOf(".");
        const Stringlength = fileName.length;
        const output = fileName.substr(0, lastIndex) + fileName.substr(Stringlength);
        console.log(output);
        await convertapi.convert('pdf', { File: `./templates/${file.originalname}` })
            .then(async (result) => {
                // get converted file url
                console.log("Converted file url: " + result.file.url);
                await result.file.save(`./templates/${output}.pdf`);//save the file

            })
        console.log("outside");
        let outputFileName = `${output}.pdf`
        const templateId = addFileMetaData(file.originalname, outputFileName);
        return res.json({
            message: "file uploading successfully",
            outputFileName: `${req.headers.host}/${output}.pdf`,
            templateId: templateId.id,
            fileName: templateId.filename
        })
    } catch (err) {
        console.log(err);
    }
});
app.post("/generateDocumentCanvas", async(req, res, next) => {
    var data = {
        ...req.body,
    };
    console.log("json string",JSON.stringify(data))
    console.log("data",data)
    console.log("parsing data",JSON.parse(data))

     var payload = JSON.parse(data);
     console.log("outside")
    // const templateId = payload.config.templateId;
    const fileData = fs.readFileSync("file.json").toString();
    const dataList = JSON.parse(fileData);
    const fileData_array =[...dataList]
    const lastIdcall = fileData_array.pop();

    const templateId = lastIdcall.id
 
  
    // console.log(fileData_array)

     await dataList.forEach((list) => {
        //  console.log(list)
        if (list.id === templateId) {
            const lastIndex = list.filename.lastIndexOf(".");
            const Stringlength = list.filename.length;
            const output = list.filename.substr(0, lastIndex) + list.filename.substr(Stringlength);
            // console.log(output);
            carbone.render(
                `./templates/${list.filename}`,
                payload.data,
                payload.options,
                function (err, result) {
                    console.log("result")
                    
                    if (err) {
                        console.log(err);
                    }
                    fs.writeFileSync(
                        `templates/${output}.${payload.options.convertTo}`,
                        result
                    );
                    return res.json({
                        message: "your document is ready to download",
                        fileName: `${req.headers.host}/${output}.${payload.options.convertTo}`,
                        templateId: list.id,
                        data: payload
                        // data: JSON.stringify(payload,null,'\t')
                    })
                }
            );
        }
        return
    });
});

app.listen(process.env.PORT, () => {
    console.log(`app listening on port ${process.env.PORT}`)
})



