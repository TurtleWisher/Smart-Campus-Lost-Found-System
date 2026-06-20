const db = require('../config/db');
const createNotification = require('../utils/notify'); // ← NEW: notification helper

// ══════════════════════════════════════════════════════
// HELPER FUNCTION 1: EXTRACT KEYWORDS FROM TEXT
// ══════════════════════════════════════════════════════
function extractKeywords(text) {
    if (!text) return [];

    const stopWords = new Set([
        'the','a','an','my','i','is','was','it','in','on',
        'at','to','of','and','or','this','that','near','its',
        'with','for','from','have','has','had','been','were',
        'lost','found','item','someone','something'
    ]);

    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(word =>
            word.length > 2 &&
            !stopWords.has(word)
        );
}

// ══════════════════════════════════════════════════════
// HELPER FUNCTION 2: KEYWORD OVERLAP SCORE
// ══════════════════════════════════════════════════════
function keywordOverlapScore(text1, text2) {
    const words1 = new Set(extractKeywords(text1));
    const words2 = new Set(extractKeywords(text2));

    if (words1.size === 0 && words2.size === 0) return 0;

    let overlapCount = 0;
    for (const word of words1) {
        if (words2.has(word)) overlapCount++;
    }

    const maxSize = Math.max(words1.size, words2.size, 1);
    return overlapCount / maxSize;
}

// ══════════════════════════════════════════════════════
// HELPER FUNCTION 3: CALCULATE MATCH SCORE
// ══════════════════════════════════════════════════════
function calculateMatchScore(lostItem, foundItem) {
    let score = 0;

    if (lostItem.category_id === foundItem.category_id) {
        score += 40;
    }

    if (
        lostItem.floor_no !== null &&
        foundItem.floor_no !== null &&
        lostItem.floor_no === foundItem.floor_no
    ) {
        score += 30;
    }

    const titleOverlap = keywordOverlapScore(lostItem.title, foundItem.title);
    score += Math.round(titleOverlap * 20);

    const descOverlap = keywordOverlapScore(
        lostItem.description,
        foundItem.description
    );
    score += Math.round(descOverlap * 10);

    return Math.min(Math.round(score), 100);
}

// ══════════════════════════════════════════════════════
// CORE ENGINE: RUN MATCHING FOR ONE SPECIFIC LOST ITEM
// Called when a new LOST item is posted.
// Compares it against all active found items.
// ══════════════════════════════════════════════════════
async function runMatchingForLostItem(lost_id) {
    const [lostRows] = await db.query(`
        SELECT 
            li.lost_id,
            li.user_id,
            li.category_id,
            li.title,
            li.description,
            l.floor_no
        FROM lost_items li
        JOIN locations l ON li.location_id = l.location_id
        WHERE li.lost_id = ? AND li.status = 'Lost'
    `, [lost_id]);

    if (lostRows.length === 0) return 0;
    const lostItem = lostRows[0];

    const [foundItems] = await db.query(`
        SELECT 
            fi.found_id,
            fi.category_id,
            fi.title,
            fi.description,
            l.floor_no
        FROM found_items fi
        JOIN locations l ON fi.location_id = l.location_id
        WHERE fi.status != 'Returned'
    `);

    let newMatchesCreated = 0;

    for (const foundItem of foundItems) {
        const score = calculateMatchScore(lostItem, foundItem);

        if (score < 40) continue;

        const [existing] = await db.query(
            `SELECT match_id FROM match_suggestions 
             WHERE lost_id = ? AND found_id = ?`,
            [lostItem.lost_id, foundItem.found_id]
        );

        if (existing.length > 0) continue;

        // Save the match suggestion
        await db.query(
            `INSERT INTO match_suggestions (lost_id, found_id, match_score)
             VALUES (?, ?, ?)`,
            [lostItem.lost_id, foundItem.found_id, score]
        );

        // ── NEW: Notify the person who lost the item ───
        // We tell them a match was found, with the score
        // and link them to the found item page
        await createNotification(
            lostItem.user_id,
            `A potential match (${score}% score) was found for your lost item: "${lostItem.title}". Check it out!`,
            foundItem.found_id
        );

        newMatchesCreated++;
    }

    return newMatchesCreated;
}

// ══════════════════════════════════════════════════════
// CORE ENGINE: RUN MATCHING FOR ONE SPECIFIC FOUND ITEM
// Called when a new FOUND item is posted.
// Compares it against all active lost items.
// ══════════════════════════════════════════════════════
async function runMatchingForFoundItem(found_id) {
    const [foundRows] = await db.query(`
        SELECT 
            fi.found_id,
            fi.category_id,
            fi.title,
            fi.description,
            l.floor_no
        FROM found_items fi
        JOIN locations l ON fi.location_id = l.location_id
        WHERE fi.found_id = ? AND fi.status != 'Returned'
    `, [found_id]);

    if (foundRows.length === 0) return 0;
    const foundItem = foundRows[0];

    const [lostItems] = await db.query(`
        SELECT 
            li.lost_id,
            li.user_id,
            li.category_id,
            li.title,
            li.description,
            l.floor_no
        FROM lost_items li
        JOIN locations l ON li.location_id = l.location_id
        WHERE li.status = 'Lost'
    `);

    let newMatchesCreated = 0;

    for (const lostItem of lostItems) {
        const score = calculateMatchScore(lostItem, foundItem);

        if (score < 40) continue;

        const [existing] = await db.query(
            `SELECT match_id FROM match_suggestions 
             WHERE lost_id = ? AND found_id = ?`,
            [lostItem.lost_id, foundItem.found_id]
        );

        if (existing.length > 0) continue;

        // Save the match suggestion
        await db.query(
            `INSERT INTO match_suggestions (lost_id, found_id, match_score)
             VALUES (?, ?, ?)`,
            [lostItem.lost_id, foundItem.found_id, score]
        );

        // ── NEW: Notify the person who lost the item ───
        // Even though a FOUND item triggered the match,
        // the notification still goes to the LOST item owner.
        // They are the ones waiting for news about their item.
        await createNotification(
            lostItem.user_id,
            `A potential match (${score}% score) was found for your lost item: "${lostItem.title}". Check it out!`,
            foundItem.found_id
        );

        newMatchesCreated++;
    }

    return newMatchesCreated;
}

