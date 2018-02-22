const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const RecommendationSchema = new Schema({
    thread_id:{
        type: String,
        required: true
    },
    title:{
        type: String,
        required: true
    },
    url:{
        type: String,
        required: true
    },
    context: {
        type: String,
        required: true
    },    
    context_url:{
        type: String,
        required: true
    },
    author:{
        type: String,
        required: true
    }  
})

mongoose.model('recommendations', RecommendationSchema);