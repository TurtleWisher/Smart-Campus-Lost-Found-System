const express = require('express');
const router  = express.Router();
const db      = require('../config/db');

// =============================================
// MIDDLEWARE: REQUIRE LOGIN
// Every notification route needs the user to be
// logged in. If not, return 401 Unauthorized.
//
// req.session.user is set by your existing auth
// system when the user logs in.
// =============================================
function requireAuth(req, res, next) {
    // If session has no user, they are not logged in
    if (!req.session || !req.session.user) {
        return res.status(401).json({ message: 'Not logged in' });
    }
    // Otherwise continue to the actual route handler
    next();
}

// =============================================
// ROUTE 1: GET /api/notifications
// Who: Logged-in user
//
// Returns:
// {
//   notifications: [ ...array of notification rows ],
//   unreadCount: 3
// }
//
// The navbar calls this on every page load to:
// 1. Fill the dropdown list
// 2. Show the red badge number
// =============================================
router.get('/', requireAuth, async (req, res) => {
    // Get the logged-in user's ID from the session
    // Your users table uses user_id (not id) as primary key
    const userId = req.session.user.user_id;

    try {
        // Fetch the 20 most recent notifications for this user
        // We limit to 20 so the dropdown doesn't get too long
        // ORDER BY created_at DESC = newest first
        const [notifications] = await db.query(
            `SELECT * FROM notifications 
             WHERE user_id = ? 
             ORDER BY created_at DESC 
             LIMIT 20`,
            [userId]
        );

        // Count ONLY the unread ones — this is the red badge number
        // is_read = 0 means unread, is_read = 1 means already seen
        const [unreadResult] = await db.query(
            `SELECT COUNT(*) AS count 
             FROM notifications 
             WHERE user_id = ? AND is_read = 0`,
            [userId]
        );

        // unreadResult[0].count gives us the number
        res.json({
            notifications,
            unreadCount: unreadResult[0].count
        });

    } catch (err) {
        console.error('Error fetching notifications:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// =============================================
// ROUTE 2: POST /api/notifications/:id/read
// Who: Logged-in user
//
// Marks a single notification as read (is_read = 1)
// Called when the user clicks a notification row.
//
// Why we check user_id in the WHERE clause:
// Security — prevents user A from marking
// user B's notifications as read by guessing an ID.
// =============================================
router.post('/:id/read', requireAuth, async (req, res) => {
    const userId = req.session.user.user_id;
    const notifId = req.params.id; // the notification ID from the URL

    try {
        await db.query(
            `UPDATE notifications 
             SET is_read = 1 
             WHERE id = ? AND user_id = ?`,
            // ↑ Both conditions must match — security check
            [notifId, userId]
        );

        res.json({ success: true });

    } catch (err) {
        console.error('Error marking notification as read:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// =============================================
// ROUTE 3: POST /api/notifications/read-all
// Who: Logged-in user
//
// Marks ALL notifications as read at once.
// Useful for a "Mark all as read" button.
// =============================================
router.post('/read-all', requireAuth, async (req, res) => {
    const userId = req.session.user.user_id;

    try {
        await db.query(
            `UPDATE notifications 
             SET is_read = 1 
             WHERE user_id = ? AND is_read = 0`,
            [userId]
        );

        res.json({ success: true });

    } catch (err) {
        console.error('Error marking all as read:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;