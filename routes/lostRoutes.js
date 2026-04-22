// express.Router() creates a mini router
// specifically for lost item related URLs
const express = require('express');
const router = express.Router();

// Import the controller — this is where the actual
// logic for each route lives
const lostController = require('../controllers/lostController');

// Import our isLoggedIn middleware — the bouncer
// We only need it on routes that require login
const { isLoggedIn } = require('../middleware/authMiddleware');

// =============================================
// GET /api/lost-items
// Fetch ALL lost items
// No login required — anyone can browse
// =============================================
router.get('/', lostController.getAllLostItems);

// =============================================
// GET /api/lost-items/search
// Search with filters like keyword, category, floor
// IMPORTANT: This must come BEFORE /:id route
// because Express reads routes top to bottom
// If /:id came first, "search" would be treated
// as an :id value — which is wrong
// =============================================
router.get('/search', lostController.searchLostItems);

// =============================================
// GET /api/lost-items/:id
// Fetch ONE specific lost item by its ID
// :id is a URL parameter — a variable in the URL
// Example: /api/lost-items/5 → id is 5
// =============================================
router.get('/:id', lostController.getLostItemById);

// =============================================
// POST /api/lost-items
// Create a new lost item report
// isLoggedIn runs FIRST as a checkpoint
// Only if logged in does lostController.create run
// =============================================
router.post('/', isLoggedIn, lostController.createLostItem);

// =============================================
// PUT /api/lost-items/:id
// Update/edit an existing lost item
// Must be logged in to edit
// =============================================
router.put('/:id', isLoggedIn, lostController.updateLostItem);

// =============================================
// DELETE /api/lost-items/:id
// Delete a lost item report
// Must be logged in to delete
// =============================================
router.delete('/:id', isLoggedIn, lostController.deleteLostItem);

// Export the router so server.js can use it
module.exports = router;