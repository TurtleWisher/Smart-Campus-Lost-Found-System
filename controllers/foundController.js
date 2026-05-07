const db = require('../config/db');

const { runMatchingForFoundItem } = require('./matchController');

// =============================================
// GET ALL FOUND ITEMS
// Route: GET /api/found-items
// Who can use: Everyone
// =============================================
exports.getAllFoundItems = async (req, res) => {
    try {
        // Same JOIN pattern as lost items
        // We connect found_items to users, categories
        // and locations to get full readable information
        // instead of just ID numbers
        const [rows] = await db.query(`
            SELECT 
                fi.found_id,
                fi.title,
                fi.description,
                fi.date_found,
                fi.date_reported,
                fi.status,
                u.name AS reporter_name,
                u.gsuite AS reporter_email,
                c.name AS category_name,
                l.floor_no,
                l.zone,
                l.room_no,
                l.misc_location
            FROM found_items fi
            JOIN users u ON fi.user_id = u.user_id
            JOIN categories c ON fi.category_id = c.category_id
            JOIN locations l ON fi.location_id = l.location_id
            ORDER BY fi.date_reported DESC
        `);

        res.json(rows);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// =============================================
// GET ONE FOUND ITEM BY ID
// Route: GET /api/found-items/:id
// Who can use: Everyone
// =============================================
exports.getFoundItemById = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                fi.found_id,
                fi.title,
                fi.description,
                fi.date_found,
                fi.date_reported,
                fi.status,
                u.name AS reporter_name,
                u.gsuite AS reporter_email,
                c.name AS category_name,
                l.floor_no,
                l.zone,
                l.room_no,
                l.misc_location
            FROM found_items fi
            JOIN users u ON fi.user_id = u.user_id
            JOIN categories c ON fi.category_id = c.category_id
            JOIN locations l ON fi.location_id = l.location_id
            WHERE fi.found_id = ?
        `, [req.params.id]);

        if (rows.length === 0) {
            return res.status(404).json({ 
                message: 'Found item not found' 
            });
        }

        res.json(rows[0]);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// =============================================
// CREATE A NEW FOUND ITEM REPORT
// Route: POST /api/found-items
// Who can use: Logged in users only
// =============================================
exports.createFoundItem = async (req, res) => {
    const { 
        category_id, 
        location_id, 
        title, 
        description, 
        date_found          
    } = req.body;

    // Get logged in user's ID from session
    const user_id = req.session.user.user_id;

    // Validate required fields
    if (!category_id || !location_id || !title || !date_found) {
        return res.status(400).json({ 
            message: 'Category, location, title and date are required' 
        });
    }

    try {
        // Notice date_found instead of date_lost
        // Everything else is identical to createLostItem
        // status defaults to 'Found' automatically
        // date_reported defaults to NOW() automatically
        const [result] = await db.query(`
            INSERT INTO found_items 
                (user_id, category_id, location_id, title, description, date_found)
            VALUES 
                (?, ?, ?, ?, ?, ?)
        `, [user_id, category_id, location_id, title, description, date_found]);

       const newFoundId = result.insertId;

        // Auto-trigger matching in the background
        runMatchingForFoundItem(newFoundId).catch(err =>
            console.error('Auto-matching error:', err)
        );

        res.status(201).json({ 
            message: 'Found item reported successfully',
            found_id: newFoundId
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// =============================================
// UPDATE A FOUND ITEM
// Route: PUT /api/found-items/:id
// Who can use: Only the owner OR an admin
// =============================================
exports.updateFoundItem = async (req, res) => {
    const { 
        title, 
        description, 
        date_found, 
        category_id, 
        location_id, 
        status 
    } = req.body;

    const requesting_user_id = req.session.user.user_id;
    const requesting_user_role = req.session.user.role;

    try {
        // First find the item to verify it exists
        // and check who owns it
        const [rows] = await db.query(
            'SELECT * FROM found_items WHERE found_id = ?',
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ 
                message: 'Found item not found' 
            });
        }

        const item = rows[0];

        // Ownership check
        // Only the finder who reported it OR an admin
        // can edit this post
        if (item.user_id !== requesting_user_id && 
            requesting_user_role !== 'admin') {
            return res.status(403).json({ 
                message: 'You are not allowed to edit this post' 
            });
        }

        await db.query(`
            UPDATE found_items 
            SET 
                title = ?,
                description = ?,
                date_found = ?,
                category_id = ?,
                location_id = ?,
                status = ?
            WHERE found_id = ?
        `, [title, description, date_found, 
            category_id, location_id, status, 
            req.params.id]);

        res.json({ message: 'Found item updated successfully' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// =============================================
// DELETE A FOUND ITEM
// Route: DELETE /api/found-items/:id
// Who can use: Only the owner OR an admin
// =============================================
exports.deleteFoundItem = async (req, res) => {
    const requesting_user_id = req.session.user.user_id;
    const requesting_user_role = req.session.user.role;

    try {
        const [rows] = await db.query(
            'SELECT * FROM found_items WHERE found_id = ?', 
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ 
                message: 'Found item not found' 
            });
        }

        const item = rows[0];

        if (item.user_id !== requesting_user_id && 
            requesting_user_role !== 'admin') {
            return res.status(403).json({ 
                message: 'You are not allowed to delete this post' 
            });
        }

        await db.query(
            'DELETE FROM found_items WHERE found_id = ?', 
            [req.params.id]
        );

        res.json({ message: 'Found item deleted successfully' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// =============================================
// SEARCH FOUND ITEMS
// Route: GET /api/found-items/search
// Who can use: Everyone
// =============================================
exports.searchFoundItems = async (req, res) => {
    const { keyword, category_id, floor_no } = req.query;

    // Same dynamic query building pattern
    // as searchLostItems
    let query = `
        SELECT 
            fi.found_id,
            fi.title,
            fi.description,
            fi.date_found,
            fi.status,
            c.name AS category_name,
            l.floor_no,
            l.zone,
            l.room_no,
            l.misc_location
        FROM found_items fi
        JOIN categories c ON fi.category_id = c.category_id
        JOIN locations l ON fi.location_id = l.location_id
        WHERE 1=1
    `;

    const params = [];

    if (keyword) {
        query += ` AND (fi.title LIKE ? OR fi.description LIKE ?)`;
        params.push(`%${keyword}%`, `%${keyword}%`);
    }

    if (category_id) {
        query += ` AND fi.category_id = ?`;
        params.push(category_id);
    }

    if (floor_no) {
        query += ` AND l.floor_no = ?`;
        params.push(floor_no);
    }

    query += ` ORDER BY fi.date_reported DESC`;

    try {
        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};