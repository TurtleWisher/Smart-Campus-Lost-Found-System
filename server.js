// dotenv reads our .env file and makes all your secrets
// available through process.env
require('dotenv').config();

// express is the framework that handles all incoming
// requests from the browser or Postman
const express = require('express');

// cors allows our HTML frontend pages to talk to this
// backend server without the browser blocking it
const cors = require('cors');

// express-session gives our server a memory
// so it remembers who is logged in between requests
const session = require('express-session');

// path is a built-in Node.js tool that helps build
// correct file paths across different operating systems
const path = require('path');

// This creates our Express application
// Think of this as turning the restaurant open for business
const app = express();

// =============================================
// MIDDLEWARE SECTION
// Middleware are like security checkpoints that
// every single request passes through BEFORE
// it reaches our routes
// =============================================

// 1. This allows our HTML frontend to communicate
//    with this backend. credentials:true means
//    session cookies are allowed to be sent too
app.use(cors({ origin: true, credentials: true }));

// 2. This tells Express to understand incoming
//    JSON data. Without this, req.body would be
//    undefined when Postman sends JSON to our server
app.use(express.json());

// 3. This tells Express to understand data coming
//    from HTML forms
app.use(express.urlencoded({ extended: true }));

// 4. This makes your public folder visible to the
//    browser. Any HTML file you put in /public can
//    be opened directly in the browser
app.use(express.static(path.join(__dirname, 'public')));

// 5. This sets up sessions — the memory system
//    secret: the key used to encrypt the session
//    resave: false means don't save session if nothing changed
//    saveUninitialized: false means don't create a session
//    until something is actually stored in it
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

// =============================================
// ROUTES SECTION
// This is where we connect our route files
// Each route file handles one group of URLs
// =============================================

// Import the auth routes file we created
const authRoutes = require('./routes/authRoutes');

// Tell Express: any URL starting with /api/auth
// should be handled by the authRoutes file
// Example: POST /api/auth/register
// Example: POST /api/auth/login
app.use('/api/auth', authRoutes);

// Lost items feature
const lostRoutes = require('./routes/lostRoutes');
app.use('/api/lost-items', lostRoutes);

// Found items feature
const foundRoutes = require('./routes/foundRoutes');
app.use('/api/found-items', foundRoutes);

// Categories route
// Returns all categories for dropdown menus
app.get('/api/categories', async (req, res) => {
    try {
        const db = require('./config/db');
        const [rows] = await db.query(
            'SELECT * FROM categories ORDER BY name'
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Locations route
// Returns all locations for dropdown menus
app.get('/api/locations', async (req, res) => {
    try {
        const db = require('./config/db');
        const [rows] = await db.query(
            'SELECT * FROM locations ORDER BY floor_no, zone'
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});
// =============================================
// START THE SERVER
// =============================================

// Read the PORT from .env file, or use 3000 as default
const PORT = process.env.PORT || 3000;

// This starts the server and makes it listen
// for incoming requests on the specified port
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});