const mysql = require("mysql2");

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "bracu_lost_and_found"
});

db.connect((err) => {
    if (err) {
        console.log("DB connection failed:", err);
    } else {
        console.log("Database connected successfully");
    }
});

module.exports = db;