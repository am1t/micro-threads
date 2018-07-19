const express = require('express');
const mongoose = require('mongoose');
var request = require('request');
const passport = require('passport');
const {ensureAuthenticated} = require('../helper/auth');
const router = express.Router();
var CryptoJS = require("crypto-js");

const {  fetch_stream, fetch_discover, fetch_following, fetch_user_information,
    fetch_users_from_stream, fetch_user_from_discover } = require('../helper/utils');
const appconfig = require('../config/appconfig');

// Load Thread Model
require('../models/Thread');
const Thread = mongoose.model('threads');

// Fetch Route
router.get('/', (req, res) => {
    if(req.isAuthenticated()) {
        res.render('discover/landing');
    } else {
        res.render('users/signin');
    }
});

// User Login form post
router.post('/signin', (req, res, next) => {
    let errors = [];
    var check_api = 'http://micro.blog/users/is_following?username=' + req.body.userid;
    var app_token = req.body.token;
    const error_string = "Error while processing the request.";
    request.get({
        url: check_api, 
        headers: {'Authorization': 'Token ' + app_token}
        }, function (error, response, body) {
            if(body.indexOf(error_string) != -1){
                errors.push({text:"Username/Token invalid"});
                res.render('users/signin', {
                    errors: errors
                })
            } else {
                passport.authenticate('local', {
                    successRedirect: '/discover',
                    failureRedirect:'/discover',
                    failureFlash: true
                })(req, res, next);
            }
        });
});

// Discover User Route
router.get('/user', ensureAuthenticated, async (req, res, next) => {
    let errors = [];
    try {
        var userid = req.user.userid;
        var app_token = CryptoJS.AES.decrypt(req.user.token, appconfig.seckey).toString(CryptoJS.enc.Utf8);

        const [stream,discover,following] = await Promise.all([
            fetch_stream(app_token), fetch_discover(app_token), fetch_following(userid, app_token)]);

        const [stream_recs,discover_recs] = await Promise.all([
            fetch_users_from_stream(stream, following), fetch_user_from_discover(discover, following)]);
        

        var user_recs = {};
        stream_recs.forEach(function(v, k ,m){
            user_recs[k] = "Interacts with: " + v;
        });
        discover_recs.forEach(function(v, k ,m){
            if(!(k in user_recs)){
                user_recs[k] = v;
            }
        });

        res.render('discover/user_discovery', {user_recs});
       
    } catch (error) {
        console.log(error);
        errors.push({text:"Failed to fetch user discover"});
        res.render('discover/landing', {
            errors: errors
        })
    }
});

const fetch_posts_by_type = function(items){
    var posts = {};
    return new Promise((resolve, reject) => {
        try {
            let interactions = [];
            let original = [];
            items.forEach((item, itemIndex) => {
                var content = item.content_html;
                var at_identifier = "<p><a href=\"https://micro.blog/";

                if(content.startsWith(at_identifier)){
                    interactions.push(content);
                } else { original.push(content); }
            });
            posts = {interactions : interactions, originals : original}
            resolve(posts);
        } catch (error) {
            reject(error);
        }
    });
}

// Get User Information Route
router.get('/user/:userid', ensureAuthenticated, async (req, res, next) => {
    let errors = [];
    try {
        var app_token = CryptoJS.AES.decrypt(req.user.token, appconfig.seckey).toString(CryptoJS.enc.Utf8);
        const user_info = await fetch_user_information(app_token, req.params.userid);

        const author = user_info.author;
        const posts = await fetch_posts_by_type(user_info.items);

        author.userid = req.params.userid;

        res.render('discover/user_info', {
            author: author,
            originals: posts.originals,
            interactions: posts.interactions
        });

    } catch (error) {
        console.log(error);
        errors.push({text:"Failed to fetch user information"});
        res.render('discover/landing', {
            errors: errors
        })
    }
});

module.exports = router;