const express = require('express');
const mongoose = require('mongoose');
var request = require('request');
const passport = require('passport');
const {ensureAuthenticated} = require('../helper/auth');
const router = express.Router();

const { follow_recommendations_stream, follow_recommendations_discover } = require('../helper/utils');

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
                errors.push("Username/Token invalid");
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
    var app_token = req.user.token;

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

module.exports = router;