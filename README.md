# BRACU Smart Campus Lost & Found System

A full-stack lost and found management platform built for BRAC University. Students, staff, and faculty can report lost or found items, receive automated match suggestions scored by keyword overlap and location proximity, submit evidence-backed ownership claims, and get notified via email and in-app alerts when a match is found.

**Live:** https://bracu-lost-found-system.up.railway.app

---

## Overview

The system addresses a real operational gap at BRAC University — no structured way for campus members to report, search, or recover lost belongings. The platform handles the full lifecycle of a lost item: report → match → claim → verify → return, with role-based controls and a real-time notification layer throughout.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js v20 |
| Framework | Express.js v5 |
| Database | MySQL 8 (InnoDB) |
| DB Driver | mysql2 with native Promise support |
| Auth | express-session + bcryptjs (10 salt rounds) |
| File Uploads | Multer (disk storage, MIME whitelist) |
| Email | Nodemailer + Gmail SMTP |
| Frontend | HTML5, Bootstrap 5, Vanilla JS — Fetch API |
| Deployment | Railway — Node.js service + managed MySQL |
| Version Control | Git + GitHub (auto-deploy on push) |

---

## Features

**Lost & Found Reporting**
Users submit structured item reports with a title, detailed description, predefined category, structured campus location (floor number, zone A–H, room number or miscellaneous), and the date of the incident. Reports are timestamped automatically and assigned an initial status on creation.

**Automated Matching Engine**
On every new lost or found report, a matching algorithm queries the opposite table for items sharing the same category and location, then calculates a keyword overlap percentage by comparing word sets from both titles. Pairs scoring 40% or above are written to match_suggestions and trigger an immediate notification to the lost item owner.

**Claim and Verification**
Logged-in users can file a formal claim on any available found item. The claim form accepts up to five evidence files (images, videos, PDFs) via multipart upload. Server-side guards prevent duplicate claims, self-claims on the reporter's own post, and claims on already-returned items. Admins review pending claims and approve or reject with optional notes.

**In-App and Email Notifications**
Every match event creates a database notification record and dispatches a Gmail email to the affected user. The navbar displays an unread badge count that updates on each page load. Clicking a notification marks it read and navigates directly to the matched found item.

**Search and Filtering**
All browse pages support live filtering by keyword (SQL LIKE against title and description), category (predefined dropdown), and floor number. Filters combine dynamically — only active filter conditions are appended to the query.

**Role-Based Access Control**
Two roles: general user and admin. Every write operation verifies ownership or admin status server-side before executing. The admin dashboard provides a tabbed interface for system analytics, user management with role promotion and demotion, claim review, and full visibility over all reported items.

**Item Status Tracking**
Lost items progress through Lost → Pending → Claimed → Returned. Found items progress through Found → Pending → Returned. Status transitions are driven by claim submissions and admin decisions, keeping every item's lifecycle fully auditable.

---

## Architecture

The backend follows a strict MVC pattern. `server.js` is the entry point — it registers middleware and mounts route files. Route files map HTTP methods and paths to controller functions with optional middleware guards between them. Controllers contain all business logic and issue parameterised queries through the connection pool. Two utility modules (mailer and notify) are shared across controllers and handle email dispatch and notification persistence independently of the request lifecycle.

The frontend is plain HTML served statically by Express. Each page communicates with the backend exclusively through the Fetch API, sending and receiving JSON. File upload forms use multipart/form-data. Session state is maintained via a signed HTTP-only cookie set at login and destroyed at logout.

---

## Database Design

Nine tables across the schema: `users`, `categories`, `locations`, `lost_items`, `found_items`, `match_suggestions`, `claims`, `proof_media`, and `notifications`. All tables use InnoDB for foreign key enforcement and transactional support.

**User hierarchy** is implemented with single-table inheritance. A `role` column (general_user / admin) handles the first specialisation level. A `user_type` column (student / staff / faculty) and a `type_specific_id` column handle the second level without requiring separate subtype tables or JOIN overhead at login.

