const express = require('express');
const router = express.Router();
const claimsController = require('../controllers/claimsController');
const { isLoggedIn } = require('../middleware/authMiddleware');

// Import multer config
const upload = require('../config/multer');

// POST /api/claims — submit a claim with optional file evidence
// upload.array('evidence', 5) means:
// accept up to 5 files from a form field named 'evidence'
router.post('/', isLoggedIn, upload.array('evidence', 5), claimsController.submitClaim);

// GET /api/claims/my-claims — get logged in user's claims
router.get('/my-claims', isLoggedIn, claimsController.getMyClaims);

// GET /api/claims/found/:found_id — get all claims on a specific found item
// Only the finder or admin can access this
// IMPORTANT: must come before /:id so Express doesn't treat "found" as a claim_id
router.get('/found/:found_id', isLoggedIn, claimsController.getClaimsForItem);

// PUT /api/claims/:id/review — approve or reject a claim
router.put('/:id/review', isLoggedIn, claimsController.reviewClaim);

module.exports = router;