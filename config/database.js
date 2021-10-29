module.exports = {mongoURI: "mongodb+srv://"
    + process.env.DB_USER + ":" + process.env.DB_PASSWORD + "@"
    + process.env.DB_URL + "/" + process.env.DB_SCHEMA}