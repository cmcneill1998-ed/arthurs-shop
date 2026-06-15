console.log("🔥 THIS IS THE SERVER FILE BEING USED");
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");

const app = express();

app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "arthurs_user",
  password: process.env.DB_PASSWORD || "password123",
  database: process.env.DB_NAME || "arthurs_db",
  port: process.env.DB_PORT || 3306,
});


db.connect((err) => {
  if (err) {
    console.error("DB connection failed:", err);
  } else {
    console.log("Connected to MySQL ✅");
  }
});

// =========================
// PRODUCTS
// =========================

// Get all products
app.get("/products", (req, res) => {
  db.query("SELECT * FROM products", (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Database error");
    }
    res.json(results);
  });
});

// Add a new product (staff use)
app.post("/products/add", (req, res) => {
  const { name, category, retailPrice, barPrice, description } = req.body;

  db.query(
    "INSERT INTO products (name, category, retailPrice, barPrice, description) VALUES (?, ?, ?, ?, ?)",
    [name, category, retailPrice, barPrice, description || "No description provided"],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).send("Add product failed");
      }
      res.json({ success: true, id: result.insertId });
    }
  );
});

// =========================
// ORDERS
// =========================

// Create order
app.post("/order", (req, res) => {
  const { customerName, email, total, items, role, hotelRoom, hotelAddress } = req.body;

  db.query(
    "INSERT INTO orders (customerName, email, total, role, hotelRoom, hotelAddress) VALUES (?, ?, ?, ?, ?, ?)",
    [customerName, email, total, role, hotelRoom || "", hotelAddress || ""],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).send("Order failed");
      }

      const orderId = result.insertId;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.json({ success: true, orderId });
      }

      const itemQueries = items.map((item) => {
        return new Promise((resolve, reject) => {
          db.query(
            "INSERT INTO order_items (orderId, productName, quantity) VALUES (?, ?, ?)",
            [orderId, item.name, item.qty],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });
      });

      Promise.all(itemQueries)
        .then(() => {
          res.json({ success: true, orderId });
        })
        .catch((err) => {
          console.error(err);
          res.status(500).send("Item save failed");
        });
    }
  );
});

// Get orders
// Staff sees ALL orders
// Customers / bar users only see their own orders by email
app.get("/orders", (req, res) => {
  const role = req.query.role;
  const email = req.query.email;

  if (role === "staff") {
    db.query("SELECT * FROM orders ORDER BY id DESC", (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).send("Orders load failed");
      }
      res.json(results);
    });
  } else {
    db.query(
      "SELECT * FROM orders WHERE email = ? ORDER BY id DESC",
      [email],
      (err, results) => {
        if (err) {
          console.error(err);
          return res.status(500).send("Orders load failed");
        }
        res.json(results);
      }
    );
  }
});

// Get items for a specific order
app.get("/order-items/:orderId", (req, res) => {
  const orderId = req.params.orderId;

  db.query(
    "SELECT * FROM order_items WHERE orderId = ?",
    [orderId],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).send("Items load failed");
      }
      res.json(results);
    }
  );
});

// Update order status / delivery note
app.post("/orders/update", (req, res) => {
  const { id, status, note } = req.body;

  db.query(
    "UPDATE orders SET status = ?, staffNote = ? WHERE id = ?",
    [status, note, id],
    (err) => {
      if (err) {
        console.error(err);
        return res.status(500).send("Order update failed");
      }
      res.json({ success: true });
    }
  );
});

// =========================
// TEST ROUTES
// =========================

app.get("/", (req, res) => {
  res.send("Backend working");
});

app.get("/debug-orders", (req, res) => {
  db.query("SELECT COUNT(*) AS total FROM orders", (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json({
      message: "debug route working",
      totalOrders: results[0].total,
    });
  });
});

// =========================
// START SERVER
// =========================

app.listen(3001, () => {
  console.log("Server running on port 3001");
});