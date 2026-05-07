const db = require('../config/db');

// =============================================
// SUBMIT A CLAIM
// Route: POST /api/claims
// Who can use: Any logged-in user
//
// What happens here:
// 1. User says "I think found_item #3 is mine"
// 2. We create a claim record linking them to that item
// 3. We change the found_item's status to 'Pending'
//    (so others know it is currently being reviewed)
// =============================================
exports.submitClaim = async (req, res) => {
    // Because we switched to form-data,
    // text fields now come from req.body the same way as before
    // Files come from req.files (an array multer fills for us)
    const { found_id } = req.body;
    const claimant_id = req.session.user.user_id;

    if (!found_id) {
        return res.status(400).json({ 
            message: 'found_id is required' 
        });
    }

    try {
        // ── GUARD 1 — Does this found item exist? ────
        const [foundRows] = await db.query(
            'SELECT * FROM found_items WHERE found_id = ?',
            [found_id]
        );

        if (foundRows.length === 0) {
            return res.status(404).json({ 
                message: 'Found item not found' 
            });
        }

        const foundItem = foundRows[0];

        // ── GUARD 2 — Is the item still claimable? ──
        if (foundItem.status === 'Returned') {
            return res.status(400).json({ 
                message: 'This item has already been returned to its owner' 
            });
        }

        // ── GUARD 3 — Already claimed by this user? ─
        const [existingClaim] = await db.query(
            'SELECT * FROM claims WHERE claimant_id = ? AND found_id = ?',
            [claimant_id, found_id]
        );

        if (existingClaim.length > 0) {
            return res.status(409).json({ 
                message: 'You have already submitted a claim for this item' 
            });
        }

        // ── GUARD 4 — Cannot claim your own post ────
        if (foundItem.user_id === claimant_id) {
            return res.status(400).json({ 
                message: 'You cannot claim an item you reported as found' 
            });
        }

        // ── CREATE THE CLAIM ─────────────────────────
        const [result] = await db.query(
            `INSERT INTO claims (claimant_id, found_id) VALUES (?, ?)`,
            [claimant_id, found_id]
        );

        const newClaimId = result.insertId;

        // ── SAVE PROOF FILES ─────────────────────────
        // req.files is an array of files multer saved
        // It exists only if the user attached files
        // If no files were attached, req.files is an empty array
        //
        // For each uploaded file, we save a record
        // in the proof_media table so we know:
        // - which claim it belongs to
        // - where the file is stored
        // - what type of file it is
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                // file.path  = where multer saved it on disk
                //              e.g. "uploads/1714829000000.jpg"
                // file.mimetype = the file type
                //              e.g. "image/jpeg"

                // We need to figure out media_type from mimetype
                // Our database only accepts: 'image', 'video', 'document'
                let media_type = 'document'; // default

                if (file.mimetype.startsWith('image/')) {
                    media_type = 'image';
                } else if (file.mimetype.startsWith('video/')) {
                    media_type = 'video';
                }

                // Save this file's info to proof_media table
                await db.query(
                    `INSERT INTO proof_media 
                        (claim_id, file_url, media_type) 
                     VALUES (?, ?, ?)`,
                    [newClaimId, file.path, media_type]
                );
            }
        }

        // ── UPDATE FOUND ITEM STATUS ─────────────────
        await db.query(
            `UPDATE found_items SET status = 'Pending' WHERE found_id = ?`,
            [found_id]
        );

        // Tell the user how many files were saved
        const fileCount = req.files ? req.files.length : 0;

        res.status(201).json({
            message: 'Claim submitted successfully',
            claim_id: newClaimId,
            files_uploaded: fileCount
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
// =============================================
// VIEW MY SUBMITTED CLAIMS
// Route: GET /api/claims/my-claims
// Who can use: Any logged-in user
//
// Shows the logged-in user all claims THEY have made
// =============================================
exports.getMyClaims = async (req, res) => {
    const user_id = req.session.user.user_id;

    try {
        // We JOIN with found_items so the user sees
        // the item title, not just the found_id number
        const [rows] = await db.query(`
            SELECT 
                c.claim_id,
                c.claim_date,
                c.status AS claim_status,
                c.review_notes,
                c.review_date,
                fi.found_id,
                fi.title AS item_title,
                fi.status AS item_status
            FROM claims c
            JOIN found_items fi ON c.found_id = fi.found_id
            WHERE c.claimant_id = ?
            ORDER BY c.claim_date DESC
        `, [user_id]);

        res.json(rows);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// =============================================
// VIEW ALL CLAIMS ON A SPECIFIC FOUND ITEM
// Route: GET /api/claims/found/:found_id
// Who can use: Admin OR the person who reported the found item
//
// This is for the reviewer to see everyone who
// has claimed a specific found item
// =============================================
exports.getClaimsForItem = async (req, res) => {
    const { found_id } = req.params;
    const requesting_user_id = req.session.user.user_id;
    const requesting_user_role = req.session.user.role;

    try {
        // First check: does this found item exist?
        const [foundRows] = await db.query(
            'SELECT * FROM found_items WHERE found_id = ?',
            [found_id]
        );

        if (foundRows.length === 0) {
            return res.status(404).json({ 
                message: 'Found item not found' 
            });
        }

        const foundItem = foundRows[0];

        // Only the finder (owner of the found post) OR an admin
        // should see all claims on their item
        if (foundItem.user_id !== requesting_user_id && 
            requesting_user_role !== 'admin') {
            return res.status(403).json({ 
                message: 'Access denied' 
            });
        }

        // Get all claims for this item, including the claimant's name
        const [rows] = await db.query(`
            SELECT 
                c.claim_id,
                c.claim_date,
                c.status,
                c.review_notes,
                u.name AS claimant_name,
                u.gsuite AS claimant_email
            FROM claims c
            JOIN users u ON c.claimant_id = u.user_id
            WHERE c.found_id = ?
            ORDER BY c.claim_date ASC
        `, [found_id]);

        res.json(rows);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// =============================================
// REVIEW A CLAIM (APPROVE or REJECT)
// Route: PUT /api/claims/:id/review
// Who can use: Admin OR the finder who owns the found item
//
// This is the most important function.
// When approved:
//   - claim status → 'Approved'
//   - found item status → 'Returned'
//   - all OTHER claims on same item → 'Rejected'
// When rejected:
//   - claim status → 'Rejected'
//   - found item status stays 'Pending' 
//     (other claims can still be reviewed)
// =============================================
exports.reviewClaim = async (req, res) => {
    const { id } = req.params;             // claim_id
    const { decision, review_notes } = req.body; // 'Approved' or 'Rejected'
    const reviewer_id = req.session.user.user_id;
    const reviewer_role = req.session.user.role;

    // decision must be either 'Approved' or 'Rejected'
    if (!decision || !['Approved', 'Rejected'].includes(decision)) {
        return res.status(400).json({ 
            message: 'Decision must be Approved or Rejected' 
        });
    }

    try {
        // Step 1: Find the claim
        const [claimRows] = await db.query(
            'SELECT * FROM claims WHERE claim_id = ?',
            [id]
        );

        if (claimRows.length === 0) {
            return res.status(404).json({ 
                message: 'Claim not found' 
            });
        }

        const claim = claimRows[0];

        // Step 2: Find the found item this claim is about
        const [foundRows] = await db.query(
            'SELECT * FROM found_items WHERE found_id = ?',
            [claim.found_id]
        );

        const foundItem = foundRows[0];

        // Step 3: Only the finder OR an admin can review
        if (foundItem.user_id !== reviewer_id && 
            reviewer_role !== 'admin') {
            return res.status(403).json({ 
                message: 'Only the finder or an admin can review claims' 
            });
        }

        // Step 4: Update the claim record with the decision
        await db.query(`
            UPDATE claims 
            SET 
                status = ?,
                reviewer_id = ?,
                review_date = NOW(),
                review_notes = ?
            WHERE claim_id = ?
        `, [decision, reviewer_id, review_notes || null, id]);

        // Step 5: If APPROVED — update item status + reject all other claims
        if (decision === 'Approved') {
            // Mark the found item as 'Returned' — case is closed
            await db.query(
                `UPDATE found_items SET status = 'Returned' WHERE found_id = ?`,
                [claim.found_id]
            );

            // Reject all OTHER pending claims on this same item
            // (Only one person can own it — the rest are wrong claimants)
            await db.query(`
                UPDATE claims 
                SET status = 'Rejected' 
                WHERE found_id = ? AND claim_id != ? AND status = 'Pending'
            `, [claim.found_id, id]);
        }

        res.json({ 
            message: `Claim has been ${decision}` 
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};