// const HummusRecipe = require('hummus-recipe');
// const pdfDoc = new HummusRecipe('offer.pdf', 'output.pdf');

// pdfDoc
//     .encrypt({
//         userPassword: '123',
//         ownerPassword: '123',
//         userProtectionFlag: 4
//     })
//     .endPDF();



// const fs = require('fs');
// const path = require('path');
// const HummusRecipe = require('hummus-recipe');
// const htmlCodes = fs.readFileSync(path.join(__dirname, './offer.pdf'), 'utf8');
//         const src = path.join(__dirname, './offer.pdf')
//         const output = path.join(__dirname, `offerwater.pdf`);
//         const recipe = new HummusRecipe(src, output);

//         const pages = recipe.metadata.pages;
//         for (let i = 1; i <= pages; i++) {
//             recipe
//                 .editPage(i)
//                 .text(' ', 'center', 'center', {
//                     bold: true,
//                     size: 60,
//                     color: '#0000FF',
//                     align: 'center center',
//                     opacity: 0.1
//                 })
//                 .endPage()
//         };
//         recipe.endPDF();

// var convertapi = require('convertapi')('xAhHvC71xhmbCZXR');
// convertapi.convert('watermark', {
//     File: './offer.pdf',
//     Text: 'roshan and pooja'
// }, 'pdf').then(function(result) {
//     result.saveFiles('output.pdf');
// });
// convertapi.convert('encrypt', {
//     File: './offer.pdf',
//     UserPassword: '1234',
//     OwnerPassword: '1234'
// }, 'pdf').then(function(result) {
//     result.saveFiles('encp.pdf');
// });