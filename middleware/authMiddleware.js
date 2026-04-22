// This is a checkpoint function
// It runs BEFORE any protected route
// If the user is not logged in, it blocks them
// If they are logged in, it lets them through

exports.isLoggedIn = (req, res, next) => {
    // Check if the session has a user stored in it
    if (!req.session.user) {
        // 401 means "you are not authenticated"
        return res.status(401).json({ 
            message: 'Please log in first' 
        });
    }
    // next() means "okay you passed, continue
    // to the actual route now"
    next();
};