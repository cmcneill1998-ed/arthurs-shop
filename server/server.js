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

const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

app.post("/create-checkout-session", async (req, res) => {
  try {
    const { items } = req.body;

    const line_items = items.map((item) => ({
      price_data: {
        currency: "eur",
        product_data: {
          name: item.name,
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.qty,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items,
      mode: "payment",
      success_url: `${process.env.FRONTEND_URL}/orders`,
      cancel_url: `${process.env.FRONTEND_URL}/cart`,
    });

    // ✅ THIS IS CRITICAL – sends URL back to frontend
    res.json({ url: session.url });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Stripe failed" });
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