const express = require('express');
const mongoose = require('mongoose');
var request = require('request');
const router = express.Router();
const ObjectId = mongoose.Schema.Types.ObjectId;
const {ensureAuthenticated} = require('../helper/auth');

const { fetch_links, fetch_title, remove_fetched } = require('../helper/utils');


// Load Thread Model
require('../models/Thread');
const Thread = mongoose.model('threads');

// Load Recommendation Model
require('../models/Recommendation');
const Recommendation = mongoose.model('recommendations');

//var post_link = 'http://micro.blog/posts/conversation?id=351177';
//var post_link = 'http://micro.blog/posts/conversation?id=353195';

// Fetch Route
router.get('/', (req, res) => {
    Thread.find()
    .sort({date: 'desc'})
    .then(threads => {
        res.render('threads/index', {
            threads: threads
        });
    })
});

// Fetch Route
router.get('/discover', (req, res) => {
    Thread.find({discover:true})
    .sort({date: 'desc'})
    .then(threads => {
        res.render('threads/index', {
            threads: threads
        });
    })
});

///thread/:{{id}}
router.get('/:id/recommendations', (req, res) => {
    Thread.findById(req.params.id)
    .then(thread => {
        Recommendation.find({thread_id: req.params.id})
        .sort({_id : 'desc'})
        .exec((err, recs) => {
            res.render('threads/recommendations', {
                recs: recs
            });
        });
    })
});

///thread/:{{id}}
router.get('/:title/recommendations', (req, res) => {
    Thread.find({title : req.params.title})
    .then(thread => {
        Recommendation.find({thread_id: req.params.id})
        .sort({_id : 'desc'})
        .exec((err, recs) => {
            res.render('threads/recommendations', {
                recs: recs
            });
        });
    })
});

//Edit Threads Form for refresh
router.get('/edit', ensureAuthenticated, (req, res) => {
    Thread.find()
    .sort({date: 'desc'})
    .then(threads => {
        res.render('threads/edit', {
            threads: threads
        });
    })    
});

//Edit Threads Form for refresh
router.get('/refresh/:id', ensureAuthenticated, (req, res) => {
    try {
        Thread.findById(req.params.id)
        .sort({date: 'desc'})
        .then(thread => {
            let errors = [];
            let post_link = '';
            if(thread.discover == true){
                if(thread.postId === 'all'){
                    post_link = 'http://micro.blog/posts/discover';
                } else{
                    post_link = 'http://micro.blog/posts/discover/' + thread.postId;
                }
            } else{
                post_link = 'http://micro.blog/posts/conversation?id=' + thread.postId;
            }
    
            request.get({
                url: post_link, 
                headers: {'Authorization': 'Token DEB996A63C13C04E8387'}
                }, function (error, response, body) {
                var thread_items = JSON.parse(body);
                if(error){
                    errors.push("Failed to fetch thread " + error);
                    res.render('/', {
                        errors: errors
                    })
                } else {
                    remove_fetched(thread_items.items, function(items){
                        if(items.length == 0){
                            console.log("No items to be parsed for recommendations");
                            req.flash('info_msg', 'No new recommendations posted yet');
                            res.redirect('/micro/threads/' + thread.id + '/recommendations');
                        }
                        fetch_links(items, thread.id, function(recs){
                            var recommendations = [];
                            recs.forEach((link, linkIndex) => {
                                fetch_title(link.url, function(output){
                                    var temp_title = '';
                                    if(output.title) temp_title = output.title; 
                                    else temp_title = link.title;
        
                                    const newRecommendation = {
                                        thread_id: thread.id,
                                        title: temp_title,
                                        url: link.url,
                                        context: link.context,
                                        context_url: link.context_url,
                                        author: link.username
                                    }
                                    
                                    new Recommendation(newRecommendation)
                                    .save()
                                    .then(rec => {
                                        recommendations.push(rec);    
                                        if(recommendations.length == recs.length){
                                            console.log("Parsed " + recs.length + " items successfully as recommendations");
                                            req.flash('success_msg', 'Thread Refreshed Successfully');
                                            res.redirect('/micro/threads/' + thread.id + '/recommendations');
                                        }
                                    })
                                    .catch(function(error){
                                        console.warn("Some links details cannot be fetched, possible reason - no title.");
                                        req.flash('info_msg', 'Thread Refreshed Successfully, with some failures');
                                        res.redirect('/micro/threads/' + thread.id + '/recommendations');
                                    });;
        
                                });
                            });
                        });
                    }); 
                }
            });         
        })   
    } catch (error) {
        console.error(error);
        req.flash('info_msg', 'Thread Refreshed Successfully, with some failures');
        res.redirect('/micro/threads/' + thread.id + '/recommendations');
    }    
});

//Add Threads Form
router.get('/add', ensureAuthenticated, (req, res) => {
    res.render('threads/add');
});

//Process Forms
router.post('/', ensureAuthenticated, (req, res) => {
    try {
        let errors = [];
        if(!req.body.title){
            errors.push({
                text: "Please add a title"
            });
        }
        if(!req.body.details){
            errors.push({text: "Please add some details"})
        }
        if(errors.length > 0){
            res.render('threads/add', {
                errors: errors,
                title: req.body.title,
                details: req.body.details,
                post_id: req.body.post_id
            });
        } else {
            var isDiscover = false;
            var ent_post_id = req.body.post_id;
            if(req.body.discover === "on"){
                isDiscover = true;
                if(!req.body.post_id){
                    ent_post_id = 'all';
                }
            }
            const newThread = {
                title: req.body.title,
                details: req.body.details,
                postId: ent_post_id,
                discover: isDiscover
            }
            new Thread(newThread)
            .save()
            .then(thread => {
                let errors = [];
                let post_link = '';
                if(isDiscover == true){
                    if(!req.body.post_id){
                        post_link = 'http://micro.blog/posts/discover';
                    } else{ 
                        post_link = 'http://micro.blog/posts/discover/' + req.body.post_id;
                    }
                } else{
                    post_link = 'http://micro.blog/posts/conversation?id=' + req.body.post_id;
                }
    
                console.log(post_link);
    
                request.get({
                        url: post_link, 
                        headers: {'Authorization': 'Token DEB996A63C13C04E8387'}
                    }, function (error, response, body) {
                    var thread_items = JSON.parse(body);
                    if(error){
                        errors.push("Failed to fetch thread " + error);
                        res.render('/', {
                            errors: errors
                        })
                    } else { 
                        fetch_links(thread_items.items, thread.id, function(recs){
                            var recommendations = [];
                            recs.forEach((link, linkIndex) => {
                                fetch_title(link.url, function(output){
                                    var temp_title = '';
                                    if(output.title) temp_title = output.title; 
                                    else temp_title = link.title;
    
                                    const newRecommendation = {
                                        thread_id: thread.id,
                                        title: temp_title,
                                        url: link.url,
                                        context: link.context,
                                        context_url: link.context_url,
                                        author: link.username
                                    }
                                    
                                    new Recommendation(newRecommendation)
                                    .save()
                                    .then(rec => {
                                        recommendations.push(rec);    
                                        if(recommendations.length == recs.length){
                                            req.flash('success_msg', 'Thread Added Successfully');
                                            res.redirect('/micro/threads');
                                        }
                                    });
                                });
                            });
                        });
                    }
                });            
            })
        }        
    } catch (error) {
        console.log(error);
        req.flash('info_msg', 'Thread Added Successfully, with some failures');
        res.redirect('/micro/threads');
    }
});

module.exports = router;