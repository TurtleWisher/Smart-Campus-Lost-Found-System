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

const notificationRoutes = require('./routes/notificationRoutes');
app.use('/api/notifications', notificationRoutes);

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

// uploads folder is where multer saves uploaded files

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 5. This sets up sessions — the memory system
//    secret: the key used to encrypt the session
//    resave: false means don't save session if nothing changed
//    saveUninitialized: false means don't create a session
//    until something is actually stored in it
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production' }
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

// Claims feature
const claimsRoutes = require('./routes/claimsRoutes');
app.use('/api/claims', claimsRoutes);

// Matching feature
const matchRoutes = require('./routes/matchRoutes');
app.use('/api/matches', matchRoutes);

// Admin feature
const adminRoutes = require('./routes/adminRoutes');
app.use('/api/admin', adminRoutes);

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

// ─── ADMIN ROUTES ────────────────────────────────────────────────────────────

// Helper: check admin
function adminOnly(req, res) {
    if (!req.session.user || req.session.user.role !== 'admin') {
        res.status(403).json({ message: 'Admin only' });
        return false;
    }
    return true;
}

// ANALYTICS — all fields your dashboard needs
app.get('/api/admin/analytics', async (req, res) => {
    if (!adminOnly(req, res)) return;
    try {
        const db = require('./config/db');
        const [[{ total_users }]]    = await db.query('SELECT COUNT(*) AS total_users FROM users');
        const [[{ total_lost }]]     = await db.query('SELECT COUNT(*) AS total_lost FROM lost_items');
        const [[{ active_lost }]]    = await db.query("SELECT COUNT(*) AS active_lost FROM lost_items WHERE status = 'Lost'");
        const [[{ total_found }]]    = await db.query('SELECT COUNT(*) AS total_found FROM found_items');
        const [[{ pending_claims }]] = await db.query("SELECT COUNT(*) AS pending_claims FROM claims WHERE status = 'Pending'");
        const [[{ returned_items }]] = await db.query("SELECT COUNT(*) AS returned_items FROM found_items WHERE status = 'Returned'");
        const [[{ total_matches }]]  = await db.query('SELECT COUNT(*) AS total_matches FROM match_suggestions');
        const [[{ resolved }]]       = await db.query("SELECT COUNT(*) AS resolved FROM claims WHERE status = 'Approved'");
        console.log('analytics:', { total_users, total_lost, active_lost, total_found, pending_claims, returned_items, total_matches, resolved });
        res.json({ total_users, total_lost, active_lost, total_found, pending_claims, returned_items, total_matches, resolved });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ALL USERS — includes student_id
app.get('/api/admin/users', async (req, res) => {
    if (!adminOnly(req, res)) return;
    try {
        const db = require('./config/db');
        const [rows] = await db.query(
            'SELECT user_id, name, gsuite, role, user_type, type_specific_id AS student_id, created_at FROM users ORDER BY created_at DESC'
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// UPDATE USER ROLE — Make Admin / Remove Admin
app.put('/api/admin/users/:id/role', async (req, res) => {
    if (!adminOnly(req, res)) return;
    const { role } = req.body;
    if (!['admin', 'general_user'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
    }
    try {
        const db = require('./config/db');
        await db.query(
            'UPDATE users SET role = ? WHERE user_id = ?',
            [role, req.params.id]
        );
        res.json({ message: 'Role updated successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// ALL CLAIMS — includes reviewer_name
app.get('/api/admin/claims', async (req, res) => {
    if (!adminOnly(req, res)) return;
    try {
        const db = require('./config/db');
        const [rows] = await db.query(`
            SELECT 
                c.claim_id,
                c.claim_date,
                c.status,
                c.review_date,
                c.review_notes,
                c.found_id,
                u.name  AS claimant_name,
                u.gsuite AS claimant_email,
                fi.title AS item_title,
                r.name   AS reviewer_name
            FROM claims c
            JOIN users u        ON c.claimant_id = u.user_id
            JOIN found_items fi  ON c.found_id   = fi.found_id
            LEFT JOIN users r   ON c.reviewer_id = r.user_id
            ORDER BY c.claim_date DESC
        `);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ALL LOST ITEMS (admin view)
app.get('/api/admin/lost-items', async (req, res) => {
    if (!adminOnly(req, res)) return;
    try {
        const db = require('./config/db');
        const [rows] = await db.query(`
            SELECT 
                li.lost_id,
                li.title,
                li.date_lost,
                li.date_reported,
                li.status,
                u.name  AS reporter_name,
                u.gsuite AS reporter_email,
                c.name  AS category_name,
                l.floor_no,
                l.zone,
                l.room_no,
                l.misc_location
            FROM lost_items li
            JOIN users u       ON li.user_id      = u.user_id
            JOIN categories c  ON li.category_id  = c.category_id
            JOIN locations l   ON li.location_id  = l.location_id
            ORDER BY li.date_reported DESC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// ALL FOUND ITEMS (admin view)
app.get('/api/admin/found-items', async (req, res) => {
    if (!adminOnly(req, res)) return;
    try {
        const db = require('./config/db');
        const [rows] = await db.query(`
            SELECT 
                fi.found_id,
                fi.title,
                fi.date_found,
                fi.date_reported,
                fi.status,
                u.name  AS reporter_name,
                u.gsuite AS reporter_email,
                c.name  AS category_name,
                l.floor_no,
                l.zone,
                l.room_no,
                l.misc_location
            FROM found_items fi
            JOIN users u       ON fi.user_id      = u.user_id
            JOIN categories c  ON fi.category_id  = c.category_id
            JOIN locations l   ON fi.location_id  = l.location_id
            ORDER BY fi.date_reported DESC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});
// This starts the server and makes it listen
// for incoming requests on the specified port
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});


