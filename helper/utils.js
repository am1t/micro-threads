const linkscrape = require('linkscrape');
const cheerio = require('cheerio');
var request = require('request');
const mongoose = require('mongoose');


// Load Post Model
require('../models/Post');
const Post = mongoose.model('posts');

const fetch_title = function(url, onComplete = null) {
    request(url, function (error, response, body) {
        var output = url;   // default to URL
        if (!error && response.statusCode === 200) {
            var $ = cheerio.load(body);
            var title = $("head > title").text().trim();
            output = {title: title, url: url};
        } else {
            console.log('Failed to load the title for ', url);
        }
        if (onComplete) onComplete(output);
    });
}

const remove_fetched = function(items, onComplete = null) {
    var new_items = [];
    var handled_posts = [];
    items.forEach(item => {
        let errors = [];
        
        Post.count({'post_id': item.id}, function(error, count){
            if(error){
                errors.push("Failed to fetch thread " + error);
                res.render('/', {
                    errors: error
                })
            }
            if(count == 0){
                new_items.push(item);
            }
            handled_posts.push(item);
            if(handled_posts.length >= items.length){
                console.log("Fetched " + new_items.length + " new items to be refreshed");
                if (onComplete) onComplete(new_items);
            }
        });
    });
}

const fetch_links = function(items, thread_id, onComplete = null) {
    var recommendations = [];
    items.forEach((item, itemIndex) => {
        const newPost = {
            thread_id: thread_id,
            post_id: item.id
        }
        new Post(newPost).save();

        linkscrape('', item.content_html, (links, $) =>{
            if(links.length > 0){
                var itemsProcessed = 0;
                links.forEach((link, linkIndex) => {
                    let link_title = '';
                    if(link.href && link.href.indexOf("micro.blog") == -1){
                        recommendations.push({
                            title: link.text,
                            url: link.href,
                            context: item.content_html,
                            context_url: item.url,
                            username: item.author._microblog.username
                        });
                    } 
                });
            } 
        });
    });
    if (onComplete) onComplete(recommendations);
}

module.exports = {
    fetch_links, fetch_title, remove_fetched
};