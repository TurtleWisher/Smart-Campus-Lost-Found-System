// =============================================
// NAVBAR.JS
// This file does two things:
// 1. Injects the navbar HTML into every page
// 2. Checks if user is logged in and updates
//    the navbar buttons accordingly
// =============================================

async function loadNavbar() {

    const navbarHTML = `
    <nav class="navbar navbar-expand-lg navbar-light bg-white shadow-sm">
        <div class="container">

            <a class="navbar-brand fw-bold text-success" href="/index.html">
                BRACU Lost & Found
            </a>

            <button class="navbar-toggler" type="button" 
                data-bs-toggle="collapse" 
                data-bs-target="#navbarContent">
                <span class="navbar-toggler-icon"></span>
            </button>

            <div class="collapse navbar-collapse" id="navbarContent">

                <ul class="navbar-nav me-auto mb-2 mb-lg-0">
                    <li class="nav-item">
                        <a class="nav-link" href="/lost-items.html">Lost Items</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="/found-items.html">Found Items</a>
                    </li>
                </ul>

                <div id="navbar-auth-buttons" class="d-flex gap-2 align-items-center">
                    <!-- Filled by checkLoginStatus() -->
                </div>

            </div>
        </div>
    </nav>

    <!-- =============================================
         NOTIFICATION DROPDOWN STYLES
         We define these here so they work on every
         page without needing a separate CSS file
    ============================================= -->
    <style>
        /* The bell icon wrapper — position:relative so the
           dropdown can be positioned relative to it */
        #notif-wrapper {
            position: relative;
        }

        /* The red badge sitting on top of the bell icon */
        #notif-badge {
            position: absolute;
            top: -4px;
            right: -6px;
            background: #dc3545;   /* Bootstrap danger red */
            color: white;
            font-size: 10px;
            font-weight: bold;
            border-radius: 50%;
            padding: 2px 5px;
            line-height: 1;
        }

        /* The dropdown panel that appears when bell is clicked */
        #notif-dropdown {
            position: absolute;
            right: 0;
            top: 36px;             /* appears just below the bell */
            width: 320px;
            background: white;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.12);
            z-index: 9999;
            max-height: 400px;
            overflow-y: auto;
        }

        /* Each individual notification row */
        .notif-item {
            padding: 10px 14px;
            border-bottom: 1px solid #f0f0f0;
            cursor: pointer;
            transition: background 0.15s;
        }

        /* Unread notifications have a light blue tint */
        .notif-item.unread {
            background-color: #f0f7ff;
        }

        .notif-item:hover {
            background-color: #e8f4e8;
        }

        .notif-item p {
            margin: 0 0 2px 0;
            font-size: 13px;
            color: #333;
        }

        .notif-item span {
            font-size: 11px;
            color: #999;
        }

        /* Bell button — no default button styling */
        #notif-bell {
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            position: relative;
            padding: 0 6px;
            line-height: 1;
        }
    </style>
    `;

    const container = document.getElementById('navbar-container');
    if (container) {
        container.innerHTML = navbarHTML;
    }

    await checkLoginStatus();
}

// =============================================
// CHECK LOGIN STATUS
// =============================================
async function checkLoginStatus() {
    try {
        const response = await fetch('/api/auth/me', {
            credentials: 'include'
        });

        const authDiv = document.getElementById('navbar-auth-buttons');

        if (response.ok) {
            const user = await response.json();

            // Admin dropdown — only shown if role is admin
            const adminMenu = user.role === 'admin' ? `
                <div class="dropdown me-2">
                    <button 
                        class="btn btn-warning btn-sm dropdown-toggle" 
                        type="button" 
                        data-bs-toggle="dropdown">
                        ⚙️ Admin
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end">
                        <li>
                            <a class="dropdown-item" href="/admin-dashboard.html">
                                📊 Admin Dashboard
                            </a>
                        </li>
                        <li><hr class="dropdown-divider"></li>
                        <li>
                            <a class="dropdown-item" href="/admin-dashboard.html#claims">
                                📋 Pending Claims
                            </a>
                        </li>
                        <li>
                            <a class="dropdown-item" href="/admin-dashboard.html#users">
                                👥 All Users
                            </a>
                        </li>
                    </ul>
                </div>
            ` : '';

            // ── NEW: Bell icon with badge + dropdown panel ──
            // This whole block is injected only when logged in
            // A logged-out user has no notifications to show
            const bellHTML = `
                <div id="notif-wrapper">

                    <!-- The bell button -->
                    <!-- onclick calls toggleNotifDropdown() defined below -->
                    <button id="notif-bell" onclick="toggleNotifDropdown(event)" title="Notifications">
                        🔔
                        <!-- Red badge — hidden by default (display:none) -->
                        <!-- loadNotifications() will show it if unread > 0 -->
                        <span id="notif-badge" style="display:none;">0</span>
                    </button>

                    <!-- Dropdown panel — hidden by default -->
                    <!-- toggleNotifDropdown() shows/hides this -->
                    <div id="notif-dropdown" style="display:none;">
                        <div style="padding:10px 14px; font-weight:600; border-bottom:1px solid #eee;">
                            🔔 Notifications
                        </div>
                        <!-- Notification rows will be injected here by loadNotifications() -->
                        <div id="notif-list">
                            <div class="notif-item">
                                <p style="color:#999;">Loading...</p>
                            </div>
                        </div>
                    </div>

                </div>
            `;

            authDiv.innerHTML = `
                ${adminMenu}
                ${bellHTML}
                <a href="/claims.html" class="btn btn-outline-secondary btn-sm me-1">
                    📋 My Claims
                </a>
                <span class="navbar-text me-2">
                    Hi, <strong>${user.name}</strong>
                </span>
                <button 
                    onclick="logout()" 
                    class="btn btn-outline-danger btn-sm">
                    Logout
                </button>
            `;

            // Now that the bell HTML is in the DOM, load the notifications
            // We call this AFTER setting innerHTML so the elements exist
            loadNotifications();

        } else {
            // Not logged in — no bell icon shown
            authDiv.innerHTML = `
                <a href="/login.html" class="btn btn-outline-success btn-sm">Login</a>
                <a href="/register.html" class="btn btn-success btn-sm">Register</a>
            `;
        }

    } catch (err) {
        console.error('Could not check login status:', err);
    }
}

