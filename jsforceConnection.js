const jsForce = require('jsforce');

const {SF_LOGIN_URL,SF_USERNAME,SF_PASSWORD,SF_TOKEN} = process.env

const connection = new jsForce.Connection({
    loginUrl:SF_LOGIN_URL,
})

connection.login(SF_USERNAME,SF_PASSWORD+SF_TOKEN ,(err,result)=>{
    if(err){
        console.log(err)
    }
    else{
        console.log('connected')
        console.log(`User id ${result.id}`);
        console.log(`Organisation Id ${result.organizationId}`)
    }
})

module.exports = connection