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


// =============================================
// isAdmin
// Blocks anyone who is not an admin
// ALWAYS use AFTER isLoggedIn — never alone
// Because if nobody is logged in, req.session.user
// is undefined and .role would crash the server
//
// Usage in routes:
// router.get('/', isLoggedIn, isAdmin, controller.fn)
//                 ↑ checks login  ↑ then checks admin
// =============================================
exports.isAdmin = (req, res, next) => {
    // By this point isLoggedIn already ran,
    // so req.session.user is guaranteed to exist
    if (req.session.user.role !== 'admin') {
        // 403 = Forbidden (you are logged in but not allowed)
        // Different from 401 which means not logged in at all
        return res.status(403).json({ 
            message: 'Admin access required' 
        });
    }
    next();
};