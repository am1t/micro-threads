if(process.env.NODE_ENV === 'production'){
    module.exports = {mongoURI: "mongodb+srv://"
        + process.env.DB_USER + ":" + process.env.DB_PASSWORD + "@"
        + process.env.DB_URL + "/" + process.env.DB_SCHEMA}
} else {
    module.exports = {mongoURI: "mongodb://localhost:27017/microthread-dev"}
}