const express = require('express');
const mongoose = require('mongoose');
var request = require('request');
const passport = require('passport');
const {ensureAuthenticated} = require('../helper/auth');
const router = express.Router();
var CryptoJS = require("crypto-js");

const { follow_recommendations_stream, follow_recommendations_discover } = require('../helper/utils');
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

// User Login form post
router.get('/dashboard', ensureAuthenticated, (req, res, next) => {
    let errors = [];
    var app_token = CryptoJS.AES.decrypt(req.user.token, appconfig.seckey).toString(CryptoJS.enc.Utf8);

    var mb_stream_api = "http://micro.blog/posts/all";
    var mb_discover_api = "http://micro.blog/posts/discover";
    var mb_following_api = "https://micro.blog/users/following/" + req.user.userid;

    request.get({
        url: mb_stream_api, 
        headers: {'Authorization': 'Token ' + app_token}
        }, function (error, response, body) {
        var thread_items = JSON.parse(body);
        
        if(error){
            errors.push("Failed to fetch stream " + error);
            res.render('/discover', {
                errors: errors
            })
        } else {
            var stream = JSON.parse(body).items;
            var following = [];
            var user_recs_all = [];
            request.get({
                url: mb_following_api, 
                headers: {'Authorization': 'Token ' + app_token}
                }, function (error, response, flw_body) {
                    var following_dtls = JSON.parse(flw_body);
                    following_dtls.forEach((item) => {
                        following.push(item.username);
                    });
                    follow_recommendations_stream(stream, function(recs){
                        //user_recs_all.concat(recs);
                        request.get({
                            url: mb_discover_api, 
                            headers: {'Authorization': 'Token ' + app_token}
                            }, function (error, response, disc_body) {
                            stream = JSON.parse(disc_body).items;
                            follow_recommendations_discover(stream, function(discres){
                                var user_recs = [];
                                user_recs_all = recs.concat(discres);
                                user_recs = user_recs_all.filter((v, i, a) => { 
                                    return a.map(function(item){ return item.toLowerCase()})
                                    .indexOf(v.toLowerCase()) === i 
                                    && following.map(function(item){ return item.toLowerCase()})
                                    .indexOf(v.toLowerCase()) == -1;
                                }); 
                                res.render('discover/dashboard', {user_recs});
                            });
                        });
                    });
                });
        }
    });
});

const fetch_stream = function(apptoken){
    const error_string = "Error while processing the request.";
    var mb_api = "http://micro.blog/posts/all";
    return new Promise((resolve, reject) => {
        request.get({
            url: mb_api, 
            headers: {'Authorization': 'Token ' + apptoken}
            }, function (error, response, body) {
            
            if(body.indexOf(error_string) != -1){
                reject("Failed to load user stream");
            } else {
                resolve(JSON.parse(body).items);
            }
        });
    });
}

const fetch_discover = function(apptoken){
    const error_string = "Error while processing the request.";
    var mb_api = "http://micro.blog/posts/discover";
    return new Promise((resolve, reject) => {
        request.get({
            url: mb_api, 
            headers: {'Authorization': 'Token ' + apptoken}
            }, function (error, response, body) {
            
            if(body.indexOf(error_string) != -1){
                reject("Failed to load discover section");
            } else {
                resolve(JSON.parse(body).items);
            }
        });
    });
}

const fetch_following = function(userid, apptoken){
    const error_string = "Error while processing the request.";
    var mb_api = "https://micro.blog/users/following/" + userid;
    return new Promise((resolve, reject) => {
        request.get({
            url: mb_api, 
            headers: {'Authorization': 'Token ' + apptoken}
            }, function (error, response, body) {
            
            if(body.indexOf(error_string) != -1){
                reject("Failed to load following list");
            } else {
                var following = [];
                var following_dtls = JSON.parse(body);
                following_dtls.forEach((item) => {
                    following.push(item.username.toLowerCase());
                });
                resolve(following);
            }
        });
    });
}

const fetch_users_from_stream = function(stream, following) {
    var recs = new Map();
    return new Promise((resolve, reject) => {
        try {
            stream.forEach((item, itemIndex) => {
                var content = item.content_html;
                const re = /@([^-\s]*?)</g;
                while(current = re.exec(content)){
                    var user = current.pop().toLowerCase();
                    // 1. Check following status here itself to reduce complexity
                    // 2. Check for uniqueness in msg
                    if(following.indexOf(user) == -1){
                        if(!recs.has(user)) {
                            recs.set(user, ["@"+ item.author._microblog.username.toLowerCase()]); 
                        } else {
                            var current_users = [];
                            current_users = recs.get(user);
                            if(current_users.indexOf("@"+item.author._microblog.username.toLowerCase()) == -1){
                                current_users.push("@"+item.author._microblog.username.toLowerCase());
                                recs.set(user, current_users);
                            }
                        } 
                    }
                }
            });
            resolve(recs);
        } catch (error) {
            reject(error);
        }
    });
}

const fetch_user_from_discover = function(stream, following) {
    var recs = new Map();
    return new Promise((resolve, reject) => {
        try {
            stream.forEach((item, itemIndex) => {
                var user = item.author._microblog.username;
                if(following.indexOf(user) == -1){
                    recs.set(user, "Featured in discover section");
                }
            });
            resolve(recs);
        } catch (error) {
            reject(error);
        }
    });
}

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

module.exports = router;