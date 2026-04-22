// express.Router() creates a mini router
// Think of it as a smaller version of your main server
// that handles only auth-related URLs
const express = require('express');
const router = express.Router();

// Import the controller file
// The controller is where the actual logic lives
// Right now this file is empty too but we will
// fill it in the very next step
const authController = require('../controllers/authController');

// When someone sends a POST request to /api/auth/register
// run the register function from authController
router.post('/register', authController.register);

// When someone sends a POST request to /api/auth/login
// run the login function from authController
router.post('/login', authController.login);

// When someone sends a POST request to /api/auth/logout
// run the logout function from authController
router.post('/logout', authController.logout);

// When someone sends a GET request to /api/auth/me
// run the getMe function from authController
// This returns the currently logged in user's info
router.get('/me', authController.getMe);

// This exports the router so server.js can use it
module.exports = router;