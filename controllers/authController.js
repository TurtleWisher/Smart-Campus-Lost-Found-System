// Import our database connection from config/db.js
const db = require('../config/db');

// Import bcryptjs — the password scrambler
const bcrypt = require('bcryptjs');

// =============================================
// REGISTER
// This function runs when someone hits
// POST /api/auth/register
// =============================================
exports.register = async (req, res) => {
    // req.body contains the data sent from
    // Postman or the HTML form
    // We pull out the fields we need
    const { name, user_type, type_specific_id, gsuite, password } = req.body;

    // Basic check — if any required field is missing
    // send back an error immediately
    if (!name || !gsuite || !password || !user_type) {
        return res.status(400).json({ 
            message: 'Name, gsuite, user type and password are required' 
        });
    }

    try {
        // Check if this email already exists in the database
        // We don't want two accounts with the same email
        const [existing] = await db.query(
            'SELECT * FROM users WHERE gsuite = ?', 
            [gsuite]
        );

        if (existing.length > 0) {
            return res.status(409).json({ 
                message: 'This email is already registered' 
            });
        }

        // Hash the password before saving
        // 10 means "salt rounds" — higher = more secure
        // bcrypt turns "test1234" into something like
        // "$2a$10$N9qo8uLOickgx2ZMRZo..." which is unreadable
        const hashedPassword = await bcrypt.hash(password, 10);

        // Save the new user into the database
        // Notice we save hashedPassword NOT the real password
        await db.query(
            `INSERT INTO users (name, user_type, type_specific_id, gsuite, password) 
             VALUES (?, ?, ?, ?, ?)`,
            [name, user_type, type_specific_id, gsuite, hashedPassword]
        );

        // Send success response back
        res.status(201).json({ 
            message: 'Registration successful!' 
        });

    } catch (err) {
        // If anything goes wrong, log it and
        // send a generic error to the user
        console.error(err);
        res.status(500).json({ message: 'Server error during registration' });
    }
};

// =============================================
// LOGIN
// This function runs when someone hits
// POST /api/auth/login
// =============================================
exports.login = async (req, res) => {
    const { gsuite, password } = req.body;

    try {
        // Find the user by their email in the database
        const [rows] = await db.query(
            'SELECT * FROM users WHERE gsuite = ?', 
            [gsuite]
        );

        // If no user found with that email
        // we use a vague message on purpose
        // We never want to tell hackers WHICH field was wrong
        if (rows.length === 0) {
            return res.status(401).json({ 
                message: 'Invalid email or password' 
            });
        }

        const user = rows[0];

        // bcrypt.compare checks if the password the user
        // typed matches the scrambled one in the database
        // It returns true or false
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ 
                message: 'Invalid email or password' 
            });
        }

        // Save user info into the session
        // This is how the server remembers who is logged in
        // The session is stored on the server side securely
        req.session.user = {
            user_id: user.user_id,
            name: user.name,
            gsuite: user.gsuite,
            role: user.role
        };

        res.json({ 
            message: 'Login successful!', 
            user: req.session.user 
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error during login' });
    }
};

// =============================================
// LOGOUT
// This function runs when someone hits
// POST /api/auth/logout
// =============================================
exports.logout = (req, res) => {
    // destroy() completely wipes the session
    // The server forgets this user immediately
    req.session.destroy(() => {
        res.json({ message: 'Logged out successfully' });
    });
};

// =============================================
// GET ME
// This function runs when someone hits
// GET /api/auth/me
// It returns info about whoever is logged in
// =============================================
exports.getMe = (req, res) => {
    // If there is no session user, nobody is logged in
    if (!req.session.user) {
        return res.status(401).json({ message: 'Not logged in' });
    }
    // Send back the logged in user's info
    res.json(req.session.user);
};