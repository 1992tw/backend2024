// routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const Joi = require('joi');
const User = require('../models/User');

dotenv.config();

const router = express.Router();

// Validation schema
const registerSchema = Joi.object({
  name: Joi.string().min(3).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

// Register Route
router.post('/register', async (req, res) => {
  try {
    // Validate input
    const { error } = registerSchema.validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    // Check if user exists
    const emailExists = await User.findOne({ email: req.body.email });
    if (emailExists) return res.status(409).send('Email already exists');

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);

    // Create new user
    const user = new User({
      name: req.body.name,
      email: req.body.email,
      password: hashedPassword,
    });

    const savedUser = await user.save();
    // Generate JWT token
    const token = jwt.sign({ _id: savedUser._id }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    return res.send({
      name: savedUser.name,
      token,
    });
  } catch (err) {
    console.error("Registration error:", err);
    return res.status(500).send('Server error');
  }
});

// Login Route
router.post('/login', async (req, res) => {
  try {
    // Validate input
    const { error } = loginSchema.validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    // Check if user exists
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(401).send('Email or password is incorrect');

    // Validate password
    const validPass = await bcrypt.compare(req.body.password, user.password);
    if (!validPass) return res.status(401).send('Invalid password');

    // Create and assign JWT token
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    return res.header('Authorization', token).send({
      name: user.name,
      token,
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).send('Server error');
  }
});

module.exports = router;
