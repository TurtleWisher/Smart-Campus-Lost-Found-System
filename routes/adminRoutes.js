const express = require('express');
const router = express.Router();

const adminController = require('../controllers/adminController');

// Import BOTH middleware functions
const { isLoggedIn, isAdmin } = require('../middleware/authMiddleware');

// Every single admin route uses BOTH isLoggedIn AND isAdmin
// Order matters: isLoggedIn runs first, then isAdmin
// If either one blocks the request, the controller never runs

// GET /api/admin/analytics
router.get(
    '/analytics',
    isLoggedIn, isAdmin,
    adminController.getAnalytics
);

// GET /api/admin/users
router.get(
    '/users',
    isLoggedIn, isAdmin,
    adminController.getAllUsers
);

// PUT /api/admin/users/:id/role
router.put(
    '/users/:id/role',
    isLoggedIn, isAdmin,
    adminController.updateUserRole
);

// GET /api/admin/claims
router.get(
    '/claims',
    isLoggedIn, isAdmin,
    adminController.getAllClaims
);

// GET /api/admin/lost-items
router.get(
    '/lost-items',
    isLoggedIn, isAdmin,
    adminController.getAllLostItemsAdmin
);

// GET /api/admin/found-items
router.get(
    '/found-items',
    isLoggedIn, isAdmin,
    adminController.getAllFoundItemsAdmin
);

module.exports = router;