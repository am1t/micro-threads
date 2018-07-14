const localStrategy = require('passport-local').Strategy;
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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
                    token: token
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


/*module.exports = function(passport){
    passport.use(new localStrategy({usernameField: 'email'}, (email, password, done) => {
        User.findOne({email:email})
        .then(user => {
            if(!user){
                return done(null, false, {message: 'No User found'});
            }

            // Match password
            bcrypt.compare(password, user.password, (err, isMatch)=> {
                if(err) throw err;
                if(isMatch){
                    return done(null, user)
                } else {
                    return done(null, false, {message: 'Password incorrect'});
                }
            });
        })
    }));*/

    passport.serializeUser(function(user, done) {
     done(null, user.id);
    });
      
    passport.deserializeUser(function(id, done) {
        User.findById(id, function(err, user) {
            done(err, user);
        });
    });
}