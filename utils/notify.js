const db = require('../config/db');      // your existing MySQL connection
const sendEmail = require('./mailer');   // the mailer we just made

// This function does TWO things:
// 1. Saves the notification to the DB (for the bell icon)
// 2. Sends an email to the user
const createNotification = async (userId, message, itemId = null) => {
  try {
    // Step A: Save to notifications table in DB
    // This is what makes the bell badge show up
    await db.promise().query(
      'INSERT INTO notifications (user_id, message, item_id) VALUES (?, ?, ?)',
      [userId, message, itemId]
    );

    // Step B: Get the user's email so we know where to send
    const [rows] = await db.promise().query(
      'SELECT email, full_name FROM users WHERE id = ?',
      [userId]
    );

    // If user exists, send the email
    if (rows.length > 0) {
      const user = rows[0];

      // Build a clean HTML email body
      const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #4A90D9;">Smart Campus Lost & Found</h2>
          <p>Hi <strong>${user.full_name}</strong>,</p>
          <p>${message}</p>
          <p>Log in to your account to review the potential match.</p>
          <a href="http://localhost:3000/items/${itemId}" 
             style="background:#4A90D9;color:white;padding:10px 20px;
                    text-decoration:none;border-radius:5px;">
            View Match
          </a>
          <p style="margin-top:20px;color:#999;font-size:12px;">
            BRACU Lost & Found System
          </p>
        </div>
      `;

      // Send the actual email
      await sendEmail(user.email, 'Potential Match Found for Your Item!', html);
    }

  } catch (err) {
    console.error('Notification error:', err.message);
  }
};

module.exports = createNotification;