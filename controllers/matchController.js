const db = require('../config/db');

// ══════════════════════════════════════════════════════
// HELPER FUNCTION 1: EXTRACT KEYWORDS FROM TEXT
//
// This turns a sentence into a list of meaningful words.
// We remove tiny words like "the", "a", "my" because they
// appear in everything and give false matches.
//
// Example:
// Input:  "I lost my black Samsung phone near the cafeteria"
// Output: ["lost", "black", "samsung", "phone", "near", "cafeteria"]
// ══════════════════════════════════════════════════════
function extractKeywords(text) {
    if (!text) return []; // if text is null or empty, return empty list

    // Words so common they mean nothing for matching
    const stopWords = new Set([
        'the','a','an','my','i','is','was','it','in','on',
        'at','to','of','and','or','this','that','near','its',
        'with','for','from','have','has','had','been','were',
        'lost','found','item','someone','something'
    ]);

    return text
        .toLowerCase()                    // "Samsung" → "samsung"
        .replace(/[^a-z0-9\s]/g, '')      // remove punctuation: "phone," → "phone"
        .split(/\s+/)                      // split into words by whitespace
        .filter(word =>
            word.length > 2 &&            // ignore tiny words like "is", "at"
            !stopWords.has(word)           // ignore stop words
        );
}

// ══════════════════════════════════════════════════════
// HELPER FUNCTION 2: KEYWORD OVERLAP SCORE
//
// Compares two texts and returns a number between 0 and 1
// showing how much they share in common.
//
// Example:
// text1: "black samsung galaxy phone"    → ["black","samsung","galaxy","phone"]
// text2: "samsung phone found corridor"  → ["samsung","phone","found","corridor"]
// Overlap: ["samsung", "phone"] = 2 words match
// Score: 2 / max(4, 4) = 0.5 (50% overlap)
// ══════════════════════════════════════════════════════
function keywordOverlapScore(text1, text2) {
    const words1 = new Set(extractKeywords(text1));
    const words2 = new Set(extractKeywords(text2));

    // If both texts have no meaningful words, no match
    if (words1.size === 0 && words2.size === 0) return 0;

    // Count how many words from text1 also appear in text2
    let overlapCount = 0;
    for (const word of words1) {
        if (words2.has(word)) overlapCount++;
    }

    // Divide by the larger set size to normalize the score
    // Using Math.max prevents division by zero
    const maxSize = Math.max(words1.size, words2.size, 1);
    return overlapCount / maxSize;
}

// ══════════════════════════════════════════════════════
// HELPER FUNCTION 3: CALCULATE MATCH SCORE
//
// Takes one lost item and one found item.
// Returns a score from 0 to 100.
//
// lostItem  = { lost_id, category_id, title, description, floor_no }
// foundItem = { found_id, category_id, title, description, floor_no }
// ══════════════════════════════════════════════════════
function calculateMatchScore(lostItem, foundItem) {
    let score = 0;

    // ── Factor 1: Same category? ───────────────────────
    // category_id 1 = Electronics, 2 = ID Cards, etc.
    // If both items are in the same category: +40 points
    if (lostItem.category_id === foundItem.category_id) {
        score += 40;
    }

    // ── Factor 2: Same floor? ──────────────────────────
    // floor_no comes from the locations table via JOIN
    // Both items must have a floor_no (not null) AND they must match
    if (
        lostItem.floor_no !== null &&
        foundItem.floor_no !== null &&
        lostItem.floor_no === foundItem.floor_no
    ) {
        score += 30;
    }

    // ── Factor 3: Title keyword overlap ───────────────
    // Returns 0.0 to 1.0 → multiply by 20 → gives 0 to 20 points
    const titleOverlap = keywordOverlapScore(lostItem.title, foundItem.title);
    score += Math.round(titleOverlap * 20);

    // ── Factor 4: Description keyword overlap ─────────
    // Returns 0.0 to 1.0 → multiply by 10 → gives 0 to 10 points
    const descOverlap = keywordOverlapScore(
        lostItem.description,
        foundItem.description
    );
    score += Math.round(descOverlap * 10);

    // Cap at 100 just in case floating point math gives 100.0001
    return Math.min(Math.round(score), 100);
}

// ══════════════════════════════════════════════════════
// CORE ENGINE: RUN MATCHING FOR ONE SPECIFIC LOST ITEM
//
// This is NOT an API route — it is an internal function
// called by other parts of the code.
//
// What it does:
// 1. Takes a lost_id
// 2. Gets that lost item's details from DB
// 3. Gets ALL active found items from DB
// 4. Scores each lost+found pair
// 5. Saves suggestions where score >= 40
// 6. Skips pairs that already have a suggestion
//
// Returns how many new suggestions were created.
// ══════════════════════════════════════════════════════
async function runMatchingForLostItem(lost_id) {
    // ── Get the lost item with its location info ───────
    // We JOIN locations so we can compare floor numbers
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

    // If item not found or no longer 'Lost', stop
    if (lostRows.length === 0) return 0;
    const lostItem = lostRows[0];

    // ── Get ALL active found items with location info ──
    // We only match against items that are still 'Found' (not Returned)
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

    // ── Compare lost item against every found item ─────
    for (const foundItem of foundItems) {

        // Calculate the match score for this pair
        const score = calculateMatchScore(lostItem, foundItem);

        // If score is below our threshold (40), skip this pair
        // 40 means at least one major factor matched
        if (score < 40) continue;

        // Check if a suggestion already exists for this exact pair
        // We never want duplicate rows for the same lost_id + found_id
        const [existing] = await db.query(
            `SELECT match_id FROM match_suggestions 
             WHERE lost_id = ? AND found_id = ?`,
            [lostItem.lost_id, foundItem.found_id]
        );

        if (existing.length > 0) {
            // This pair was already suggested before — skip it
            continue;
        }

        // Save the new match suggestion to the database
        // status defaults to 'Suggested' automatically
        await db.query(
            `INSERT INTO match_suggestions (lost_id, found_id, match_score)
             VALUES (?, ?, ?)`,
            [lostItem.lost_id, foundItem.found_id, score]
        );

        newMatchesCreated++;
    }

    return newMatchesCreated;
}

