const db = require('../config/db');

// ══════════════════════════════════════════════════════
// GET ANALYTICS
// Route: GET /api/admin/analytics
// Who: Admin only
//
// Returns a single object with counts of everything
// in the system. These become the numbers on the
// dashboard cards.
// ══════════════════════════════════════════════════════
exports.getAnalytics = async (req, res) => {
    try {
        // We run multiple COUNT queries at once using subqueries
        // This is more efficient than making 6 separate queries
        // Each subquery counts rows matching certain conditions
        const [rows] = await db.query(`
            SELECT
                -- How many registered users total?
                (SELECT COUNT(*) FROM users) 
                    AS total_users,

                -- How many lost item reports total?
                (SELECT COUNT(*) FROM lost_items) 
                    AS total_lost,

                -- How many lost items are still unresolved?
                (SELECT COUNT(*) FROM lost_items WHERE status = 'Lost') 
                    AS active_lost,

                -- How many found item reports total?
                (SELECT COUNT(*) FROM found_items) 
                    AS total_found,

                -- How many claims have been submitted total?
                (SELECT COUNT(*) FROM claims) 
                    AS total_claims,

                -- How many claims are still waiting for review?
                (SELECT COUNT(*) FROM claims WHERE status = 'Pending') 
                    AS pending_claims,

                -- How many items have been successfully returned?
                (SELECT COUNT(*) FROM found_items WHERE status = 'Returned') 
                    AS returned_items,

                -- How many match suggestions has the system generated?
                (SELECT COUNT(*) FROM match_suggestions) 
                    AS total_matches
        `);

        // rows[0] is the single result row containing all the counts
        res.json(rows[0]);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// ══════════════════════════════════════════════════════
// GET ALL USERS
// Route: GET /api/admin/users
// Who: Admin only
//
// Returns every user in the system.
// Notice we do NOT return the password column —
// even hashed passwords should never be sent
// over the network unnecessarily.
// ══════════════════════════════════════════════════════
exports.getAllUsers = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                user_id,
                name,
                gsuite,
                role,
                user_type,
                student_id,
                created_at
            FROM users
            ORDER BY created_at DESC
        `);
        // Newest accounts appear first

        res.json(rows);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};


// ══════════════════════════════════════════════════════
// UPDATE USER ROLE
// Route: PUT /api/admin/users/:id/role
// Who: Admin only
//
// Promotes a general_user to admin,
// or demotes an admin back to general_user.
//
// Safety: Admin cannot demote themselves.
// That would be like a building owner locking
// themselves out of their own server room.
// ══════════════════════════════════════════════════════
exports.updateUserRole = async (req, res) => {
    const { id } = req.params;    // which user to update
    const { role } = req.body;    // the new role value
    const admin_id = req.session.user.user_id; // who is making this request

    // Validate — role must be one of these two exact values
    if (!role || !['general_user', 'admin'].includes(role)) {
        return res.status(400).json({ 
            message: 'Role must be general_user or admin' 
        });
    }

    // Safety check — prevent admin from changing their OWN role
    // Converting id to number because req.params gives a string
    if (parseInt(id) === admin_id) {
        return res.status(400).json({ 
            message: 'You cannot change your own role' 
        });
    }

    try {
        // Check the target user exists
        const [rows] = await db.query(
            'SELECT user_id, name FROM users WHERE user_id = ?',
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update the role
        await db.query(
            'UPDATE users SET role = ? WHERE user_id = ?',
            [role, id]
        );

        res.json({ 
            message: `${rows[0].name}'s role updated to ${role}` 
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// ══════════════════════════════════════════════════════
// GET ALL CLAIMS (SYSTEM-WIDE)
// Route: GET /api/admin/claims
// Who: Admin only
//
// Unlike the regular claims endpoint which only shows
// claims for ONE specific found item, this shows
// EVERY claim in the entire system.
// Admins need the full picture.
// ══════════════════════════════════════════════════════
exports.getAllClaims = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT
                c.claim_id,
                c.claim_date,
                c.status,
                c.review_notes,
                c.review_date,

                -- Who submitted this claim?
                claimant.name   AS claimant_name,
                claimant.gsuite AS claimant_email,

                -- Which found item is being claimed?
                fi.found_id,
                fi.title        AS item_title,
                fi.status       AS item_status,

                -- Who reviewed the claim? (may be null if Pending)
                reviewer.name   AS reviewer_name

            FROM claims c

            -- Join to get the claimant's name
            JOIN users claimant 
                ON c.claimant_id = claimant.user_id

            -- Join to get the found item's title
            JOIN found_items fi 
                ON c.found_id = fi.found_id

            -- LEFT JOIN for reviewer — claim may not have a reviewer yet
            -- Regular JOIN would hide all Pending claims (no reviewer = no row)
            -- LEFT JOIN keeps the row and just puts NULL for reviewer columns
            LEFT JOIN users reviewer 
                ON c.reviewer_id = reviewer.user_id

            ORDER BY c.claim_date DESC
        `);

        res.json(rows);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// ══════════════════════════════════════════════════════
// GET ALL LOST ITEMS (SYSTEM-WIDE)
// Route: GET /api/admin/lost-items
// Who: Admin only
//
// The regular GET /api/lost-items shows all items too,
// but this admin version includes the user_id column
// and any extra info useful for admin oversight.
// ══════════════════════════════════════════════════════
exports.getAllLostItemsAdmin = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT
                li.lost_id,
                li.title,
                li.description,
                li.date_lost,
                li.date_reported,
                li.status,
                u.name    AS reporter_name,
                u.gsuite  AS reporter_email,
                c.name    AS category_name,
                l.floor_no,
                l.zone,
                l.misc_location
            FROM lost_items li
            JOIN users      u  ON li.user_id      = u.user_id
            JOIN categories c  ON li.category_id  = c.category_id
            JOIN locations  l  ON li.location_id  = l.location_id
            ORDER BY li.date_reported DESC
        `);

        res.json(rows);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// ══════════════════════════════════════════════════════
// GET ALL FOUND ITEMS (SYSTEM-WIDE)
// Route: GET /api/admin/found-items
// Who: Admin only
// ══════════════════════════════════════════════════════
exports.getAllFoundItemsAdmin = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT
                fi.found_id,
                fi.title,
                fi.description,
                fi.date_found,
                fi.date_reported,
                fi.status,
                u.name    AS reporter_name,
                u.gsuite  AS reporter_email,
                c.name    AS category_name,
                l.floor_no,
                l.zone,
                l.misc_location
            FROM found_items fi
            JOIN users      u  ON fi.user_id      = u.user_id
            JOIN categories c  ON fi.category_id  = c.category_id
            JOIN locations  l  ON fi.location_id  = l.location_id
            ORDER BY fi.date_reported DESC
        `);

        res.json(rows);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};