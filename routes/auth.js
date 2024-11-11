const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const Joi = require('joi');
const User = require('../models/User');
const nodemailer = require('nodemailer');
const router = express.Router();
dotenv.config();

// Validation schema for registration
const registerSchema = Joi.object({
  username: Joi.string().min(3).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

// Validation schema for login
const loginSchema = Joi.object({
  identifier: Joi.string().required(), // Either email or username
  password: Joi.string().min(6).required(),
});

// Register Route
router.post('/register', async (req, res) => {
  try {
    // Validate input
    const { error } = registerSchema.validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    // Convert username and email to lowercase
    const username = req.body.username.toLowerCase();
    const email = req.body.email.toLowerCase();

    // Check if user exists
    const emailExists = await User.findOne({ email });
    if (emailExists) return res.status(409).send('Email already exists');

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);

    // Create new user
    const user = new User({
      username,
      email,
      password: hashedPassword,
    });

    const savedUser = await user.save();
    // Generate JWT token
    const token = jwt.sign({ _id: savedUser._id }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    return res.send({
      username: savedUser.username,
      userId: savedUser._id, // send userId
      token,
    });
  } catch (err) {
    console.error("Registration error:", err);
    return res.status(500).send('Server error');
  }
});

// Login Route
router.post('/login', async (req, res) => {
  console.log('Login route hit'); // Debugging log
  try {
    // Validate input
    const { error } = loginSchema.validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    // Get the identifier (username or email) and password
    const identifier = req.body.identifier.toLowerCase();
    const password = req.body.password;

    // Determine if identifier is email or username
    const isEmail = identifier.includes('@');
    const user = await User.findOne(isEmail ? { email: identifier } : { username: identifier });

    if (!user) return res.status(401).send('Invalid username/email or password');

    // Validate password
    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass) return res.status(401).send('Invalid username/email or password');

    // Create and assign JWT token
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    return res.header('Authorization', token).send({
      username: user.username,
      userId: user._id, // send userId
      token,
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).send('Server error');
  }
});



// Setup Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail', // or your preferred service
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});


// Reset Password Endpoint
router.post('/reset-password', async (req, res) => {
  const { newPassword, www } = req.body;

  try {
    // Find the user with the matching reset token and check expiration
    const user = await User.findOne({
      resetToken: resetCode,
      resetTokenExpiration: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset code.' });
    }

    // Update the user's password and clear the reset token and expiration
    user.password = await bcrypt.hash(newPassword, 10);
    user.resetToken = undefined;
    user.resetTokenExpiration = undefined;
    await user.save();

    res.status(200).json({ message: 'Password has been reset successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while resetting your password.' });
  }
});




// Forgot Password Endpoint
router.post('/forgot-pass', async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Generate a 5-digit numeric reset code
    const resetCode = ('00000' + Math.floor(Math.random() * 100000)).slice(-5); // 5-digit code
    user.resetToken = resetCode;
    user.resetTokenExpiration = Date.now() + 3600000; // 1-hour expiration
    await user.save();

    // Send email with reset code
    await transporter.sendMail({
      to: email,
      subject: 'Password Reset Code',
      html: `<p>You requested a password reset. Use the code below to reset your password:</p><h3>${resetCode}</h3>`,
    });

    res.status(200).json({ message: 'Check your email for the reset code.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while processing your request.' });
  }
});



module.exports = router;






