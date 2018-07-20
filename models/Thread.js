const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ThreadSchema = new Schema({
    postId:{
        type: String,
        required: true
    },
    title:{
        type: String,
        required: true
    },
    details: {
        type: String,
        required: true
    },
    created_by: {
        type: String,
        required: false
    },
    discover: {
        type: Boolean,
        default: false,
        required: true
    },
    date:{
        type: Date,
        default: Date.now
    }
})

mongoose.model('threads', ThreadSchema);