// =============================================
// LOAD NOTIFICATIONS
// Fetches notifications from GET /api/notifications
// Updates the bell badge count and fills the dropdown
// =============================================
async function loadNotifications() {
    try {
        // Call our backend notifications route
        const res = await fetch('/api/notifications', {
            credentials: 'include' // send session cookie so server knows who we are
        });

        // If server returns error (e.g. not logged in), stop silently
        if (!res.ok) return;

        const data = await res.json();
        // data = { notifications: [...], unreadCount: 3 }

        const badge = document.getElementById('notif-badge');
        const list  = document.getElementById('notif-list');

        // ── Update the badge ───────────────────────────
        if (data.unreadCount > 0) {
            badge.textContent = data.unreadCount; // show the number
            badge.style.display = 'inline';        // make it visible
        } else {
            badge.style.display = 'none';          // hide if no unread
        }

        // ── Fill the dropdown list ─────────────────────
        if (data.notifications.length === 0) {
            // No notifications at all
            list.innerHTML = `
                <div class="notif-item">
                    <p style="color:#999;">No notifications yet.</p>
                </div>
            `;
        } else {
            // Build one row per notification
            // n.is_read = 0 means unread → add 'unread' class for blue tint
            list.innerHTML = data.notifications.map(n => `
                <div 
                    class="notif-item ${n.is_read == 0 ? 'unread' : ''}"
                    onclick="markRead(${n.id}, ${n.item_id})">
                    <p>${n.message}</p>
                    <span>${new Date(n.created_at).toLocaleString()}</span>
                </div>
            `).join('');
        }

    } catch (err) {
        // If fetch fails entirely, just log — don't crash the page
        console.error('Failed to load notifications:', err);
    }
}

// =============================================
// TOGGLE NOTIFICATION DROPDOWN
// Shows or hides the dropdown when bell is clicked
// Also closes it when clicking anywhere else on the page
// =============================================
function toggleNotifDropdown(e) {
    // Stop the click from bubbling up to document
    // Without this, the document click listener below
    // would immediately close the dropdown we just opened
    e.stopPropagation();

    const dropdown = document.getElementById('notif-dropdown');

    // Toggle between visible and hidden
    if (dropdown.style.display === 'none') {
        dropdown.style.display = 'block';
    } else {
        dropdown.style.display = 'none';
    }
}

// Close the dropdown if user clicks anywhere outside it
// This is standard UX — clicking away dismisses a dropdown
document.addEventListener('click', function(e) {
    const wrapper  = document.getElementById('notif-wrapper');
    const dropdown = document.getElementById('notif-dropdown');

    // If the click was outside the bell wrapper, close the dropdown
    if (wrapper && dropdown && !wrapper.contains(e.target)) {
        dropdown.style.display = 'none';
    }
});

// =============================================
// MARK NOTIFICATION AS READ
// Called when a notification row is clicked
// Tells backend to set is_read = 1 for that notification
// Then navigates to the related item page
// =============================================
async function markRead(notifId, itemId) {
    try {
        // Tell the backend this notification was read
        // We use POST because we're changing data (is_read → 1)
        await fetch(`/api/notifications/${notifId}/read`, {
            method: 'POST',
            credentials: 'include'
        });
    } catch (err) {
        console.error('Could not mark notification as read:', err);
    }

    // Navigate to the found item page if there's a linked item
    // itemId comes from the notifications.item_id column
    if (itemId && itemId !== 'null') {
        window.location.href = `/found-item-detail.html?id=${itemId}`;
    } else {
        // No linked item — just reload to update the badge count
        window.location.reload();
    }
}

// =============================================
// LOGOUT
// =============================================
async function logout() {
    try {
        await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });
        window.location.href = '/index.html';
    } catch (err) {
        console.error('Logout failed:', err);
    }
}

// =============================================
// REQUIRE LOGIN
// Call on pages that need auth
// =============================================
async function requireLogin() {
    const response = await fetch('/api/auth/me', {
        credentials: 'include'
    });

    if (!response.ok) {
        window.location.href = '/login.html';
    }

    return await response.json();
}

// Auto-run when script loads
loadNavbar();