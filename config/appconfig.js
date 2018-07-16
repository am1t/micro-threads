if(process.env.NODE_ENV === 'production'){
    module.exports = {seckey: process.env.SECKEY}
} else {
    module.exports = {seckey: "D9w_VybC6"}
}