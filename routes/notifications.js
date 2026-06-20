const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET /notifications — fetch all notifications for logged-in user
router.get('/', async (req, res) => {
  // req.session.user.id = the logged-in user (from your existing session auth)
  const userId = req.session.user.id;

  const [notifications] = await db.promise().query(
    // Get all notifications for this user, newest first
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
    [userId]
  );

  // Count only unread ones — this is the red badge number
  const [unread] = await db.promise().query(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
    [userId]
  );

  res.json({
    notifications,
    unreadCount: unread[0].count
  });
});

module.exports = router;