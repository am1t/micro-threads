if(process.env.NODE_ENV === 'production'){
    module.exports = {mongoURI: "mongodb://"
        + process.env.DB_USER + ":" + process.env.DB_PASSWORD + "@"
        + process.env.DB_IP + ":" + process.env.DB_PORT + "/"
        + process.env.DB_SCHEMA}
} else {
    module.exports = {mongoURI: "mongodb://localhost/microthread-dev"}
}