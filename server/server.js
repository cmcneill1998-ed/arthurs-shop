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
      ADD COLUMN IF NOT EXISTS price NUMERIC(10,2) DEFAULT 0.5;
    `);

    console.log("✅ order_items table ready");
  } catch (err) {
    console.error("❌ Failed to create/update order_items table:", err);
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

    console.log("🧪 Stripe items received:", items);

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error("No items received for Stripe checkout");
    }

    const line_items = items.map((item) => {
      const price = Number(
        item.price ??
        item.retailPrice ??
        item.retailprice ??
        item.barPrice ??
        item.barprice ??
        0
      );

      console.log("🧪 Stripe item:", item);
      console.log("💷 Price used:", price);

      if (!price || price <= 0 || Number.isNaN(price)) {
        throw new Error(`Invalid price for ${item.name}: ${price}`);
      }

      return {
        price_data: {
          currency: "eur",
          product_data: {
            name: item.name || "Unnamed product",
          },
          unit_amount: Math.round(price * 100),
        },
        quantity: item.qty || item.quantity || 1,
      };
    });

    console.log("✅ Stripe line items:", line_items);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items,
      mode: "payment",
      success_url: `${process.env.FRONTEND_URL}/orders`,
      cancel_url: `${process.env.FRONTEND_URL}/cart`,
    });

    res.json({ url: session.url });

  } catch (err) {
    console.error("❌ Stripe error full:", err);
    res.status(500).json({
      error: "Stripe failed",
      details: err.message,
    });
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
      Number(
  item.price ??
  item.retailPrice ??
  item.retailprice ??
  item.barPrice ??
  item.barprice ??
  0
)
    ]
  );
}

console.log("✅ Items saved for order:", orderId);


    // ✅ SEND CONFIRMATION EMAIL
    try {
      const emailResult = await resend.emails.send({
        from: "Arthurs <orders@arthursofflicence.com>",
        to: email,
        subject: "Order Confirmation - Arthurs",
        html: `
  <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 20px; color: #1f2937;">

    <div style="text-align:center; margin-bottom: 15px;">
      <img src="https://arthurs-off-licence.vercel.app/image.png"
           alt="Arthurs Off Licence"
           style="width: 180px; margin-bottom: 5px;" />
      <p style="font-size: 13px; color: #16A34A; margin: 0;">
        Premium drinks delivery
      </p>
    </div>

    <h2 style="color: #F97316; margin-bottom: 10px;">
      Thanks for your order, ${customerName}! 🍻
    </h2>

    <p style="margin: 5px 0;">
      Your order number is <strong>${orderId}</strong>
    </p>

    <h3 style="margin-top: 20px; margin-bottom: 10px;">
      Order Details
    </h3>

    <table style="width:100%; border-collapse: collapse; margin: 10px 0;">
      <tbody>
        ${items.map(item => {
          const qty = item.qty || item.quantity || 1;
          const price = Number(
            item.price ??
            item.retailPrice ??
            item.retailprice ??
            item.barPrice ??
            item.barprice ??
            0
          );

          return `
            <tr>
              <td style="padding: 6px 0;">
                ${item.name} x${qty}
              </td>
              <td style="text-align: right;">
                €${(price * qty).toFixed(2)}
              </td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>

    <hr style="border:none; border-top:1px solid #e5e7eb; margin: 10px 0;" />

    <table style="width:100%; margin-top:10px;">
      <tbody>
        ${
          Number(total) < 20
            ? `
            <tr>
              <td><strong>Delivery</strong></td>
              <td style="text-align:right;">€2.50</td>
            </tr>
            `
            : `
            <tr>
              <td><strong>Delivery</strong></td>
              <td style="text-align:right;">Free</td>
            </tr>
            `
        }

        <tr>
          <td style="padding-top: 6px;"><strong>Total</strong></td>
          <td style="text-align:right; padding-top: 6px;">
            <strong>€${Number(total).toFixed(2)}</strong>
          </td>
        </tr>
      </tbody>
    </table>

    ${hotelRoom ? `
      <p style="margin: 10px 0;">
        <strong>Room:</strong> ${hotelRoom}
      </p>
    ` : ""}

    ${hotelAddress ? `
      <p style="margin: 5px 0;">
        <strong>Address:</strong> ${hotelAddress}
      </p>
    ` : ""}

    <p style="margin-top: 15px;">
      We’ll process your order shortly.
    </p>

    <p style="font-style: italic; font-size: 13px; color: #6b7280; margin-top: 8px;">
      Orders placed after 12pm will be delivered the next working day. Weekend orders will be delivered Monday.
    </p>

    <p style="margin-top: 20px;">
      Thanks,<br/>
      <strong style="color:#F97316;">Arthurs 🍾</strong>
    </p>

  </div>
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

//DELETE THIS AFTER
app.get("/check-orders", async (req, res) => {
  try {
    const result = await db.query("SELECT id, email, customername FROM orders");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error");
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

app.post("/orders/delete", async (req, res) => {
  const { id } = req.body;

  try {
    await db.query("DELETE FROM order_items WHERE orderid = $1", [id]);
    await db.query("DELETE FROM orders WHERE id = $1", [id]);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).send("Delete failed");
  }
});

app.post("/products/delete", async (req, res) => {
  const { id } = req.body;

  try {
    await db.query("DELETE FROM products WHERE id = $1", [id]);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).send("Delete failed");
  }
});

app.post("/products/add", async (req, res) => {
  const { name, category, retailPrice, barPrice, description } = req.body;

  try {
    await db.query(
      `INSERT INTO products (name, category, retailprice, barprice, description)
       VALUES ($1, $2, $3, $4, $5)`,
      [name, category, retailPrice, barPrice, description]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Add product failed:", err);
    res.status(500).send("Add product failed");
  }
});

app.post("/products/update", async (req, res) => {
  const { id, retailPrice, barPrice } = req.body;

  try {
    await db.query(
      `UPDATE products
       SET retailprice = $1, barprice = $2
       WHERE id = $3`,
      [retailPrice, barPrice, id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Update product failed:", err);
    res.status(500).send("Update failed");
  }
});




// =========================
// TEST
// =========================
app.get("/", (req, res) => {
  res.send("Backend working");
});

ensureOrderItemsTable();   

app.listen(process.env.PORT || 10000, () => {
  console.log("Server running ✅");
});
