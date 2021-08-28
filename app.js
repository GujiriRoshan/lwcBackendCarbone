const express = require('express');
const carbone = require('carbone');
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const axios = require('axios');
const https = require('https');
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
const jsforceConnection = require('./jsforceConnection')
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

const addFileMetaData = (TemplateId, TemplateName) => {
    let usersjson = fs.readFileSync("file.json", "utf8");
    let users = JSON.parse(usersjson || "[]");
    const lastItem = [...users].pop();
    if (lastItem == undefined) {
        users.push({
            id: 1,
            TemplateId: TemplateId,
            TemplateName: TemplateName,
            createdAt: Date.now(),
        });
        usersjson = JSON.stringify(users);
        fs.writeFileSync("file.json", usersjson, "utf-8");
    } else {
        users.push({
            id: lastItem.id + 1,
            TemplateId: TemplateId,
            TemplateName: TemplateName,
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
    // fs.readdir(dir, (err, outputfiles) => {
    //     if (err) throw err;
    //     for (const outputfile of outputfiles) {
    //         fs.unlink(path.join(dir, outputfile), err => {
    //             if (err) throw err;
    //         });
    //     }
    // })
    return res.json({
        message: "Going to home screen"
    })
});

app.post("/addTemplate", upload.single("template"), async (req, res, next) => {
    try {
        const file = req.file;
        if (!file) {
            return res.json({
                error: "upload the file",
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
        // file details
        var fileOnServer = `./templates/${file.originalname}`
        var uploadFileName = `${file.originalname}`
        await fs.readFile(fileOnServer, function (err, fileData) {
            if (err) { console.log(err) }
            var base64data = new Buffer.from(fileData).toString('base64');
            jsforceConnection.sobject('ContentVersion').create({
                'Title': output,
                'PathOnClient': uploadFileName,
                'VersionData': base64data,
            },
                async (err, uploadedAttachment) => {
                    if (err) { return res.json({ error: err }) }
                    await addFileMetaData(uploadedAttachment.id, file.originalname,);
                    return res.json({
                        success: true,
                        originalFileName: `https://${req.headers.host}/${file.originalname}`,
                        outputFileName: `https://${req.headers.host}/${output}.pdf`,
                        templateId: uploadedAttachment.id
                    })
                }
            )
        })
        // Store to the salesforce
    } catch (err) {
        return next(err)
    }
});
app.post('/generateDocumentPreview', async (req, res, next) => {

    const payload = { ...req.body }
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
                    DocumentOpenPassword: payload.options.convertTo.formatOptions.DocumentOpenPassword,
                    Watermark: payload.options.convertTo.formatOptions.Watermark
                }
            }
        }
    }
    else { options = { convertTo: "pdf" } }
    const templateId = payload.templateId
    const result = await jsforceConnection.query("SELECT Id, ContentDocumentId, Title, VersionData,PathOnClient, FileType, VersionNumber, ContentBodyId, IsLatest, ContentUrl FROM ContentVersion where IsLatest = true and Id ='" + templateId + "'")
    //   console.log(result.totalSize)
    if (result.totalSize === 0) {
        return res.json({
            error: "Invalid Template id"
        })
    }
    const fileName = result.records[0].PathOnClient
    const fileData = await jsforceConnection.sobject('ContentVersion').record(templateId).blob('Body');
    const host = fileData.headers.host
    const path = result.records[0].VersionData
    const token = fileData.headers.Authorization
    const option = {
        hostname: host,
        port: 443,
        path: path,
        method: 'GET',
        headers: {
            'Content-Type': 'application/octet-stream',
            'Authorization': token
        }
    }
    var request = https.request(option, function (response) {
        var chunks = [];
        response.on("data", function (chunk) {
            chunks.push(chunk);
            console.log('chunk')
        });
        response.on("end", function (chunk) {
            var body = Buffer.concat(chunks);
            fs.writeFileSync(`templates/${fileName}`, body, 'binary');
            carbone.render(`./templates/${fileName}`, payload.data, options, async (err, resp) => {
                if (err) {
                    console.log(err);
                    return
                }
                var randomNumber = Math.floor(100000 + Math.random() * 900000);
                // const fileName = file.originalname
                const splitName =fileName.split('.')
                const extension =splitName[splitName.length-1]
                const lastIndex = fileName.lastIndexOf(".");
                const Stringlength = fileName.length;
                const output = fileName.substr(0, lastIndex) + fileName.substr(Stringlength);
                console.log(output);
                fs.writeFileSync(`templates/output/${output}_${randomNumber}.${extension}`, resp)
                fs.writeFileSync(
                    `templates/output/${output}_${randomNumber}.pdf`,
                    resp
                );
                return res.json({
                    success: true,
                    error: [],
                    fileName: `https://${req.headers.host}/output/${output}_${randomNumber}.pdf`,
                    originalFileName: `https://${req.headers.host}/output/${output}_${randomNumber}.${extension}`,
                })
                // const outputFileName = `${output}.${data.config.convertTo}`;
                // fs.writeFileSync(`./output/${outputFileName}`, resp);
                // fs.unlinkSync(`./template/${fileName}`);
            })
        });
        response.on("error", function (error) {
            return res.json({
                success: false,
                error: error
            })
        });
    });
    request.end();
})
app.get('/UrlData', async (req, res, next) => {
    var host = jsforceConnection.instanceUrl
    var token = jsforceConnection.accessToken
    var serverUrl = req.query.endPoint
    if (!serverUrl) {
        return res.json({
            error: "Please Enter the Rest endPoint"
        })
    }
    //  '/services/data/v51.0/sobjects/Account/0014x00000Do1PpAAJ'
    // payload={
    //     ...req.body
    // }
    await axios.get(`${host}${serverUrl}`, {
        method: "GET",
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    }) //reteriving the salesforce object data using axios
        .then(result => {
            delete result.data.attributes
           return res.json({
                data: result.data
            })
        })
        .catch(err => { return next(err) })

})
app.get('/getTemplateId', (req, res, next) => {
    try {
        var fetchTemplateId = fs.readFileSync('file.json', 'utf-8')
        var templateId_store = JSON.parse(fetchTemplateId || "[]");
        return res.json({
            templateId: templateId_store
        })
    }
    catch (err) {
      return next(err)
    }
})

app.post('/generateDocument', async (req, res, next) => {
    const templateId = req.body.templateId;
    const result = await jsforceConnection.query("SELECT Id, ContentDocumentId, Title, VersionData,PathOnClient, FileType, VersionNumber, ContentBodyId, IsLatest, ContentUrl FROM ContentVersion where IsLatest = true and Id ='" + templateId + "'")
    if (result.totalSize === 0) {
        return res.json({
            error: "Invalid Template id"
        })
    }
    const fileName = result.records[0].PathOnClient
    const title = result.records[0].Title
    const fileData = await jsforceConnection.sobject('ContentVersion').record(templateId).blob('Body');
    const host = fileData.headers.host
    const path = result.records[0].VersionData
    const token = fileData.headers.Authorization
    const option = {
        hostname: host,
        port: 443,
        path: path,
        method: 'GET',
        headers: {
            'Content-Type': 'application/octet-stream',
            'Authorization': token
        }
    }
    var request = https.request(option, function (response) {
        var chunks = [];

        response.on("data", function (chunk) {
            chunks.push(chunk);
            console.log('chunk')
        });
        response.on("end", async (chunk) => {
            var body = Buffer.concat(chunks);
            fs.writeFileSync(`templates/${fileName}`, body, 'binary');
            await convertapi.convert('pdf', { File: `./templates/${fileName}` },)
                .then(async (result) => {
                    var randomNumber = Math.floor(100000 + Math.random() * 900000);
                    // get converted file url
                    console.log("Converted file url: " + result.file.url);
                    await result.file.save(`./templates/${title}__${randomNumber}.pdf`);//save the file
                    return res.json({
                        success: true,
                        error: [],
                        fileName: `https://${req.headers.host}/${title}__${randomNumber}.pdf`,
                        originalFileName: `https://${req.headers.host}/${fileName}`
                    })
                })
        });
        response.on("error", function (error) {
            return res.json({
                success: false,
                error: error
            })
        });
    })
    request.end();
})
// Error Handling

app.use((error, req, res, next) => {
    const statusCode = error.statusCode || res.statusCode || 500;
    const errorMessage = error.message || error;
    if (statusCode === 500) console.log("app.js", error);
    else console.log("app.js user error", error);

    res.status(statusCode).json({ message: errorMessage });
}); //End of error handling middleware
// testing purpose
app.post("/generate", async (req, res, next) => {
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
                    DocumentOpenPassword: payload.options.convertTo.formatOptions.DocumentOpenPassword,
                    Watermark: payload.options.convertTo.formatOptions.Watermark
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
                    list.outputFileName = `${output}${randomNumber}.pdf`
                    fs.writeFileSync('file.json', JSON.stringify(dataList))

                    //starting of the watermark and pdf protected
                    if (typeof (options.convertTo) == 'object') {
                        const src = `./templates/output/${output}${randomNumber}.pdf`
                        const outputfilename = `./templates/download/${output}${randomNumber}.pdf`
                        const pdfDoc = new HummusRecipe(src, outputfilename);
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
                        list.outputFileName = `${output}${randomNumber}.pdf`
                        fs.writeFileSync('file.json', JSON.stringify(dataList))

                        // return console.log(options.convertTo.formatOptions.DocumentOpenPassword)
                    }
                    //end of the watermark and pdf protecter
                    return res.json({
                        success: true,
                        fileName: `https://${req.headers.host}/output/${output}${randomNumber}.pdf`,
                        originalTemplate: `https://${req.headers.host}/download/${output}${randomNumber}.pdf`,
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
            let originalFileName = `${template.outputFileName}`
            return res.json({
                downloadFile: `https://${req.headers.host}/download/${originalFileName}`
            })
        }
    })

})
// End of the testing purpose
app.listen(process.env.PORT, () => {
    console.log(`app listening on port ${process.env.PORT}`)
})



