const express = require('express');
const router = express.Router();

const claimsController = require('../controllers/claimsController');
const { isLoggedIn } = require('../middleware/authMiddleware');

// Import our multer configuration
// upload is now available to use as middleware
const upload = require('../config/multer');

// POST /api/claims
// Submit a new claim + optional proof files
//
// upload.array('proof_files', 5) means:
// → accept files from a field named 'proof_files'
// → allow maximum 5 files at once
// → multer runs BEFORE submitClaim
//   so by the time submitClaim runs,
//   req.files already contains the uploaded files
router.post(
    '/',
    isLoggedIn,
    upload.array('proof_files', 5),
    claimsController.submitClaim
);

// GET /api/claims/my-claims
router.get('/my-claims', isLoggedIn, claimsController.getMyClaims);

// GET /api/claims/found/:found_id
router.get('/found/:found_id', isLoggedIn, claimsController.getClaimsForItem);

// PUT /api/claims/:id/review
router.put('/:id/review', isLoggedIn, claimsController.reviewClaim);

module.exports = router;