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
      ALTER TABLE orders
ADD COLUMN IF NOT EXISTS customerNote TEXT DEFAULT '';
    `);

    

    

    console.log("✅ order_items table ready");
  } catch (err) {
    console.error("❌ Failed to create/update order_items table:", err);
  }
}

// =========================
// USERS TABLE
// =========================
// =========================
// USERS TABLE
// =========================
async function ensureUsersTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        role VARCHAR(20) NOT NULL,
        fullname TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        nif TEXT,
        companyname TEXT,
        address TEXT,
        hotelroom TEXT,
        hoteladdress TEXT
      );
    `);

    console.log("✅ users table ready");
  } catch (err) {
    console.error("❌ users table failed:", err);
  }
}

async function ensureStaffUser() {
  try {
    await db.query(`
      INSERT INTO users
      (
        role,
        fullname,
        email,
        password,
        nif,
        companyname,
        address,
        hotelroom,
        hoteladdress
      )
      VALUES
      (
        'staff',
        'Arthurs Staff',
        'staff@arthurs.test',
        'demo123',
        '',
        'Arthurs',
        'Store Address',
        '',
        ''
      )
      ON CONFLICT (email)
      DO UPDATE SET
        role = 'staff',
        fullname = 'Arthurs Staff',
        password = 'demo123',
        companyname = 'Arthurs',
        address = 'Store Address';
    `);

    console.log("✅ staff user ready");
  } catch (err) {
    console.error("❌ staff user failed:", err);
  }
}


  async function ensureStaffUser() {
  try {
    await db.query(`
      INSERT INTO users
      (
        role,
        fullname,
        email,
        password,
        nif,
        companyname,
        address,
        hotelroom,
        hoteladdress
      )
      VALUES
      (
        'staff',
        'Arthurs Staff',
        'staff@arthurs.test',
        'demo123',
        '',
        'Arthurs',
        'Store Address',
        '',
        ''
      )
      ON CONFLICT (email)
      DO UPDATE SET
        role = 'staff',
        fullname = 'Arthurs Staff',
        password = 'demo123',
        companyname = 'Arthurs',
        address = 'Store Address';
    `);

    console.log("✅ staff user ready");
  } catch (err) {
    console.error("❌ staff user failed:", err);
  }
}

async function ensureProductVariantColumns() {
  try {
    await db.query(`
      ALTER TABLE products
      ADD COLUMN IF NOT EXISTS productgroup TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS variant TEXT DEFAULT '';
    `);

    console.log("✅ product variant columns ready");
  } catch (err) {
    console.error("❌ product variant columns failed:", err);
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


app.get("/check-users", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM users");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

// =========================
// REGISTER
// =========================
app.post("/register", async (req, res) => {
  try {
    const {
      role,
      fullName,
      email,
      password,
      nif,
      companyName,
      address,
      hotelRoom,
      hotelAddress,
    } = req.body;

    const existing = await db.query(
      "SELECT id FROM users WHERE email = $1",
      [email.toLowerCase()]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        error: "Email already exists",
      });
    }

    const result = await db.query(
      `
      INSERT INTO users
      (
        role,
        fullname,
        email,
        password,
        nif,
        companyname,
        address,
        hotelroom,
        hoteladdress
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
      `,
      [
        role,
        fullName,
        email.toLowerCase(),
        password,
        nif,
        companyName,
        address,
        hotelRoom,
        hotelAddress,
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Register failed");
  }
});

// =========================
// LOGIN
// =========================
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("LOGIN ATTEMPT");
    console.log("EMAIL:", email);
    console.log("PASSWORD:", password);

    const result = await db.query(
      `
      SELECT *
      FROM users
      WHERE LOWER(email) = LOWER($1)
      `,
      [email.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: "Email not found",
      });
    }

    const user = result.rows[0];

    if (String(user.password).trim() !== String(password).trim()) {
      return res.status(401).json({
        error: "Password incorrect",
      });
    }

    res.json(user);

  } catch (err) {
    console.error(err);
    res.status(500).send("Login failed");
  }
});

