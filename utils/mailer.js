// We're importing nodemailer — the package that sends emails
const nodemailer = require('nodemailer');

// A "transporter" is like setting up your email account in an email app
// You're telling nodemailer: "use Gmail, and here are the credentials"
const transporter = nodemailer.createTransport({
  service: 'gmail',               // tell nodemailer we're using Gmail
  auth: {
    user: process.env.EMAIL_USER, // your Gmail from .env
    pass: process.env.EMAIL_PASS  // your app password from .env
  }
});

// This is a reusable function — call it anywhere to send an email
// "to" = recipient email, "subject" = email title, "html" = email body
const sendEmail = async (to, subject, html) => {
  try {
    await transporter.sendMail({
      from: `"Smart Lost & Found" <${process.env.EMAIL_USER}>`, // sender name + email
      to,        // recipient
      subject,   // subject line
      html       // the body (we'll use HTML so it looks nice)
    });
    console.log(`Email sent to ${to}`);
  } catch (err) {
    // If email fails, we log it but don't crash the app
    // Notification still saves to DB even if email fails
    console.error('Email error:', err.message);
  }
};

// Export so other files can use it
module.exports = sendEmail;