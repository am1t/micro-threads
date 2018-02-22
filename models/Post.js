const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Create Schma
const PostSchema = new Schema({
    thread_id: {
        type: String,
        required: true
    },
    post_id: {
        type: String,
        required: true
    }
});

mongoose.model('posts', PostSchema);