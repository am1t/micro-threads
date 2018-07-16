const localStrategy = require('passport-local').Strategy;
const mongoose = require('mongoose');
var CryptoJS = require("crypto-js");

//App config
const appconfig = require('../config/appconfig');

const User = mongoose.model('users');

module.exports = function(passport){
    passport.use(new localStrategy({usernameField: 'userid', passwordField: 'token'}, (userid, token, done) => {
        User.findOne({userid:userid})
        .then(user => {
            if(!user){
                console.log("User not found, inserting user details");
                const newUser = new User({
                    name: userid,
                    userid: userid,
                    token: CryptoJS.AES.encrypt(token, appconfig.seckey)
                });
                newUser.save()
                .then(user => {
                    return done(null, user);
                })
                .catch(err => {
                    console.log(err);
                    return done(null, false, {message: 'Failed to use Token'});
                });
            } else {
                return done(null, user);
            }
        })
    }));

    passport.serializeUser(function(user, done) {
     done(null, user.id);
    });
      
    passport.deserializeUser(function(id, done) {
        User.findById(id, function(err, user) {
            done(err, user);
        });
    });
}