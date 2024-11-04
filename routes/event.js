const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const verifyToken = require('../middleware/verifyToken'); // Ensure this is the correct import
const User = require('../models/User');

// Create Event
router.post('/create', verifyToken, async (req, res) => {
  const { date, time, eventType, public, fees, indoor, address, weather } = req.body;
  const createdBy = req.user._id; // This gets the ID of the user who created the event

  try {
    const event = new Event({
      date,
      time,
      eventType,
      public,
      fees,
      indoor,
      address,
      weather,
      createdBy, // Automatically set the user ID of the creator
      createdDate: new Date(), // Set the created date as current date
      updatedDate: new Date(), // Set the updated date as current date
      joinedPlayers: [createdBy] // Automatically add the creator to the joinedPlayers list
    });

    const savedEvent = await event.save();
    res.status(201).json(savedEvent); // Return a 201 Created status
  } catch (error) {
    console.error(error); // Log error for debugging
    res.status(500).send("Error creating event");
  }
});


// Edit Event (Only the creator can edit)
router.put('/edit/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const userId = req.user._id;

  try {
    const event = await Event.findById(id);
    if (!event) return res.status(404).send("Event not found");

    if (!event.createdBy.equals(userId)) {
      return res.status(403).send("You are not authorized to edit this event");
    }

    // Update event with new data
    Object.assign(event, updates);
    event.updatedDate = new Date();
    event.updatedTime = new Date().toTimeString().split(' ')[0];

    const updatedEvent = await event.save();
    res.status(200).json(updatedEvent); // Return the updated event
  } catch (error) {
    console.error(error); // Log error for debugging
    res.status(500).send("Error editing event");
  }
});

// Join Event
router.post('/join/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  try {
    const event = await Event.findById(id);
    if (!event) return res.status(404).send("Event not found");

    if (!event.public && !event.invitedPlayers.includes(userId)) {
      return res.status(403).send("You're not invited to this event");
    }

    // Check if the user is already in the joinedPlayers list
    if (event.joinedPlayers.includes(userId)) {
      return res.status(400).json({ message: "You have already joined this event" });
    }

    event.joinedPlayers.push(userId);
    event.updatedTime = new Date().toTimeString().split(' ')[0];
    await event.save();

    res.status(200).json(event);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error joining event");
  }
});

// Add Comment
router.post('/comment/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  let { comment } = req.body;
  const userId = req.user._id;

  try {
    // Trim whitespace from the beginning and end of the comment
    comment = comment.trim();

    const event = await Event.findById(id);
    if (!event) return res.status(404).send("Event not found");

    const user = await User.findById(userId);
    if (!user) return res.status(404).send("User not found");

    // Check if a comment with the same content by the same user already exists
    const isDuplicate = event.comments.some(
      (c) => c.username === user.username && c.comment === comment
    );

    if (isDuplicate) {
      return res.status(409).json({ message: "Duplicate comment not allowed" });
    }

    // Add the comment if it's not a duplicate
    event.comments.push({ username: user.username, comment });
    const updatedEvent = await event.save();

    res.status(200).json(updatedEvent);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error adding comment");
  }
});


// Leave Event
router.post('/leave/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  try {
    const event = await Event.findById(id);
    if (!event) return res.status(404).send("Event not found");

    // Check if the user is in the joinedPlayers list
    const userIndex = event.joinedPlayers.indexOf(userId);
    if (userIndex === -1) {
      return res.status(400).json({ message: "You have not joined this event" });
    }

    // Remove the user from the joinedPlayers list
    event.joinedPlayers.splice(userIndex, 1);
    event.updatedTime = new Date().toTimeString().split(' ')[0];
    await event.save();

    res.status(200).json({ message: "You have successfully left the event", event });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error leaving event");
  }
});

// Delete Event
router.delete('/delete/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  try {
    const event = await Event.findById(id);
    if (!event) return res.status(404).send("Event not found");

    // Check if the user is the creator of the event
    if (!event.createdBy.equals(userId)) {
      return res.status(403).json({ message: "You are not authorized to delete this event" });
    }

    await Event.findByIdAndDelete(id);

    res.status(200).json({ message: "Event successfully deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error deleting event");
  }
});


module.exports = router;