// ══════════════════════════════════════════════════════
// API ROUTE FUNCTION 1: RUN MATCHING GLOBALLY
// Route: POST /api/matches/run
// Who: Admin only
// ══════════════════════════════════════════════════════
exports.runGlobalMatching = async (req, res) => {
    if (req.session.user.role !== 'admin') {
        return res.status(403).json({ 
            message: 'Only admins can run global matching' 
        });
    }

    try {
        const [lostItems] = await db.query(
            `SELECT lost_id FROM lost_items WHERE status = 'Lost'`
        );

        let totalNewMatches = 0;

        for (const item of lostItems) {
            const count = await runMatchingForLostItem(item.lost_id);
            totalNewMatches += count;
        }

        res.json({
            message: `Matching complete. ${totalNewMatches} new suggestion(s) created.`,
            new_matches: totalNewMatches
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error during matching' });
    }
};

// ══════════════════════════════════════════════════════
// API ROUTE FUNCTION 2: VIEW MY MATCHES
// Route: GET /api/matches/my-matches
// Who: Any logged-in user
// ══════════════════════════════════════════════════════
exports.getMyMatches = async (req, res) => {
    const user_id = req.session.user.user_id;

    try {
        const [rows] = await db.query(`
            SELECT
                ms.match_id,
                ms.match_score,
                ms.status AS match_status,
                ms.created_at,

                li.lost_id,
                li.title        AS lost_title,
                li.description  AS lost_description,
                li.date_lost,

                fi.found_id,
                fi.title        AS found_title,
                fi.description  AS found_description,
                fi.date_found,

                c.name          AS category_name,
                l.floor_no      AS found_floor,
                l.zone          AS found_zone,
                l.misc_location AS found_misc_location,

                u.name          AS finder_name,
                u.gsuite        AS finder_email

            FROM match_suggestions ms
            JOIN lost_items  li ON ms.lost_id  = li.lost_id
            JOIN found_items fi ON ms.found_id = fi.found_id
            JOIN categories  c  ON fi.category_id = c.category_id
            JOIN locations   l  ON fi.location_id = l.location_id
            JOIN users       u  ON fi.user_id = u.user_id
            WHERE li.user_id = ?
            ORDER BY ms.match_score DESC, ms.created_at DESC
        `, [user_id]);

        res.json(rows);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// ══════════════════════════════════════════════════════
// API ROUTE FUNCTION 3: GET MATCHES FOR ONE LOST ITEM
// Route: GET /api/matches/lost/:id
// Who: The owner of the lost item
// ══════════════════════════════════════════════════════
exports.getMatchesForLostItem = async (req, res) => {
    const user_id = req.session.user.user_id;
    const lost_id = req.params.id;

    try {
        const [rows] = await db.query(`
            SELECT
                ms.match_id,
                ms.match_score,
                ms.status AS match_status,
                ms.created_at,

                fi.found_id,
                fi.title        AS found_title,
                fi.description  AS found_description,
                fi.date_found,

                c.name          AS category_name,
                l.floor_no      AS found_floor,
                l.zone          AS found_zone,
                l.misc_location AS found_misc_location,

                u.name          AS finder_name,
                u.gsuite        AS finder_email
            FROM match_suggestions ms
            JOIN lost_items  li ON ms.lost_id  = li.lost_id
            JOIN found_items fi ON ms.found_id = fi.found_id
            JOIN categories  c  ON fi.category_id = c.category_id
            JOIN locations   l  ON fi.location_id = l.location_id
            JOIN users       u  ON fi.user_id = u.user_id
            WHERE ms.lost_id = ?
              AND li.user_id = ?
            ORDER BY ms.match_score DESC, ms.created_at DESC
        `, [lost_id, user_id]);

        res.json(rows);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// ══════════════════════════════════════════════════════
// API ROUTE FUNCTION 4: UPDATE MATCH STATUS
// Route: PUT /api/matches/:id/status
// Who: The owner of the lost item
// ══════════════════════════════════════════════════════
exports.updateMatchStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const user_id = req.session.user.user_id;

    if (!status || !['Confirmed', 'Rejected'].includes(status)) {
        return res.status(400).json({ 
            message: 'Status must be Confirmed or Rejected' 
        });
    }

    try {
        const [rows] = await db.query(
            `SELECT ms.*, li.user_id AS lost_item_owner
             FROM match_suggestions ms
             JOIN lost_items li ON ms.lost_id = li.lost_id
             WHERE ms.match_id = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Match suggestion not found' });
        }

        const match = rows[0];

        if (match.lost_item_owner !== user_id) {
            return res.status(403).json({ 
                message: 'You can only update suggestions for your own lost items' 
            });
        }

        await db.query(
            `UPDATE match_suggestions SET status = ? WHERE match_id = ?`,
            [status, id]
        );

        res.json({ message: `Match marked as ${status}` });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// ══════════════════════════════════════════════════════
// EXPORT ENGINE FUNCTIONS
// so lostController and foundController can call them
// ══════════════════════════════════════════════════════
exports.runMatchingForLostItem  = runMatchingForLostItem;
exports.runMatchingForFoundItem = runMatchingForFoundItem;