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

    // Defensive: make sure session user exists
    const claimant_id = req.session && req.session.user ? req.session.user.user_id : null;

    if (!found_id) {
        return res.status(400).json({ 
            message: 'found_id is required' 
        });
    }

    if (!claimant_id) {
        // Should normally be blocked by isLoggedIn middleware,
        // but guard here to avoid server-side crashes if session is missing
        return res.status(401).json({ message: 'Please log in first' });
    }

    try {
        console.log('submitClaim called', { claimant_id, found_id, filesCount: req.files ? req.files.length : 0 });
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
                c.status AS status,
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

        // Attach proof files to each claim so the frontend can show them
        for (const claim of rows) {
            const [files] = await db.query(
                'SELECT file_url, media_type FROM proof_media WHERE claim_id = ?',
                [claim.claim_id]
            );
            claim.proof_files = files;
        }

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

        // For each claim, fetch its proof files from proof_media
        // Then attach them as claim.proof_files so the frontend can render them
        for (const claim of rows) {
            const [files] = await db.query(
                'SELECT file_url, media_type FROM proof_media WHERE claim_id = ?',
                [claim.claim_id]
            );
            claim.proof_files = files;
        }

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
    const { status, review_notes } = req.body;
    const reviewer_id = req.session.user.user_id;

    // Validate status value
    if (!['Approved', 'Rejected'].includes(status)) {
        return res.status(400).json({ 
            message: 'Status must be Approved or Rejected' 
        });
    }

    try {
        // Update the claim
        await db.query(
            `UPDATE claims 
             SET status = ?, 
                 reviewer_id = ?, 
                 review_date = NOW(), 
                 review_notes = ?
             WHERE claim_id = ?`,
            [status, reviewer_id, review_notes || null, req.params.id]
        );

        // If approved — mark the found item as Returned
        if (status === 'Approved') {
            const [claim] = await db.query(
                'SELECT found_id FROM claims WHERE claim_id = ?',
                [req.params.id]
            );

            if (claim.length > 0) {
                const foundId = claim[0].found_id;

                await db.query(
                    "UPDATE found_items SET status = 'Returned' WHERE found_id = ?",
                    [foundId]
                );

                // Reject all other claims for the same found item
                await db.query(
                    `UPDATE claims
                     SET status = 'Rejected', reviewer_id = ?, review_date = NOW(), review_notes = ?
                     WHERE found_id = ? AND claim_id != ?`,
                    [reviewer_id, 'Automatically rejected after another claim was approved', foundId, req.params.id]
                );

                // If this found item was matched to any lost item reports,
                // mark those lost items as returned too so analytics reflects
                // the fact that the lost report has been resolved.
                await db.query(
                    `UPDATE lost_items li
                     JOIN match_suggestions ms ON li.lost_id = ms.lost_id
                     SET li.status = 'Returned'
                     WHERE ms.found_id = ? AND li.status = 'Lost'`,
                    [foundId]
                );
            }
        }

        res.json({ message: `Claim ${status} successfully` });

    } catch (err) {
        console.error('reviewClaim error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};