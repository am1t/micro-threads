const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Create Schma
const UserSchema = new Schema({
    name: {
        type: String,
        required: false
    },
    email: {
        type: String,
        required: false
    },  
    password: {
        type: String,
        required: false
    },
    userid: {
        type: String,
        required: true
    },
    token: {
        type: String,
        required: true
    },     
    date:{
        type: Date,
        default: Date.now
    }
});

mongoose.model('users', UserSchema);