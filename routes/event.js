const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const verifyToken = require('../middleware/verifyToken'); // Ensure this is the correct import
const User = require('../models/User');
const nodemailer = require('nodemailer');


// Configure the email transporter
const transporter = nodemailer.createTransport({
  service: 'Gmail', // You can use other services like SendGrid, Mailgun, etc.
  auth: {
    user: process.env.EMAIL_USER, // Your email address
    pass: process.env.EMAIL_PASS  // Your email password or application-specific password
  }
});


// Show all upcoming public events or events the user has joined
router.get('/upcoming', verifyToken, async (req, res) => {
  const userId = req.user._id;
  const currentDateTime = new Date();

  try {
    const events = await Event.find({
      $or: [
        { public: true }, // Public events
        { joinedPlayers: userId }, // Events where the user has joined
        { invitedPlayers: userId } // Private events where the user is invited
      ],
      date: { $gte: currentDateTime } // Only future events
    }).sort({ date: 1 }); // Sort by date in ascending order

    res.status(200).json({ total: events.length, events });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching upcoming events");
  }
});



// Show all upcoming events created by the user
router.get('/upcoming/created-by-me', verifyToken, async (req, res) => {
  const userId = req.user._id;
  const currentDateTime = new Date();

  try {
    const events = await Event.find({
      createdBy: userId,
      date: { $gte: currentDateTime } // Only future events
    }).sort({ date: 1 });

    res.status(200).json({ total: events.length, events });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching events created by you");
  }
});


// Show all upcoming events the user joined
router.get('/upcoming/joined', verifyToken, async (req, res) => {
  const userId = req.user._id;
  const currentDateTime = new Date();

  try {
    const events = await Event.find({
      joinedPlayers: userId,
      date: { $gte: currentDateTime } // Only future events
    }).sort({ date: 1 });

    res.status(200).json({ total: events.length, events });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching events you joined");
  }
});



// Show all past events the user joined (history)
router.get('/history/joined', verifyToken, async (req, res) => {
  const userId = req.user._id;
  const currentDateTime = new Date();

  try {
    const events = await Event.find({
      joinedPlayers: userId,
      date: { $lt: currentDateTime } // Only past events
    }).sort({ date: -1 }); // Sort by date in descending order (most recent first)

    res.status(200).json(events);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching past events");
  }
});


// Invite a user to an event
router.post('/invite/:eventId', verifyToken, async (req, res) => {
  const userId = req.user._id;
  const { eventId } = req.params;
  const { invitedUserId } = req.body; // User ID to invite

  try {
    // Find the event by ID
    const event = await Event.findById(eventId);

    // Check if the event exists
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check if the requesting user is the creator of the event
    if (event.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'You are not authorized to invite users to this event' });
    }

    // Check if the user is already invited
    if (event.invitedPlayers.includes(invitedUserId)) {
      return res.status(400).json({ error: 'User is already invited to this event' });
    }

    // Add the invited user to the invitedPlayers array
    event.invitedPlayers.push(invitedUserId);

    // Save the updated event
    await event.save();

    // Find the invited user to get their email
    const invitedUser = await User.findById(invitedUserId);
    if (!invitedUser) {
      return res.status(404).json({ error: 'Invited user not found' });
    }

    // Send an email to the invited user
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: invitedUser.email, // The email of the invited user
      subject: 'You are invited to an event!',
      html: `
        <h1>Event Invitation</h1>
        <p>You have been invited to an event titled "${event.eventType}"!</p>
        <p>Date: ${event.date}</p>
        <p>Location: ${event.address}</p>
        <p>
          <a href="http://localhost:8081">Click here to view the event and RSVP!</a>
        </p>
        <p>Thank you!</p>
      `
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: 'User invited successfully', event });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error inviting user to event");
  }
});



// Create Event
router.post('/create', verifyToken, async (req, res) => {
  const { dateString, eventType, public, fees, indoor, address, weather } = req.body;
  const createdBy = req.user._id; // This gets the ID of the user who created the event

  // Log the date string for debugging
  console.log('Date being saved:', dateString);

  // Parse dateString into a Date object
  const date = new Date(dateString); // Ensure this string includes the time as well, e.g., "2025-11-11T14:00:00Z"

  // Check if the date is valid
  if (isNaN(date.getTime())) {
    console.error('Invalid date format received:', dateString); // Log the invalid date string
    return res.status(400).json({ error: 'Invalid date format. Please use ISO format.' });
  }

  try {
    // Check for duplicate event based on attributes (customize as needed)
    const existingEvent = await Event.findOne({
      date,
      eventType,
      address,
      createdBy // You may want to allow users to create the same event if they are not the same creator
    });

    if (existingEvent) {
      return res.status(409).json({ error: 'Event already exists.' }); // 409 Conflict
    }

    // Create a new event instance
    const event = new Event({
      date, // Use the parsed date
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

    // Save the event to the database
    const savedEvent = await event.save();
    res.status(201).json(savedEvent); // Return a 201 Created status
  } catch (error) {
    console.error('Error creating event:', error); // Log error for debugging
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
