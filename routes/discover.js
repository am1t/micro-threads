const express = require('express');
const mongoose = require('mongoose');
var request = require('request');
const router = express.Router();

// Load Thread Model
require('../models/Thread');
const Thread = mongoose.model('threads');

// Fetch Route
router.get('/', (req, res) => {
    Thread.find({discover:true})
    .sort({date: 'desc'})
    .then(threads => {
        res.render('threads/index', {
            threads: threads
        });
    })
});

module.exports = router;