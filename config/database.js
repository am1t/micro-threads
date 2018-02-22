if(process.env.NODE_ENV === 'production'){
    module.exports = {mongoURI: "mongodb://micro_am_user:D9w_VybC6@ds245518.mlab.com:45518/microthread-prod"}
} else {
    module.exports = {mongoURI: "mongodb://localhost/microthread-dev"}
}