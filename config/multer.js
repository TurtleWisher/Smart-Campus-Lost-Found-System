// multer is the package that handles file uploads
// Without multer, your server cannot receive images or documents
const multer = require('multer');

// path is a built-in Node.js tool
// It helps us build file paths that work on any operating system
const path = require('path');

// =============================================
// STORAGE CONFIGURATION
// This tells multer TWO things:
// 1. WHERE to save uploaded files (destination)
// 2. WHAT to name them (filename)
// =============================================
const storage = multer.diskStorage({

    // destination: this function decides which FOLDER to save the file in
    // req  = the incoming request
    // file = the file being uploaded
    // cb   = callback function (like saying "okay, done, use this folder")
    destination: (req, file, cb) => {
        // Save all uploaded files into the /uploads folder
        // The null means "no error"
        cb(null, 'uploads/');
    },

    // filename: this function decides what to NAME the file
    // We cannot keep the original name because:
    // - Two users might upload files with the same name
    // - That would overwrite each other's files!
    // So we give each file a UNIQUE name using the timestamp
    filename: (req, file, cb) => {
        // Date.now() gives us the current time in milliseconds
        // Example: 1714829000000
        // path.extname() gets the file extension
        // Example: ".jpg" or ".pdf"
        // Together: "1714829000000.jpg" — always unique!
        const uniqueName = Date.now() + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

// =============================================
// FILE FILTER
// This is a security guard that checks
// whether we ALLOW this type of file
// We only want: images, videos, and documents
// We do NOT want: .exe, .zip, .js files etc.
// =============================================
const fileFilter = (req, file, cb) => {
    // These are the allowed file types (MIME types)
    // image/jpeg = .jpg files
    // image/png  = .png files
    // video/mp4  = .mp4 files
    // application/pdf = .pdf files
    const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/jpg',
        'video/mp4',
        'application/pdf'
    ];

    if (allowedTypes.includes(file.mimetype)) {
        // null = no error, true = accept this file
        cb(null, true);
    } else {
        // null = no system crash, false = reject this file
        cb(null, false);
    }
};

// =============================================
// PUT IT ALL TOGETHER
// Create the final multer upload handler
// with our storage config + file filter + size limit
// =============================================
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        // 10 * 1024 * 1024 = 10 megabytes maximum per file
        // Without this, someone could upload a 2GB video and crash your server
        fileSize: 10 * 1024 * 1024
    }
});

// Export so our route files can use it
module.exports = upload;