const express = require('express');
const carbone = require('carbone');
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
var convertapi = require('convertapi')('xAhHvC71xhmbCZXR');
const HummusRecipe = require('hummus-recipe');

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
    const file_array = []
    const directory = "templates";
    const dir = "templates/output";
    await fs.readdir(directory, (err, files) => {
        for (const file of files) {
            if (file != '11.PNG') {
                file_array.push({
                    file_name: file
                })
            }
        }
        console.log(file_array)
        file_array.forEach(x => {
            fs.unlink(`./templates/${x.file_name}`, (resp) => {
                console.log('file deleted')
            })
        })

    })
    fs.readdir(dir, (err, outputfiles) => {
        if (err) throw err;
        for (const outputfile of outputfiles) {
            fs.unlink(path.join(dir, outputfile), err => {
                if (err) throw err;
            });
        }
    })
    return res.json({
        message: "Going to home screen"
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
        await convertapi.convert('pdf', { File: `./templates/${file.originalname}` },)
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
            outputFileName: `https://${req.headers.host}/${output}.pdf`,
            templateId: templateId.id,
            fileName: templateId.filename
        })
    } catch (err) {
        console.log(err);
    }
});
app.post("/generateDocumentCanvas", async (req, res, next) => {
    var payload = {
        ...req.body,
    };
    let options = {};
    if (!payload.options) {
        options = { convertTo: "pdf" }
    }
    else if (typeof (payload.options.convertTo) == 'string') { options = { convertTo: payload.options.convertTo } }
    else if (typeof (payload.options.convertTo) == 'object') {
        options = {
            convertTo: {
                formatName: 'pdf',
                formatOptions: {
                    EncryptFile: true,
                    DocumentOpenPassword:payload.options.convertTo.formatOptions.DocumentOpenPassword,
                    Watermark:payload.options.convertTo.formatOptions.Watermark
                }
            }
        }
    }
    else { options = { convertTo: "pdf" } }
    const fileData = fs.readFileSync("file.json").toString();
    const dataList = JSON.parse(fileData);
    const fileData_array = [...dataList]
    const lastIdcall = fileData_array.pop();
    const templateId = lastIdcall.id;
    await dataList.forEach((list) => {
        //  console.log(list)
        if (list.id === templateId) {
            const lastIndex = list.filename.lastIndexOf(".");
            const Stringlength = list.filename.length;
            const output = list.filename.substr(0, lastIndex) + list.filename.substr(Stringlength);
            console.log(output);
            carbone.render(
                `./templates/${list.filename}`,
                payload.data,
                options,
                function (err, result) {
                    console.log("result")
                    if (err) {
                        console.log(err);
                    }
                    fs.writeFileSync(`templates/output/${list.filename}`, result)
                    const randomNumber = Math.random();
                    fs.writeFileSync(
                        `templates/output/${output}${randomNumber}.pdf`,
                        result
                    );
                    //starting of the watermark and pdf protected
                    if (typeof (options.convertTo) == 'object') {
                        const src = `./templates/output/${output}${randomNumber}.pdf`
                        const outputfilename = `./templates/download/${output}${randomNumber}.pdf`
                        const pdfDoc = new HummusRecipe(src,outputfilename);
                        pdfDoc
                            .encrypt({
                                userPassword: options.convertTo.formatOptions.DocumentOpenPassword,
                                // ownerPassword: '123',
                                userProtectionFlag: 4
                            })
                        const pages = pdfDoc.metadata.pages;
                        for (let i = 1; i <= pages; i++) {
                            pdfDoc
                                .editPage(i)
                                .text(options.convertTo.formatOptions.Watermark, 'center', 'center', {
                                    bold: true,
                                    size: 60,
                                    color: '#0000FF',
                                    align: 'center center',
                                    opacity: 0.1
                                })
                                .endPage()
                        };
                        pdfDoc.endPDF();
                        // return console.log(options.convertTo.formatOptions.DocumentOpenPassword)
                    }
                    //end of the watermark and pdf protecter
                    return res.json({
                        message: "your document is ready to download",
                        fileName: `https://${req.headers.host}/output/${output}${randomNumber}.pdf`,
                        originalTemplate: `https://${req.headers.host}/output/${list.filename}`,
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

app.get('/download', (req, res) => {
    let usersjson = fs.readFileSync("file.json", "utf8");
    let users = JSON.parse(usersjson || "[]");
    const fileData_array = [...users]
    const lastIdcall = fileData_array.pop();
    users.forEach(template => {
        if (template.id == lastIdcall.id) {
            let originalFileName = `${template.filename}`
            return res.json({
                downloadFile: `https://${req.headers.host}/${originalFileName}`
            })
        }
    })

})

app.listen(process.env.PORT, () => {
    console.log(`app listening on port ${process.env.PORT}`)
})



