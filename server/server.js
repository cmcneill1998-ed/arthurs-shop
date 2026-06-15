console.log("🔥 USING POSTGRES NOW");

const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();

app.use(cors());
app.use(express.json());

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

db.connect()
  .then(() => console.log("Connected to PostgreSQL ✅"))
  .catch((err) => console.error("DB connection failed:", err));


// =========================
// PRODUCTS
// =========================
app.get("/products", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM products ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});


// =========================
// ORDERS
// =========================
app.post("/order", async (req, res) => {
  const { customerName, email, total, items, role, hotelRoom, hotelAddress } = req.body;

  try {
    const result = await db.query(
      `INSERT INTO orders (customerName, email, total, role, hotelRoom, hotelAddress, status, staffNote)
       VALUES ($1, $2, $3, $4, $5, $6, 'Pending', '') RETURNING id`,
      [customerName, email, total, role, hotelRoom || "", hotelAddress || ""]
    );

    res.json({ success: true, orderId: result.rows[0].id });

  } catch (err) {
    console.error(err);
    res.status(500).send("Order failed");
  }
});


// =========================
// TEST
// =========================
app.get("/", (req, res) => {
  res.send("Backend working");
});


app.listen(process.env.PORT || 10000, () => {
  console.log("Server running ✅");
});