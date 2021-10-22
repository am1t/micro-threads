if(process.env.NODE_ENV === 'production'){
    module.exports = {
        /*seckey: process.env.SECKEY,*/
        session_secret: process.env.SESSION_SECRET,
        redis_url: process.env.REDIS_URL
    }
} else {
    module.exports = {seckey: "D9w_VybC6", session_secret: "mtsecret"}
}