// ══════════════════════════════════════════════════════
// CORE ENGINE: RUN MATCHING FOR ONE SPECIFIC FOUND ITEM
//
// Mirror of the function above but in reverse.
// Called when a new FOUND item is created.
// Compares the new found item against all active lost items.
// ══════════════════════════════════════════════════════
async function runMatchingForFoundItem(found_id) {
    // Get the newly created found item with location info
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

    // Get ALL active lost items with location info
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

        // Check for existing suggestion
        const [existing] = await db.query(
            `SELECT match_id FROM match_suggestions 
             WHERE lost_id = ? AND found_id = ?`,
            [lostItem.lost_id, foundItem.found_id]
        );

        if (existing.length > 0) continue;

        await db.query(
            `INSERT INTO match_suggestions (lost_id, found_id, match_score)
             VALUES (?, ?, ?)`,
            [lostItem.lost_id, foundItem.found_id, score]
        );

        newMatchesCreated++;
    }

    return newMatchesCreated;
}

// ══════════════════════════════════════════════════════
// API ROUTE FUNCTION 1: RUN MATCHING GLOBALLY
// Route: POST /api/matches/run
// Who: Admin only
//
// This manually triggers matching for ALL lost items
// against ALL found items. Useful for the admin to
// run a full sweep of the database at any time.
// ══════════════════════════════════════════════════════
exports.runGlobalMatching = async (req, res) => {
    // Only admins can trigger a full global sweep
    if (req.session.user.role !== 'admin') {
        return res.status(403).json({ 
            message: 'Only admins can run global matching' 
        });
    }

    try {
        // Get all currently active lost items
        const [lostItems] = await db.query(
            `SELECT lost_id FROM lost_items WHERE status = 'Lost'`
        );

        let totalNewMatches = 0;

        // Run matching for each lost item one by one
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
//
// Shows all match suggestions for the logged-in user's
// lost items. Only the person who LOST something sees
// suggestions — it is their job to check them.
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

                -- Lost item info (the user's own lost item)
                li.lost_id,
                li.title        AS lost_title,
                li.description  AS lost_description,
                li.date_lost,

                -- Found item info (the potential match)
                fi.found_id,
                fi.title        AS found_title,
                fi.description  AS found_description,
                fi.date_found,

                -- Found item category and location (for display)
                c.name          AS category_name,
                l.floor_no      AS found_floor,
                l.zone          AS found_zone,
                l.misc_location AS found_misc_location,

                -- Who found it (so the user can contact them)
                u.name          AS finder_name,
                u.gsuite        AS finder_email

            FROM match_suggestions ms

            -- Join to get the lost item details
            JOIN lost_items  li ON ms.lost_id  = li.lost_id
            -- Join to get the found item details
            JOIN found_items fi ON ms.found_id = fi.found_id
            -- Join to get the found item's category name
            JOIN categories  c  ON fi.category_id = c.category_id
            -- Join to get the found item's location
            JOIN locations   l  ON fi.location_id = l.location_id
            -- Join to get the finder's name and email
            JOIN users       u  ON fi.user_id = u.user_id

            -- Only show matches for THIS user's lost items
            WHERE li.user_id = ?

            -- Show highest confidence matches first
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
//
// Returns only suggestions for the specific lost report.
// Helpful when a user views a lost item detail page.
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
// API ROUTE FUNCTION 3: UPDATE MATCH STATUS
// Route: PUT /api/matches/:id/status
// Who: The owner of the lost item
//
// After seeing a suggestion, the user can:
// - 'Confirmed' → "Yes! That's my item!" 
//                  (they should then go claim it)
// - 'Rejected'  → "No, that's not my item"
//                  (hide this suggestion)
// ══════════════════════════════════════════════════════
exports.updateMatchStatus = async (req, res) => {
    const { id } = req.params;             // match_id
    const { status } = req.body;           // 'Confirmed' or 'Rejected'
    const user_id = req.session.user.user_id;

    // Validate the status value
    if (!status || !['Confirmed', 'Rejected'].includes(status)) {
        return res.status(400).json({ 
            message: 'Status must be Confirmed or Rejected' 
        });
    }

    try {
        // Find the match suggestion
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

        // Only the owner of the lost item can confirm/reject a suggestion
        // It is their lost item — their decision
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
// EXPORT THE ENGINE FUNCTIONS TOO
// so other controllers (lost, found) can call them
// directly after creating a new item
// ══════════════════════════════════════════════════════
exports.runMatchingForLostItem  = runMatchingForLostItem;
exports.runMatchingForFoundItem = runMatchingForFoundItem;