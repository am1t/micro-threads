const express = require('express');
const mongoose = require('mongoose');
const request = require('request');
const passport = require('passport');
const {ensureAuthenticated} = require('../helper/auth');
const router = express.Router();
const CryptoJS = require("crypto-js");
const marked = require('marked');

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
    let check_api = 'http://micro.blog/users/is_following?username=' + req.body.userid;
    let app_token = req.body.token;
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
        let userid = req.user.userid;
        let app_token = CryptoJS.AES.decrypt(req.user.token, appconfig.seckey).toString(CryptoJS.enc.Utf8);

        const [stream,discover,following] = await Promise.all([
            fetch_stream(app_token), fetch_discover(app_token), fetch_following(userid, app_token)]);

        const [stream_recs,discover_recs] = await Promise.all([
            fetch_users_from_stream(stream, following), fetch_user_from_discover(discover, following)]);
        

        let user_recs = {};
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
    let posts = {};
    return new Promise((resolve, reject) => {
        try {
            let interactions = [];
            let original = [];
            items.forEach((item, itemIndex) => {
                let content = item.content_html;
                let at_identifier = "<p><a href=\"https://micro.blog/";

                if(content.startsWith(at_identifier)){
                    if(interactions.length < 10) interactions.push({id:item.id, content:content, url: item.url}) ;
                } else { if(original.length < 10)  original.push({id:item.id, content:content, url: item.url}); }
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
        let app_token = CryptoJS.AES.decrypt(req.user.token, appconfig.seckey).toString(CryptoJS.enc.Utf8);
        const user_info = await fetch_user_information(app_token, req.params.userid);

        const author = user_info.author;
        const posts = await fetch_posts_by_type(user_info.items);

        author.avatar = author.avatar.toString().split("?")[0];
        author.userid = req.params.userid;
        author.bio = marked(user_info._microblog.bio);

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

//Follow user route
router.post('/user/follow', ensureAuthenticated, async (req, res) => {
    let errors = [];
    let follow_api = 'http://micro.blog/users/follow';
    let app_token = CryptoJS.AES.decrypt(req.user.token, appconfig.seckey).toString(CryptoJS.enc.Utf8);
    const error_string = "Error while processing the request.";

    try {
        let userid = req.body.userid;
        request.post(
            {
                url:follow_api, 
                headers: {'Authorization': 'Token ' + app_token},
                form:{username:userid}
            }, function(error, response, body){
                if(body.indexOf(error_string) != -1){
                    console.error("Failed to follow the user");
                    errors.push({text:"Failed to follow the user"});
                    req.flash('error_msg', 'Failed to follow the user');
                    res.redirect('/discover/user');
                } else {
                    req.flash('success_msg', 'Successfully followed ' + userid);
                    res.redirect('/discover/user');
                }
            });
    } catch (error) {
        console.error(error);
        errors.push({text:"Failed to follow the user"});
        req.flash('error_msg', 'Failed to follow the user');
        res.redirect('/discover/user');
    }
});

const fetch_original = function(item, app_token) {
    let conversation_api = 'http://micro.blog/posts/conversation?id=';    
    const error_string = "Error while processing the request.";

    return new Promise((resolve, reject) => {
        request.get({
            url: conversation_api + item.id, 
            headers: {'Authorization': 'Token ' + app_token}
        }, function (error, response, body) {
            if(body.indexOf(error_string) == -1){
                let thread_items = JSON.parse(body).items;
                let original = thread_items[thread_items.length - 1];
                resolve(original);
            } else {
                reject("Failed to load conversation");
            }
        });
    });
}

const parse_interactions = function(interactions, app_token){
    let promises = [];
    interactions.forEach(item => { promises.push(fetch_original(item, app_token)) });
    return new Promise((resolve, reject) => {
        Promise.all(promises).then(originals => {
            resolve(originals);
        })
        .catch(errors => {
            reject(errors);
        });
    });
}

// Discover User Route
router.get('/thread', ensureAuthenticated, async (req, res, next) => {
    let errors = [];
    
    try {
        let app_token = CryptoJS.AES.decrypt(req.user.token, appconfig.seckey).toString(CryptoJS.enc.Utf8);
        const stream = await fetch_stream(app_token);
        const posts = await fetch_posts_by_type(stream);
        let interactions = posts.interactions;
        let org_posts = posts.originals;

        let originals = await parse_interactions(interactions, app_token);
        //let thread_recs = [...new Set(originals.map(item => item.id))];
        let thread_recs = originals.filter((original, index, self) =>
             index === self.findIndex((t) => (
                t.id === original.id
            ))
        )
        res.render('discover/thread_discovery', {
            posts: org_posts,
            conversations: thread_recs
        });
    } catch (error) {
        console.log(error);
        errors.push({text:"Failed to fetch thread discover"});
        res.render('discover/landing', {
            errors: errors
        })        
    }
});

module.exports = router;