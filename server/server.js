console.log("🔥 USING POSTGRES + STRIPE");

const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const Stripe = require("stripe");
const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

const app = express();
app.use(cors());
app.use(express.json());

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

db.connect()
  .then(() => console.log("Connected to PostgreSQL ✅"))
  .catch((err) => console.error("DB connection failed:", err));

  async function insertTestProduct() {
  try {
    await db.query(`
      INSERT INTO products (name, price, category)
      VALUES ('Test Product (1p)', 0.11, 'soft drinks')
    `);

    console.log("✅ Test product added with 1p price");
  } catch (err) {
    console.error("❌ Failed to add test product:", err);
  }
}


  // ✅ ENSURE order_items TABLE EXISTS
async function ensureOrderItemsTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        orderid INTEGER NOT NULL,
        productname TEXT NOT NULL,
        quantity INTEGER NOT NULL
      );
    `);

    // ✅ THIS FIXES YOUR ERROR
    await db.query(`
      ALTER TABLE order_items
      ADD COLUMN IF NOT EXISTS price NUMERIC(10,2) DEFAULT 0.1;
    `);

    console.log("✅ order_items table ready");
  } catch (err) {
    console.error("❌ Failed to create/update order_items table:", err);
  }
}

async function ensureProductsTableFix() {
  try {
    // ✅ make sure price column exists
    await db.query(`
      ALTER TABLE products
      ADD COLUMN IF NOT EXISTS price NUMERIC(10,2) DEFAULT 0.1;
    `);

    // ✅ set your test product to 1p
 await db.query(`
  UPDATE products
  SET price = 0.01
  WHERE price = 0;
`);


    console.log("✅ products table updated + test product set to 1p");
  } catch (err) {
    console.error("❌ Failed to update products table:", err);
  }
}



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
// STRIPE CHECKOUT
// =========================
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

    res.json({ url: session.url });

  } catch (err) {
    console.error("Stripe error:", err);
    res.status(500).json({ error: "Stripe failed" });
  }
});


app.post("/order", async (req, res) => {
  const { customerName, email, total, items = [], role, hotelRoom, hotelAddress } = req.body;

  try {
    // ✅ SAVE ORDER TO DB FIRST
    const result = await db.query(
      `INSERT INTO orders (customerName, email, total, role, hotelRoom, hotelAddress, status, staffNote)
       VALUES ($1, $2, $3, $4, $5, $6, 'Pending', '') RETURNING id`,
      [customerName, email, total, role, hotelRoom || "", hotelAddress || ""]
    );

    const orderId = result.rows[0].id;
// ✅ SAVE ORDER ITEMS (THIS IS THE MISSING BIT)
for (const item of items) {
  console.log("🧪 Saving item:", item);

  await db.query(
    `INSERT INTO order_items (orderid, productname, quantity, price)
     VALUES ($1, $2, $3, $4)`,
    [
      orderId,
      item.name,
      item.qty || item.quantity || 1,
      Number(item.price || 0)
    ]
  );
}

console.log("✅ Items saved for order:", orderId);


    // ✅ SEND CONFIRMATION EMAIL
    try {
      const emailResult = await resend.emails.send({
        from: "Arthurs <orders@arthursofflicence.com>",
        to: email,
        subject: "🍻 Order Confirmation - Arthurs",
        html: `
          <h2>Thanks for your order, ${customerName}! 🍻</h2>
          <p>Your order ID is <strong>${orderId}</strong></p>

          <h3>🛒 Order Details:</h3>
          <ul>
            ${items.map(item => `
              <li>${item.name} x${item.qty || item.quantity || 1}</li>
            `).join("")}
          </ul>

          <p><strong>Total:</strong> €${total}</p>

          ${hotelRoom ? `<p><strong>Room:</strong> ${hotelRoom}</p>` : ""}
          ${hotelAddress ? `<p><strong>Address:</strong> ${hotelAddress}</p>` : ""}

          <p>✅ We’ll process your order shortly.</p>
          <p>Orders placed after 12pm will be delivered the next working day.</p>
          <p>Weekend orders will be delivered Monday.</p>

          <p>Thanks,<br/>Arthurs 🍾</p>
        `
      });

      console.log("📧 Email sent:", emailResult);
    } catch (emailErr) {
      console.error("❌ Email failed:", emailErr);
    }

    res.json({ success: true, orderId });

  } catch (err) {
    console.error("❌ Order failed:", err);
    res.status(500).send("Order failed");
  }
});


// =========================
// ORDERS (FIXES YOUR 404 ERRORS)
// =========================
app.get("/orders", async (req, res) => {
  const role = req.query.role;
  const email = req.query.email;

  try {
    if (role === "staff") {
      const result = await db.query("SELECT * FROM orders ORDER BY id DESC");
      return res.json(result.rows);
    }

    const result = await db.query(
      "SELECT * FROM orders WHERE email = $1 ORDER BY id DESC",
      [email]
    );

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).send("Orders load failed");
  }
});


// =========================
// ORDER ITEMS
// =========================
app.get("/order-items/:orderId", async (req, res) => {
  const orderId = req.params.orderId;

  try {
    console.log("🔍 Fetching items for order:", orderId);

    const result = await db.query(
      `SELECT productname, quantity, price
       FROM order_items
       WHERE orderid = $1`,
      [orderId]
    );

    console.log("✅ RAW DB RESULT:", result.rows);

    // ✅ manually map property name
    const formatted = result.rows.map(item => ({
      productName: item.productname,
      quantity: item.quantity,
      price: item.price
    }));

    res.json(formatted);
  } catch (err) {
    console.error("❌ ERROR LOADING ITEMS:", err);
    res.status(500).json({ error: err.message });
  }
});


// =========================
// UPDATE ORDER (STAFF BUTTON)
// =========================
app.post("/orders/update", async (req, res) => {
  const { id, status, note } = req.body;

  try {
    await db.query(
      "UPDATE orders SET status = $1, staffNote = $2 WHERE id = $3",
      [status, note, id]
    );

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).send("Order update failed");
  }
});

app.post("/reset-password", async (req, res) => {
  const { email, newPassword } = req.body;

  try {
    if (!email || !newPassword) {
      return res.status(400).json({ error: "Missing fields" });
    }

    await db.query(
      "UPDATE users SET password = $1 WHERE email = $2",
      [newPassword, email]
    );

    res.json({ success: true });

  } catch (err) {
    console.error("Reset password failed:", err);
    res.status(500).send("Reset failed");
  }
});


// =========================
// TEST
// =========================
app.get("/", (req, res) => {
  res.send("Backend working");
});

ensureOrderItemsTable();
ensureProductsTableFix();   // ✅ ADD THIS
insertTestProduct();

app.listen(process.env.PORT || 10000, () => {
  console.log("Server running ✅");
});
