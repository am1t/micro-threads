const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const router = express.Router();

// Load User Model
require('../models/Users');
const User = mongoose.model('users');

// User Login route
router.get('/login', (req, res) => {
    res.render('users/login');
});

// User Logout route
router.get('/logout', (req, res) => {
    User.find({ userid: req.user.userid }).remove().exec();
    req.logout();
    req.flash('success_msg', 'You are logged out');
    res.redirect('/discover');
});

// User Register route
router.get('/register', (req, res) => {
    res.send('Not Authorised');
    //res.render('users/register');
});

// Form for user Register route
router.post('/register', (req, res) => {
    let errors = [];
    if(req.body.password != req.body.password2){
        errors.push({text:"Password do not match"});
    }
    if(req.body.password.length < 4){
        errors.push({text:"Password should at least be 4 characters long"});
    }
    if(errors.length > 0){
        res.render('users/register', {
            name: req.body.name,
            email: req.body.email,
            password: req.body.password,
            password2: req.body.password2,
            errors: errors
        });
    } else {
        User.findOne({email: req.body.email})
        .then(user => {
            if(user){
                req.flash('error_msg', "Email already registered.");
                res.redirect('/users/register');
            } else {
                const newUser = new User({
                    name: req.body.name,
                    email: req.body.email,
                    password: req.body.password
                });
                bcrypt.genSalt(10, (err, salt) => {
                    bcrypt.hash(newUser.password, salt, (err, hash) => {
                        if(err) throw err;
                        newUser.password = hash;
                        newUser.save()
                        .then(user => {
                            req.flash('success_msg', 'User Successfully Registered');
                            res.redirect('/');
                        })
                        .catch(err => {
                            console.log(err);
                        });
                    });
                });
            }
        })
    }
});

// User Login form post
router.post('/login', (req, res, next) => {
    passport.authenticate('local', {
        successRedirect: '/micro/threads',
        failureRedirect:'/users/login',
        failureFlash: true
    })(req, res, next);
});

module.exports = router;