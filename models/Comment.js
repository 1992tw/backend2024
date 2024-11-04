const mongoose = require('mongoose');

// Comment Schema
const commentSchema = new mongoose.Schema({
    username: { type: String, required: true },
    comment: { type: String, required: true },
    date: { type: Date, default: Date.now }
});


module.exports = mongoose.model('Comment', commentSchema);
