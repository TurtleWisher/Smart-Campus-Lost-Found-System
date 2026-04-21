const express = require("express");
const db = require("./db");

const app = express();
app.use(express.json());

// HOME ROUTE
app.get("/", (req, res) => {
    res.send("Welcome to BRAC University Lost & Found System!");
});

// REGISTER API
app.post("/register", (req, res) => {
    const { name, student_id, gsuite, password } = req.body;

    const sql = "INSERT INTO users (name, student_id, gsuite, password) VALUES (?, ?, ?, ?)";

    db.query(sql, [name, student_id, gsuite, password], (err, result) => {
        if (err) {
            console.log(err);
            return res.send("Error creating user");
        }
        res.send("User registered successfully");
    });
});

// LOGIN API
app.post("/login", (req, res) => {
    const { gsuite, password } = req.body;

    const sql = "SELECT * FROM users WHERE gsuite = ? AND password = ?";

    db.query(sql, [gsuite, password], (err, result) => {
        if (err) {
            console.log(err);
            return res.send("Error logging in");
        }

        if (result.length > 0) {
            res.send("Login successful");
        } else {
            res.send("Invalid credentials");
        }
    });
});

// START SERVER
app.listen(3000, () => {
    console.log("Server is running on port 3000");
});