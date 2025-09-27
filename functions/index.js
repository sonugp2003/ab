import express from "express";
import mysql from "mysql2";
import cors from "cors";

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// ------------------------
// Database connection
// ------------------------
const db = mysql.createConnection({
  host: "141.148.216.4",
  port: 8888,
  user: "141.148.216.4",       // <-- replace with your DB username
  password: "yfgd64DSD4545rg",   // <-- replace with your DB password
  database: "141.148.216.4"     // <-- replace with your DB name
});

db.connect((err) => {
  if (err) {
    console.error("❌ Database connection failed:", err.message);
  } else {
    console.log("✅ Connected to database!");
  }
});

// ------------------------
// API Endpoints
// ------------------------

// Owners
app.get("/owners", (req, res) => {
  db.query("SELECT * FROM owner", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Tenants
app.get("/tenants", (req, res) => {
  db.query("SELECT * FROM tenant", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Payments
app.get("/payments", (req, res) => {
  db.query("SELECT * FROM payment", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Messages
app.get("/messages", (req, res) => {
  db.query("SELECT * FROM message", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// ------------------------
// CRUD examples (POST)
// ------------------------

// Add new owner
app.post("/owners", (req, res) => {
  const { id, uid, name, email, mobileNumber, address, upiId } = req.body;
  const sql = "INSERT INTO owner (id, uid, name, email, mobileNumber, address, upiId) VALUES (?, ?, ?, ?, ?, ?, ?)";
  db.query(sql, [id, uid, name, email, mobileNumber, address, upiId], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Owner added", result });
  });
});

// ------------------------
// Start Server
// ------------------------
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
import express from "express";
import mysql from "mysql2";
import cors from "cors";

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// ------------------------
// Database connection
// ------------------------
const db = mysql.createConnection({
    host: "141.148.216.4",
    port: 8888,
    user: "141.148.216.4",       // <-- replace with your DB username
    password: "yfgd64DSD4545rg",   // <-- replace with your DB password
    database: "141.148.216.4"     // <-- replace with your DB name
});

db.connect((err) => {
  if (err) {
    console.error("❌ Database connection failed:", err.message);
  } else {
    console.log("✅ Connected to database!");
  }
});

// ------------------------
// API Endpoints
// ------------------------

// Owners
app.get("/owners", (req, res) => {
  db.query("SELECT * FROM owner", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Tenants
app.get("/tenants", (req, res) => {
  db.query("SELECT * FROM tenant", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Payments
app.get("/payments", (req, res) => {
  db.query("SELECT * FROM payment", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Messages
app.get("/messages", (req, res) => {
  db.query("SELECT * FROM message", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// ------------------------
// CRUD examples (POST)
// ------------------------

// Add new owner
app.post("/owners", (req, res) => {
  const { id, uid, name, email, mobileNumber, address, upiId } = req.body;
  const sql = "INSERT INTO owner (id, uid, name, email, mobileNumber, address, upiId) VALUES (?, ?, ?, ?, ?, ?, ?)";
  db.query(sql, [id, uid, name, email, mobileNumber, address, upiId], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Owner added", result });
  });
});

// ------------------------
// Start Server
// ------------------------
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
