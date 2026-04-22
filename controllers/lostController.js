// Import database connection
// Every time we need to talk to MySQL we use this
const db = require('../config/db');

// =============================================
// GET ALL LOST ITEMS
// Route: GET /api/lost-items
// Who can use: Everyone (no login needed)
// =============================================
exports.getAllLostItems = async (req, res) => {
    try {
        // We use a JOIN query here
        // Why? Because lost_items table only stores
        // category_id and location_id (numbers)
        // But the user wants to see "Electronics" not "3"
        // and "8th Floor, Zone F" not "location_id 12"
        // JOIN connects multiple tables in one query
        const [rows] = await db.query(`
            SELECT 
                li.lost_id,
                li.title,
                li.description,
                li.date_lost,
                li.date_reported,
                li.status,
                u.name AS reporter_name,
                u.gsuite AS reporter_email,
                c.name AS category_name,
                l.floor_no,
                l.zone,
                l.room_no,
                l.misc_location
            FROM lost_items li
            JOIN users u ON li.user_id = u.user_id
            JOIN categories c ON li.category_id = c.category_id
            JOIN locations l ON li.location_id = l.location_id
            ORDER BY li.date_reported DESC
        `);

        // Send all rows back as JSON
        res.json(rows);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// =============================================
// GET ONE LOST ITEM BY ID
// Route: GET /api/lost-items/:id
// Who can use: Everyone
// =============================================
exports.getLostItemById = async (req, res) => {
    try {
        // req.params.id contains the ID from the URL
        // Example: /api/lost-items/5 → req.params.id = "5"
        const [rows] = await db.query(`
            SELECT 
                li.lost_id,
                li.title,
                li.description,
                li.date_lost,
                li.date_reported,
                li.status,
                u.name AS reporter_name,
                u.gsuite AS reporter_email,
                c.name AS category_name,
                l.floor_no,
                l.zone,
                l.room_no,
                l.misc_location
            FROM lost_items li
            JOIN users u ON li.user_id = u.user_id
            JOIN categories c ON li.category_id = c.category_id
            JOIN locations l ON li.location_id = l.location_id
            WHERE li.lost_id = ?
        `, [req.params.id]);

        // If no item found with that ID
        if (rows.length === 0) {
            return res.status(404).json({ 
                message: 'Lost item not found' 
            });
        }

        // Send the single item back
        res.json(rows[0]);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// =============================================
// CREATE A NEW LOST ITEM REPORT
// Route: POST /api/lost-items
// Who can use: Logged in users only
// =============================================
exports.createLostItem = async (req, res) => {
    // Pull out the fields the user sent in req.body
    const { 
        category_id, 
        location_id, 
        title, 
        description, 
        date_lost 
    } = req.body;

    // Get the logged in user's ID from the session
    // Remember — when someone logs in, we stored
    // their info in req.session.user
    // This is how we know WHO is creating this report
    const user_id = req.session.user.user_id;

    // Basic validation — make sure required fields exist
    if (!category_id || !location_id || !title || !date_lost) {
        return res.status(400).json({ 
            message: 'Category, location, title and date are required' 
        });
    }

    try {
        // Insert the new lost item into the database
        // We don't insert status — it defaults to 'Lost' automatically
        // We don't insert date_reported — it defaults to NOW() automatically
        const [result] = await db.query(`
            INSERT INTO lost_items 
                (user_id, category_id, location_id, title, description, date_lost)
            VALUES 
                (?, ?, ?, ?, ?, ?)
        `, [user_id, category_id, location_id, title, description, date_lost]);

        // result.insertId is the auto-generated ID
        // of the row that was just created
        // Very useful to send back so the frontend
        // knows the ID of the newly created item
        res.status(201).json({ 
            message: 'Lost item reported successfully',
            lost_id: result.insertId
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// =============================================
// UPDATE A LOST ITEM
// Route: PUT /api/lost-items/:id
// Who can use: Only the owner OR an admin
// =============================================
exports.updateLostItem = async (req, res) => {
    const { 
        title, 
        description, 
        date_lost, 
        category_id, 
        location_id, 
        status 
    } = req.body;

    // Who is making this request?
    const requesting_user_id = req.session.user.user_id;
    const requesting_user_role = req.session.user.role;

    try {
        // First — find the item to check if it exists
        // and who owns it
        const [rows] = await db.query(
            'SELECT * FROM lost_items WHERE lost_id = ?', 
            [req.params.id]
        );

        // Item doesn't exist
        if (rows.length === 0) {
            return res.status(404).json({ 
                message: 'Lost item not found' 
            });
        }

        const item = rows[0];

        // OWNERSHIP CHECK
        // Only the person who created this item
        // OR an admin can edit it
        // item.user_id is who owns it
        // requesting_user_id is who is trying to edit
        if (item.user_id !== requesting_user_id && 
            requesting_user_role !== 'admin') {
            return res.status(403).json({ 
                message: 'You are not allowed to edit this post' 
            });
        }

        // If we reach here — person is authorized
        // Now update the item
        await db.query(`
            UPDATE lost_items 
            SET 
                title = ?,
                description = ?,
                date_lost = ?,
                category_id = ?,
                location_id = ?,
                status = ?
            WHERE lost_id = ?
        `, [title, description, date_lost, 
            category_id, location_id, status, 
            req.params.id]);

        res.json({ message: 'Lost item updated successfully' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// =============================================
// DELETE A LOST ITEM
// Route: DELETE /api/lost-items/:id
// Who can use: Only the owner OR an admin
// =============================================
exports.deleteLostItem = async (req, res) => {
    const requesting_user_id = req.session.user.user_id;
    const requesting_user_role = req.session.user.role;

    try {
        // Find the item first
        const [rows] = await db.query(
            'SELECT * FROM lost_items WHERE lost_id = ?', 
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ 
                message: 'Lost item not found' 
            });
        }

        const item = rows[0];

        // Same ownership check as update
        if (item.user_id !== requesting_user_id && 
            requesting_user_role !== 'admin') {
            return res.status(403).json({ 
                message: 'You are not allowed to delete this post' 
            });
        }

        // Delete the item
        await db.query(
            'DELETE FROM lost_items WHERE lost_id = ?', 
            [req.params.id]
        );

        res.json({ message: 'Lost item deleted successfully' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// =============================================
// SEARCH LOST ITEMS
// Route: GET /api/lost-items/search
// Who can use: Everyone
// Supports filters: keyword, category_id, floor_no
// =============================================
exports.searchLostItems = async (req, res) => {
    // Query parameters come from the URL after ?
    // Example: /api/lost-items/search?keyword=phone&floor_no=8
    // req.query.keyword = "phone"
    // req.query.floor_no = "8"
    const { keyword, category_id, floor_no } = req.query;

    // We build the SQL query dynamically
    // based on which filters were provided
    // WHERE 1=1 is a trick — it's always true
    // so we can keep adding AND conditions safely
    let query = `
        SELECT 
            li.lost_id,
            li.title,
            li.description,
            li.date_lost,
            li.status,
            c.name AS category_name,
            l.floor_no,
            l.zone,
            l.room_no,
            l.misc_location
        FROM lost_items li
        JOIN categories c ON li.category_id = c.category_id
        JOIN locations l ON li.location_id = l.location_id
        WHERE 1=1
    `;

    // params array holds the values for our ? placeholders
    const params = [];

    // Only add keyword filter if keyword was provided
    if (keyword) {
        query += ` AND (li.title LIKE ? OR li.description LIKE ?)`;
        // % means "anything can be here"
        // So %phone% matches "my phone", "phone charger", "old phone"
        params.push(`%${keyword}%`, `%${keyword}%`);
    }

    // Only add category filter if category_id was provided
    if (category_id) {
        query += ` AND li.category_id = ?`;
        params.push(category_id);
    }

    // Only add floor filter if floor_no was provided
    if (floor_no) {
        query += ` AND l.floor_no = ?`;
        params.push(floor_no);
    }

    query += ` ORDER BY li.date_reported DESC`;

    try {
        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};