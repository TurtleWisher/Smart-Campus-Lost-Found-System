// =============================================
// NAVBAR.JS
// This file does two things:
// 1. Injects the navbar HTML into every page
// 2. Checks if user is logged in and updates
//    the navbar buttons accordingly
// =============================================

// This function runs automatically when called
// It builds the navbar and adds it to the page
async function loadNavbar() {

    // First we create the navbar HTML as a string
    // This is the same navbar that appears on every page
    const navbarHTML = `
    <nav class="navbar navbar-expand-lg navbar-light bg-white shadow-sm">
        <div class="container">

            <!-- Brand name on the left -->
            <!-- clicking it always goes to home page -->
            <a class="navbar-brand fw-bold text-success" href="/index.html">
                BRACU Lost & Found
            </a>

            <!-- This button appears on mobile screens -->
            <!-- It toggles the menu open/closed -->
            <button class="navbar-toggler" type="button" 
                data-bs-toggle="collapse" 
                data-bs-target="#navbarContent">
                <span class="navbar-toggler-icon"></span>
            </button>

            <!-- The collapsible menu content -->
            <div class="collapse navbar-collapse" id="navbarContent">

                <!-- Left side links -->
                <ul class="navbar-nav me-auto mb-2 mb-lg-0">
                    <li class="nav-item">
                        <a class="nav-link" href="/lost-items.html">
                            Lost Items
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="/found-items.html">
                            Found Items
                        </a>
                    </li>
                </ul>

                <!-- Right side buttons -->
                <!-- This div's content changes based on login status -->
                <div id="navbar-auth-buttons" class="d-flex gap-2">
                    <!-- Will be filled by checkLoginStatus() below -->
                </div>

            </div>
        </div>
    </nav>
    `;

    // Find the element with id="navbar-container" on the page
    // and inject our navbar HTML into it
    // Every HTML page will have a <div id="navbar-container"></div>
    // at the top — that's where the navbar appears
    const container = document.getElementById('navbar-container');
    if (container) {
        container.innerHTML = navbarHTML;
    }

    // After building the navbar structure
    // check if the user is logged in
    // and update the buttons accordingly
    await checkLoginStatus();
}

// =============================================
// CHECK LOGIN STATUS
// Calls GET /api/auth/me
// If logged in → show username + logout button
// If not logged in → show login + register buttons
// =============================================
async function checkLoginStatus() {
    try {
        // fetch() sends a request to our backend
        // GET /api/auth/me returns the logged in user
        // or 401 if nobody is logged in
        const response = await fetch('/api/auth/me', {
            credentials: 'include'  
            // credentials: 'include' is CRITICAL
            // It tells fetch to send the session cookie
            // Without this the server won't know who you are
        });

        // Find the div where we put the auth buttons
        const authDiv = document.getElementById('navbar-auth-buttons');

        if (response.ok) {
            // response.ok means status was 200
            // User IS logged in
            // Get their info from the response
            const user = await response.json();

            // Show their name and a logout button
            authDiv.innerHTML = `
                <span class="navbar-text me-2">
                    Hi, <strong>${user.name}</strong>
                </span>
                <button 
                    onclick="logout()" 
                    class="btn btn-outline-danger btn-sm">
                    Logout
                </button>
            `;

        } else {
            // User is NOT logged in
            // Show login and register buttons
            authDiv.innerHTML = `
                <a href="/login.html" 
                   class="btn btn-outline-success btn-sm">
                    Login
                </a>
                <a href="/register.html" 
                   class="btn btn-success btn-sm">
                    Register
                </a>
            `;
        }

    } catch (err) {
        // If fetch itself fails (server down etc.)
        // just show the login/register buttons as default
        console.error('Could not check login status:', err);
    }
}

// =============================================
// LOGOUT FUNCTION
// Called when user clicks the Logout button
// =============================================
async function logout() {
    try {
        // Send logout request to backend
        // This destroys the session on the server
        await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });

        // After logout redirect to home page
        window.location.href = '/index.html';

    } catch (err) {
        console.error('Logout failed:', err);
    }
}

// =============================================
// REDIRECT IF NOT LOGGED IN
// Call this function on pages that REQUIRE login
// Like the report form pages
// =============================================
async function requireLogin() {
    const response = await fetch('/api/auth/me', {
        credentials: 'include'
    });

    if (!response.ok) {
        // Not logged in — redirect to login page
        // We save the current page URL so after login
        // we can bring them back here
        window.location.href = '/login.html';
    }

    // If logged in — do nothing, let the page load normally
    return await response.json();
}

// Run loadNavbar() automatically when this script loads
// This means every page that includes navbar.js
// will automatically get the navbar injected
loadNavbar();