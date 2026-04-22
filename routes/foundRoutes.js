const express = require('express');
const router = express.Router();

const foundController = require('../controllers/foundController');
const { isLoggedIn } = require('../middleware/authMiddleware');

// GET all found items — anyone can view
router.get('/', foundController.getAllFoundItems);

// Search found items — must come before /:id
router.get('/search', foundController.searchFoundItems);

// GET one found item by ID
router.get('/:id', foundController.getFoundItemById);

// POST create a new found item report — must be logged in
router.post('/', isLoggedIn, foundController.createFoundItem);

// PUT update a found item — must be logged in
router.put('/:id', isLoggedIn, foundController.updateFoundItem);

// DELETE a found item — must be logged in
router.delete('/:id', isLoggedIn, foundController.deleteFoundItem);

module.exports = router;