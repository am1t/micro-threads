const express = require('express');
const mongoose = require('mongoose');
var request = require('request');
const router = express.Router();
const ObjectId = mongoose.Schema.Types.ObjectId;
const {ensureAuthenticated} = require('../helper/auth');

const { fetch_links, fetch_title } = require('../helper/utils');


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
    Thread.find({discover:false})
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
        .then(recs => {
            res.render('threads/recommendations', {
                recs: recs
            });
        });
    })
});

//Add Threads Form
router.get('/add', ensureAuthenticated, (req, res) => {
    res.render('threads/add');
});

//Process Forms
router.post('/', ensureAuthenticated, (req, res) => {
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
        if(req.body.discover === "on"){
            isDiscover = true;
        }
        const newThread = {
            title: req.body.title,
            details: req.body.details,
            postId: req.body.post_id,
            discover: isDiscover
        }
        new Thread(newThread)
        .save()
        .then(thread => {
            let errors = [];
            let post_link = '';
            if(isDiscover == true){
                post_link = 'http://micro.blog/posts/discover/' + req.body.post_id;
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
});

module.exports = router;