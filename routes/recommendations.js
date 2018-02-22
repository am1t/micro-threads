const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const {ensureAuthenticated} = require('../helper/auth');

const { fetch_links, fetch_title } = require('../helper/utils');

// Load Recommendation Model
require('../models/Recommendation');
const Recommendation = mongoose.model('recommendations');

//Edit Idea Form
router.get('/edit/:id', ensureAuthenticated, (req, res) => {
    Recommendation.findById(req.params.id)
    .then(rec => {
        res.render('recommendations/edit', {
            rec: rec
        });
    });
});

// Edit Form Process
router.put('/:id', ensureAuthenticated, (req, res) => {
    Recommendation.findById(req.params.id)
    .then(rec => {
        rec.title = req.body.title;
        rec.url = req.body.url;

        rec.save()
        .then(idea => {
            req.flash('success_msg', 'Recommendations Metadata Updated');
            res.redirect('/micro/threads');
        });
    });
});

module.exports = router;