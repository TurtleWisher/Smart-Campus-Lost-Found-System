// This line reads our .env file and loads all the secrets
// into something called process.env
// After this line, process.env.DB_HOST gives us "localhost"
// process.env.DB_USER gives us "root" etc.
require('dotenv').config();

// This brings in the mysql2 package we installed earlier
const mysql = require('mysql2');

// createPool creates a team of connections instead of just one
// Think of it as having 10 cashiers at a supermarket
// instead of just 1 — multiple users can be served at once
const pool = mysql.createPool({
    host:     process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port:     process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10
});

// .promise() lets us use async/await when we write queries
// instead of the old callback style you had before
// This makes the code much cleaner and easier to read
module.exports = pool.promise();