// =========================
// STRIPE CHECKOUT
// =========================
app.post("/create-checkout-session", async (req, res) => {
  try {
    const { items } = req.body;

    const DELIVERY_THRESHOLD = 20;
    const DELIVERY_FEE = 5;

    console.log("🧪 Stripe items received:", items);

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error("No items received for Stripe checkout");
    }

    let productSubtotal = 0;

    const line_items = items.map((item) => {
      const price = Number(
        item.price ??
        item.retailPrice ??
        item.retailprice ??
        item.barPrice ??
        item.barprice ??
        0
      );

      const quantity = item.qty || item.quantity || 1;

      console.log("🧪 Stripe item:", item);
      console.log("💷 Price used:", price);

      if (!price || price <= 0 || Number.isNaN(price)) {
        throw new Error(`Invalid price for ${item.name}: ${price}`);
      }

      productSubtotal += price * quantity;

      return {
        price_data: {
          currency: "eur",
          product_data: {
            name: item.name || "Unnamed product",
          },
          unit_amount: Math.round(price * 100),
        },
        quantity,
      };
    });

    // ✅ Add €5 delivery if product subtotal is under €20
    if (productSubtotal < DELIVERY_THRESHOLD) {
      line_items.push({
        price_data: {
          currency: "eur",
          product_data: {
            name: "Delivery Charge",
          },
          unit_amount: DELIVERY_FEE * 100,
        },
        quantity: 1,
      });
    }

    console.log("✅ Product subtotal:", productSubtotal);
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
  const { customerName, email, total, items = [], role, hotelRoom, hotelAddress, note } = req.body;

  try {
    // ✅ SAVE ORDER TO DB FIRST
    const result = await db.query(
      `INSERT INTO orders (customerName, email, total, role, hotelRoom, hotelAddress, status, staffNote, customerNote)
VALUES ($1,$2,$3,$4,$5,$6,'Pending','',$7) RETURNING id`,
     [customerName, email, total, role, hotelRoom || "", hotelAddress || "", note || ""]
    );

    const orderId = result.rows[0].id;

    // ✅ SAVE ORDER ITEMS
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

    // ✅ ✅ ONLY NEW PART ADDED (delivery calc)
    const DELIVERY_THRESHOLD = 20;
    const DELIVERY_FEE = 5;

    let productSubtotal = 0;

    for (const item of items) {
      const qty = item.qty || item.quantity || 1;

      const price = Number(
        item.price ??
        item.retailPrice ??
        item.retailprice ??
        item.barPrice ??
        item.barprice ??
        0
      );

      productSubtotal += price * qty;
    }

    const deliveryFee = productSubtotal < DELIVERY_THRESHOLD ? DELIVERY_FEE : 0;



    // ✅ SEND CONFIRMATION EMAIL
    try {
      const emailResult = await resend.emails.send({
        from: "Arthurs <orders@arthursofflicence.com>",
        to: email,
        subject: "Order Confirmation - Arthurs",
        html: `
  <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 20px; color: #1f2937;">

    <div style="text-align:center; margin-bottom: 15px;">
      <img src="https://arthursofflicence.com/logo.png">
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
  deliveryFee > 0
    ? `
      <tr>
        <td><strong>Delivery</strong></td>
        <td style="text-align:right;">€5.00</td>
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

      await resend.emails.send({
  from: "Arthurs <orders@arthursofflicence.com>",
  to: "arthursofflicence@gmail.com",
  subject: `🚨 NEW ORDER #${orderId}`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width:600px; margin:auto;">

      <h2 style="color:#F97316;">
        🚨 New Order Received
      </h2>

      <p><strong>Order ID:</strong> ${orderId}</p>
      <p><strong>Customer:</strong> ${customerName}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>

      ${
        hotelRoom
          ? `<p><strong>Room:</strong> ${hotelRoom}</p>`
          : ""
      }

      ${
        hotelAddress
          ? `<p><strong>Address:</strong> ${hotelAddress}</p>`
          : ""
      }

      <hr>

      ${items
        .map((item) => {
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
            <p>
              ${item.name} x${qty}
              - €${(price * qty).toFixed(2)}
            </p>
          `;
        })
        .join("")}

      <hr>

      <h3>Total: €${Number(total).toFixed(2)}</h3>

      ${
        note
          ? `<p><strong>Customer Note:</strong> ${note}</p>`
          : ""
      }

      <div style="margin-top:20px;">
  <a
    href="https://arthursofflicence.com/orders"
    style="
      background:#F97316;
      color:#ffffff;
      padding:10px 16px;
      border-radius:8px;
      text-decoration:none;
      display:inline-block;
    "
  >
    View Orders Dashboard
  </a>
</div>
    </div>
  `,
});
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

     const formatted = result.rows.map(order => ({
  ...order,
  customerName: order.customername,
  hotelRoom: order.hotelroom,
  hotelAddress: order.hoteladdress,
  customerNote: order.customernote,
}));

      return res.json(formatted);
    }

    const result = await db.query(
      "SELECT * FROM orders WHERE email = $1 ORDER BY id DESC",
      [email]
    );

    const formatted = result.rows.map(order => ({
  ...order,
  customerName: order.customername,
  hotelRoom: order.hotelroom,
  hotelAddress: order.hoteladdress,
  customerNote: order.customernote,
}));

    res.json(formatted);

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

app.get("/product-names", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT name FROM products ORDER BY name ASC"
    );

    res.json(result.rows.map(r => r.name));
  } catch (err) {
    res.status(500).send(err.message);
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
  const {
    name,
    category,
    retailPrice,
    barPrice,
    description,
    productGroup,
    variant,
  } = req.body;

  try {
    await db.query(
      `
      INSERT INTO products 
      (name, category, retailprice, barprice, description, productgroup, variant)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        name,
        category,
        retailPrice,
        barPrice,
        description,
        productGroup || "",
        variant || "",
      ]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Add product failed:", err);
    res.status(500).send("Add product failed");
  }
});

app.post("/products/update", async (req, res) => {
  const {
    id,
    name,
    category,
    retailPrice,
    barPrice,
    description,
    productGroup,
    variant,
  } = req.body;

  try {
    await db.query(
      `
      UPDATE products
      SET 
        name = COALESCE($1, name),
        category = COALESCE($2, category),
        retailprice = COALESCE($3, retailprice),
        barprice = COALESCE($4, barprice),
        description = COALESCE($5, description),
        productgroup = COALESCE($6, productgroup),
        variant = COALESCE($7, variant)
      WHERE id = $8
      `,
      [
        name ?? null,
        category ?? null,
        retailPrice === undefined ? null : Number(retailPrice),
        barPrice === undefined ? null : Number(barPrice),
        description ?? null,
        productGroup ?? null,
        variant ?? null,
        id,
      ]
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
ensureUsersTable();
ensureStaffUser();
ensureProductVariantColumns();

app.get("/fix-categories", async (req, res) => {
  try {
    await db.query(`
      UPDATE products
      SET category = REPLACE(category, 'Liquors', 'Liqueurs');

      UPDATE products
      SET category = REPLACE(category, 'liquors', 'Liqueurs');

      UPDATE products
      SET category = REPLACE(category, 'liqueurs', 'Liqueurs');

      UPDATE products
      SET category = REPLACE(category, 'spirit', 'Spirits');

      UPDATE products
      SET category = REPLACE(category, 'spirits', 'Spirits');

      UPDATE products
      SET category = REPLACE(category, 'miniatures', 'Miniatures');

      UPDATE products
      SET category = REPLACE(category, 'Others', '');
    `);

    res.send("Categories fixed");
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

app.listen(process.env.PORT || 10000, () => {
  console.log("Server running ✅");
});
