const express = require('express');
const router = express.Router();

const matchController = require('../controllers/matchController');
const { isLoggedIn } = require('../middleware/authMiddleware');

// POST /api/matches/run
// Admin manually triggers a full global match sweep
router.post('/run', isLoggedIn, matchController.runGlobalMatching);

// GET /api/matches/my-matches
// Logged-in user sees suggestions for their lost items
// IMPORTANT: must come before /:id so Express does not
// treat "my-matches" as a match_id value
router.get('/my-matches', isLoggedIn, matchController.getMyMatches);

// PUT /api/matches/:id/status
// User confirms or rejects a specific match suggestion
router.put('/:id/status', isLoggedIn, matchController.updateMatchStatus);

module.exports = router;