**Item hierarchy** uses table-per-subclass. `lost_items` and `found_items` are separate tables because they carry different date fields, different status ENUM values, and different claim relationships. A shared supertype table was not needed.

**Match suggestions** serve as a bridge table resolving the M:N relationship between lost and found items. Each row stores a confidence score and a suggestion status (Suggested / Confirmed / Rejected) alongside the two foreign keys.

**Claims** reference the `users` table twice — `claimant_id` identifies who filed the claim, `reviewer_id` identifies who reviewed it. The reviewer column is nullable and is set only when a review action is taken, preserving the audit trail even if the reviewing account is later deleted.

**Cascading deletes** are configured so that user removal propagates to their item posts, item removal propagates to match suggestions, and claim removal propagates to proof media records.

---

## API Reference

All endpoints that modify data or return user-specific records require an active session. Admin-only endpoints additionally verify the `admin` role from the session — the role is never read from the request body.

### Authentication — /api/auth

| Method | Endpoint | Auth |
|---|---|---|
| POST | /register | Public |
| POST | /login | Public |
| POST | /logout | Session |
| GET | /me | Public |

### Lost Items — /api/lost-items

| Method | Endpoint | Auth |
|---|---|---|
| GET | / | Public |
| GET | /search | Public |
| GET | /:id | Public |
| POST | / | Session |
| PUT | /:id | Session — owner or admin |
| DELETE | /:id | Session — owner or admin |

### Found Items — /api/found-items

Same structure as Lost Items.

### Claims — /api/claims

| Method | Endpoint | Auth |
|---|---|---|
| POST | / | Session |
| GET | /my-claims | Session |
| PUT | /:id/review | Session |

### Notifications — /api/notifications

| Method | Endpoint | Auth |
|---|---|---|
| GET | / | Session |
| POST | /:id/read | Session |
| POST | /read-all | Session |

### Admin — /api/admin

| Method | Endpoint | Auth |
|---|---|---|
| GET | /analytics | Admin |
| GET | /users | Admin |
| PUT | /users/:id/role | Admin |
| GET | /claims | Admin |
| GET | /lost-items | Admin |
| GET | /found-items | Admin |

---

## Local Setup

**Requirements:** Node.js v18 or higher, MySQL running locally (XAMPP or standalone).

Clone the repository and run `npm install` to install all dependencies. Create an `uploads` directory in the project root — Multer writes evidence files there. Create a `.env` file in the project root with the following variables: `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`, `PORT`, `SESSION_SECRET`, `EMAIL_USER`, and `EMAIL_PASS`. The email variables require a Gmail account with a 16-character App Password (Google Account → Security → 2-Step Verification → App Passwords).

Importe the database schema through phpMyAdmin using the `schema.sql` file included in the repository. The file creates all nine tables in correct foreign key dependency order. Start the development server with `npm run dev`. To elevate a registered account to admin, update the `role` column for that user directly in the database.

---

## Deployment

The application runs on Railway with a managed MySQL instance provisioned as a separate service. GitHub integration enables automatic redeployment on every push to the main branch.

The production session configuration sets `trust proxy` to handle Railway's reverse proxy layer, `secure: true` to restrict cookies to HTTPS, and `sameSite: none` to allow cross-origin cookie transmission. All database credentials are injected at runtime through Railway's environment variable system, which references the MySQL service's internal connection details directly — no credentials are hardcoded or committed to the repository.

---

## Security

- Passwords are hashed with bcryptjs before storage and never logged or returned in API responses
- Every database query uses parameterised placeholders via mysql2 — SQL injection through user input is not possible
- Ownership checks on edit and delete operations are enforced server-side regardless of what the frontend sends
- The admin role is always read from the server-side session — it cannot be spoofed via request body or headers
- Multer validates MIME types against a whitelist before accepting any upload
- Notification queries are scoped strictly to the authenticated session user

---

## Author

Md. Samiul Islam — BRAC University, Department of Computer Science and Engineering
