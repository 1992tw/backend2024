const mongoose = require('mongoose');
const commentSchema = require('./Comment').schema; // Import the comment schema

// Event Schema
const eventSchema = new mongoose.Schema({
  date: { type: String, required: true },
  time: { type: String, required: true },
  eventType: { type: String, default: 'pickleball' },
  public: { type: Boolean, default: true },
  fees: { type: Number, default: 0 },
  indoor: { type: Boolean, default: false },
  invitedPlayers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  joinedPlayers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  address: { type: String, required: true },
  weather: { type: String, default: 'N/A' },
  comments: [commentSchema], // Reference the Comment schema here
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdDate: { type: Date, default: Date.now }, // Keep this for creation date
  updatedDate: { type: Date, default: Date.now }, // Keep this for update date
  notificationSent: { type: Boolean, default: false } // To track notification status
});

module.exports = mongoose.model('Event', eventSchema);
