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
        
        Post.countDocuments({'post_id': item.id}, function(error, count){
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
                    if(link.href && link.href.indexOf("https://micro.blog") == -1){
                        if(item.url && item.url.indexOf("https://micro.blog") == -1){
                            item.url = 'https://micro.blog/' + item.author._microblog.username
                                + '/' + item.id;
                        }
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

const fetch_stream = function(apptoken, before_id){
    const error_string = "Error while processing the request.";

    var mb_api =  before_id ? "http://micro.blog/posts/all?before_id="+ before_id 
        : "http://micro.blog/posts/all";
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
                var user = item.author._microblog.username.toLowerCase();
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

const fetch_user_information = function(apptoken, userid){
    const error_string = "Error while processing the request.";
    var mb_api = "http://micro.blog/posts/" + userid;
    return new Promise((resolve, reject) => {
        request.get({
            url: mb_api, 
            headers: {'Authorization': 'Token ' + apptoken}
            }, function (error, response, body) {
            
            if(body.indexOf(error_string) != -1){
                reject("Failed to load user information");
            } else {
                resolve(JSON.parse(body));
            }
        });
    });
}

module.exports = {
    fetch_links, fetch_title, remove_fetched, fetch_user_information,
    fetch_stream, fetch_discover, fetch_following, fetch_users_from_stream, fetch_user_from_discover
};