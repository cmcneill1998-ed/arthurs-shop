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
  "SELECT * FROM users WHERE email = $1",
  [email.toLowerCase()]
);

console.log("REGISTER EMAIL:", email.toLowerCase());
console.log("MATCHES:", existing.rows);

    
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

    const user = result.rows[0];

res.json({
  ...user,
  fullName: user.fullname,
  companyName: user.companyname,
  hotelRoom: user.hotelroom,
  hotelAddress: user.hoteladdress,
});

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

res.json({
  ...user,
  fullName: user.fullname,
  companyName: user.companyname,
  hotelRoom: user.hotelroom,
  hotelAddress: user.hoteladdress,
});

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
      <img src="https://arthursofflicence.com/logo.png" alt="Arthurs Off Licence" style="width: 180px; margin-bottom: 5px;" />
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


app.post("/users/update", async (req, res) => {
  const {
    email,
    fullName,
    companyName,
    address,
    nif,
    hotelRoom,
    hotelAddress,
  } = req.body;

  try {
    await db.query(
      `
      UPDATE users
      SET
        fullname = $1,
        companyname = $2,
        address = $3,
        nif = $4,
        hotelroom = $5,
        hoteladdress = $6
      WHERE email = $7
      `,
      [
        fullName,
        companyName || "",
        address || "",
        nif || "",
        hotelRoom || "",
        hotelAddress || "",
        email,
      ]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed");
  }
});

app.get("/image-names", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT DISTINCT name
      FROM products
      ORDER BY name;
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

app.get("/restore-descriptions", async (req, res) => {
  try {
    await db.query(`
      UPDATE products
      SET description = CASE

        /* =========================
           BEERS
        ========================= */

        WHEN LOWER(name) LIKE '%birra moretti%' THEN 'A premium Italian lager with smooth malt flavour, gentle bitterness and a crisp refreshing finish. Best served chilled.'
        WHEN LOWER(name) LIKE '%budweiser%' THEN 'A classic American-style lager with clean malt flavour, light body and a smooth refreshing finish.'
        WHEN LOWER(name) LIKE '%carling%' THEN 'A popular British lager with a light, crisp taste and easy-drinking character. Best served cold.'
        WHEN LOWER(name) LIKE '%carlsberg%' THEN 'A smooth Danish pilsner with balanced malt flavour, gentle bitterness and a refreshing crisp finish.'
        WHEN LOWER(name) LIKE '%coors light%' THEN 'A light American lager with clean flavour and a crisp ice-cold finish. Ideal for easy drinking.'
        WHEN LOWER(name) LIKE '%corona%' THEN 'A refreshing Mexican-style lager with light malt character and crisp finish. Best enjoyed chilled with lime.'
        WHEN LOWER(name) LIKE '%cruzcampo shandy%' THEN 'A refreshing beer blended with lemon flavour for a lighter citrus-style drink. Best served cold.'
        WHEN LOWER(name) LIKE '%cruzcampo%' THEN 'A popular Spanish lager with smooth malt flavour and refreshing character. Ideal served chilled.'
        WHEN LOWER(name) LIKE '%desperado%' OR LOWER(name) LIKE '%desprado%' THEN 'A tequila-flavoured lager combining crisp beer character with sweet citrus and tequila-style notes. Best served chilled.'
        WHEN LOWER(name) LIKE '%erdinger%' THEN 'A traditional German wheat beer with smooth body, gentle fruit notes and classic refreshing wheat beer character.'
        WHEN LOWER(name) LIKE '%estrella daura%' THEN 'A gluten-free Spanish lager with smooth malt flavour and a refreshing crisp finish.'
        WHEN LOWER(name) LIKE '%estrella damm%' THEN 'A Mediterranean lager brewed with balanced malt and hop character for a crisp refreshing finish.'
        WHEN LOWER(name) LIKE '%estrella galicia%' THEN 'A premium Spanish lager with rich malt character, balanced bitterness and a smooth refreshing finish.'
        WHEN LOWER(name) LIKE '%damn free%' THEN 'An alcohol-free lager with crisp malt flavour and refreshing character, ideal for low and no alcohol occasions.'
        WHEN LOWER(name) LIKE '%guinness zero%' THEN 'An alcohol-free stout with roasted malt flavour, smooth body and a creamy Guinness-style finish.'
        WHEN LOWER(name) LIKE '%guinness%' THEN 'A famous Irish stout with rich roasted malt flavour, smooth body and creamy texture.'
        WHEN LOWER(name) LIKE '%heineken 0%' THEN 'An alcohol-free lager with Heineken-style malt character and crisp refreshing taste.'
        WHEN LOWER(name) LIKE '%heineken%' THEN 'A world-famous Dutch lager with balanced bitterness, smooth malt flavour and crisp refreshing finish.'
        WHEN LOWER(name) LIKE '%john smiths%' THEN 'A smooth ale-style beer with malty flavour, gentle bitterness and easy-drinking character.'
        WHEN LOWER(name) LIKE '%mahou tostado%' THEN 'A toasted alcohol-free Spanish beer with roasted malt flavour and a smooth refreshing finish.'
        WHEN LOWER(name) LIKE '%mahou 5 star%' THEN 'A full-flavoured Spanish lager with smooth malt character and balanced bitterness.'
        WHEN LOWER(name) LIKE '%mahou classic%' THEN 'A traditional Spanish lager with clean flavour, light bitterness and refreshing finish.'
        WHEN LOWER(name) LIKE '%mahou litre%' THEN 'A large-format Spanish lager with crisp flavour and easy-drinking character.'
        WHEN LOWER(name) LIKE '%miller%' THEN 'A light lager with clean flavour, smooth body and a crisp refreshing finish.'
        WHEN LOWER(name) LIKE '%perroni%' OR LOWER(name) LIKE '%peroni%' THEN 'A premium Italian lager with subtle citrus notes, clean bitterness and a crisp refreshing finish.'
        WHEN LOWER(name) LIKE '%san miguel radler%' THEN 'A refreshing lager blended with lemon flavour for a light citrus finish.'
        WHEN LOWER(name) LIKE '%san miguel%' THEN 'A smooth Spanish lager with balanced malt flavour, light bitterness and crisp refreshing character.'
        WHEN LOWER(name) LIKE '%stella%' THEN 'A premium Belgian-style lager with crisp flavour, smooth malt character and balanced bitterness.'
        WHEN LOWER(name) LIKE '%tennents%' THEN 'A Scottish lager with smooth malt flavour, light bitterness and clean refreshing character.'

        /* =========================
           CIDERS
        ========================= */

        WHEN LOWER(name) LIKE '%koppaberg%pear%' THEN 'A Swedish pear cider packed with juicy pear flavour, refreshing sweetness and a crisp finish. Best served chilled over ice.'
        WHEN LOWER(name) LIKE '%koppaberg%strawberry%lime%' THEN 'A fruit cider blending sweet strawberry flavour with zesty lime notes for a refreshing finish.'
        WHEN LOWER(name) LIKE '%koppaberg%mix fruit%' OR LOWER(name) LIKE '%koppaberg%mixed fruit%' THEN 'A refreshing mixed fruit cider packed with berry flavours and balanced sweetness. Best served ice cold.'
        WHEN LOWER(name) LIKE '%magners%' THEN 'A traditional Irish cider made with selected apples, offering crisp fruit flavour and refreshing character.'
        WHEN LOWER(name) LIKE '%orchard thieves%' THEN 'A modern apple cider with crisp fruit flavour, smooth sweetness and a refreshing finish.'
        WHEN LOWER(name) LIKE '%rekordelig%passion fruit%' THEN 'A Swedish fruit cider with exotic passion fruit flavour, refreshing sweetness and crisp finish.'
        WHEN LOWER(name) LIKE '%rekordelig%strawberry%lime%' THEN 'A refreshing fruit cider combining sweet strawberry notes with zesty lime character.'
        WHEN LOWER(name) LIKE '%rekordelig%wild berry%' THEN 'A mixed berry cider with juicy fruit flavour, balanced sweetness and refreshing character.'
        WHEN LOWER(name) LIKE '%rekordelig%mango%raspberry%' THEN 'A tropical fruit cider blending mango sweetness with raspberry freshness and a smooth finish.'
        WHEN LOWER(name) LIKE '%strongbow%' THEN 'A classic apple cider with crisp fruit flavour, light sweetness and refreshing finish.'
        WHEN LOWER(name) LIKE '%thatchers%' THEN 'A premium apple cider crafted with selected apples for crisp fruit flavour and a clean refreshing finish.'

        /* =========================
           ALCO POPS
        ========================= */

        WHEN LOWER(name) LIKE '%smirnoff ice%' THEN 'A crisp ready-to-drink vodka mixed beverage with refreshing citrus flavour. Best served ice cold.'
        WHEN LOWER(name) LIKE '%wkd blue%' THEN 'A bright blue ready-to-drink alcoholic beverage with sweet mixed fruit flavour. Popular served chilled.'
        WHEN LOWER(name) LIKE '%bacardi breezer%orange%' THEN 'A ready-to-drink rum cocktail bursting with sweet orange flavour. Perfect served chilled.'
        WHEN LOWER(name) LIKE '%bacardi breezer%watermelon%' THEN 'A refreshing watermelon flavoured rum cooler with smooth fruity character. Best served cold.'
        WHEN LOWER(name) LIKE '%bacardi breezer%lime%' THEN 'A refreshing rum cocktail with zesty lime flavour and easy-drinking character. Best served chilled.'
        WHEN LOWER(name) LIKE '%bacardi breezer%passion%' THEN 'A tropical ready-to-drink beverage combining passion fruit and mango flavours with Bacardi rum.'
        WHEN LOWER(name) LIKE '%white claw%' THEN 'A sparkling hard seltzer with light fruit flavour, refreshing bubbles and a clean easy-drinking finish.'

        /* =========================
           SOFT DRINKS / MIXERS
        ========================= */

        WHEN LOWER(name) LIKE '%coke zero%' THEN 'A sugar-free cola with classic Coca-Cola flavour and refreshing carbonation. Best served chilled.'
        WHEN LOWER(name) LIKE '%coke light%' THEN 'A light cola soft drink with refreshing flavour and no sugar. Best served cold.'
        WHEN LOWER(name) LIKE '%coke%' THEN 'A classic cola soft drink with refreshing carbonation and iconic flavour. Perfect served chilled.'
        WHEN LOWER(name) LIKE '%fanta lemon%' THEN 'A sparkling lemon soft drink with bright citrus flavour and refreshing finish.'
        WHEN LOWER(name) LIKE '%fanta orange%' THEN 'A sparkling orange soft drink with fruity citrus flavour and refreshing bubbles.'
        WHEN LOWER(name) LIKE '%nestea%' THEN 'A refreshing iced tea soft drink with smooth tea flavour and light sweetness.'
        WHEN LOWER(name) LIKE '%sprite zero%' THEN 'A sugar-free lemon and lime soft drink with crisp citrus flavour and refreshing bubbles.'
        WHEN LOWER(name) LIKE '%sprite%' THEN 'A lemon and lime flavoured soft drink with crisp citrus character and refreshing carbonation.'
        WHEN LOWER(name) LIKE '%irn bru diet%' THEN 'A low-calorie version of the famous Scottish soft drink with bold flavour and refreshing fizz.'
        WHEN LOWER(name) LIKE '%irn bru%' THEN 'A famous Scottish soft drink with a bold distinctive flavour and refreshing carbonation.'
        WHEN LOWER(name) LIKE '%fevertree%pink grapefruit%' THEN 'A premium pink grapefruit soda with vibrant citrus flavour and refreshing bitterness. Ideal for premium mixed drinks.'
        WHEN LOWER(name) LIKE '%fevertree%mediterranean tonic%' THEN 'A premium tonic water with Mediterranean herbs and citrus notes. Perfect for pairing with premium gin.'
        WHEN LOWER(name) LIKE '%fevertree%sicillian lemonade%' OR LOWER(name) LIKE '%fevertree%sicilian lemonade%' THEN 'A sparkling Sicilian lemonade with vibrant lemon flavour, natural sweetness and refreshing citrus character.'
        WHEN LOWER(name) LIKE '%fevertree%elderflower tonic%' THEN 'A premium elderflower tonic water with gentle floral notes and refreshing bitterness. Ideal with gin or vodka.'
        WHEN LOWER(name) LIKE '%fevertree%ginger ale%' THEN 'A premium ginger ale with balanced spice, gentle sweetness and clean refreshing finish.'
        WHEN LOWER(name) LIKE '%fevertree%ginger beer%' THEN 'A premium ginger beer with bold ginger spice, refreshing sweetness and strong mixer character.'
        WHEN LOWER(name) LIKE '%fevertree%tonic%' THEN 'A premium tonic water with crisp bitterness and fine bubbles. Ideal for gin and tonic serves.'
        WHEN LOWER(name) LIKE '%fevertree%soda%' THEN 'A premium soda water with fine carbonation and a clean refreshing finish. Perfect for spirits and cocktails.'
        WHEN LOWER(name) LIKE '%schweppes%tonic%' THEN 'A classic tonic water with balanced bitterness and refreshing bubbles. Ideal for gin and tonic.'
        WHEN LOWER(name) LIKE '%schweppes%ginger%' THEN 'A ginger mixer with smooth spice, gentle sweetness and refreshing carbonation.'
        WHEN LOWER(name) LIKE '%schweppes%soda%' THEN 'A sparkling soda water with clean flavour and refreshing carbonation. Perfect for mixing.'
        WHEN LOWER(name) LIKE '%juicee orange%' THEN 'A refreshing orange cordial drink with fruity citrus flavour. Ideal served chilled or diluted to taste.'
        WHEN LOWER(name) LIKE '%juicee lime%' THEN 'A lime cordial with bright citrus flavour and refreshing sweetness. Great for drinks and mixers.'
        WHEN LOWER(name) LIKE '%juicee summer fruits%' THEN 'A summer fruits cordial with mixed berry flavour and refreshing sweetness.'
        WHEN LOWER(name) LIKE '%don simon%apple%' THEN 'A refreshing apple juice drink with fruity sweetness and smooth finish.'
        WHEN LOWER(name) LIKE '%don simon%orange%' THEN 'A refreshing orange juice drink with bright citrus flavour and natural fruit character.'
        WHEN LOWER(name) LIKE '%don simon%pina%' THEN 'A pineapple juice drink with tropical fruit sweetness and refreshing flavour.'
        WHEN LOWER(name) LIKE '%don simon%tomato%' THEN 'A savoury tomato juice with rich tomato flavour, ideal chilled or used in cocktails.'
        WHEN LOWER(name) LIKE '%robinsons%orange%' THEN 'A classic orange squash with fruity citrus flavour. Dilute to taste for a refreshing drink.'
        WHEN LOWER(name) LIKE '%robinsons%blackcurrant%' THEN 'A blackcurrant squash with rich berry flavour. Dilute to taste for refreshing drinks.'
        WHEN LOWER(name) LIKE '%robinsons%apple%blackcurrant%' THEN 'A fruity apple and blackcurrant squash with balanced berry sweetness. Dilute to taste.'
        WHEN LOWER(name) LIKE '%cranberry juice%' THEN 'A cranberry juice drink with tart berry flavour and refreshing finish.'
        WHEN LOWER(name) LIKE '%fruit shoot%' THEN 'A convenient fruit flavoured soft drink, ideal for children, lunches and on-the-go refreshment.'
        WHEN LOWER(name) LIKE '%red bull%' THEN 'A world-famous energy drink with refreshing flavour and caffeine boost. Best served chilled.'
        WHEN LOWER(name) LIKE '%boost%' THEN 'An energy drink with caffeine and vitamins, designed for refreshment and stimulation.'
        WHEN LOWER(name) LIKE '%aquarius orange%' THEN 'An orange flavoured isotonic drink designed for hydration and refreshment.'
        WHEN LOWER(name) LIKE '%aquarius lemon%' THEN 'A lemon flavoured isotonic drink with refreshing citrus character.'
        WHEN LOWER(name) LIKE '%monster%' THEN 'A bold energy drink with high caffeine content and refreshing flavour.'
        WHEN LOWER(name) LIKE '%old jamaica ginger beer%' THEN 'A fiery ginger soft drink with bold spice and refreshing character.'
        WHEN LOWER(name) LIKE '%lucozade sport%' THEN 'An isotonic sports drink designed to help replenish fluids and electrolytes during and after activity.'
        WHEN LOWER(name) LIKE '%lucozade original%' THEN 'A sparkling glucose energy drink with distinctive flavour and refreshing character.'
        WHEN LOWER(name) LIKE '%lucozade orange%' THEN 'A sparkling orange energy drink with citrus flavour and refreshing glucose character.'
        WHEN LOWER(name) LIKE '%vimto light%' THEN 'A low-calorie mixed fruit soft drink with distinctive Vimto flavour and refreshing finish.'
        WHEN LOWER(name) LIKE '%vimto%' THEN 'A mixed fruit soft drink with bold berry flavour and refreshing sweetness.'
        WHEN LOWER(name) LIKE '%aquabona%' THEN 'Natural still bottled water with a clean refreshing taste. Ideal served chilled.'
        WHEN LOWER(name) LIKE '%bezoya%' THEN 'Premium mineral water known for purity and refreshing clean taste.'
        WHEN LOWER(name) LIKE '%primavera agua con gas%' THEN 'Sparkling mineral water with refreshing carbonation and clean taste.'

        /* =========================
           WINE / CAVA / CHAMPAGNE
        ========================= */

        WHEN LOWER(name) LIKE '%laurent perrier%rose%' THEN 'A prestigious rosé champagne with delicate red fruit flavours, fine bubbles and an elegant refined finish.'
        WHEN LOWER(name) LIKE '%moet%chandon%rose%' THEN 'A luxurious rosé champagne with red fruit notes, elegant bubbles and a smooth celebratory finish.'
        WHEN LOWER(name) LIKE '%moet%chandon%brut%' THEN 'A world-famous brut champagne with citrus fruit, brioche notes and fine elegant bubbles.'
        WHEN LOWER(name) LIKE '%veuve clicquot%' THEN 'An iconic champagne with rich fruit character, balanced acidity and fine persistent bubbles.'
        WHEN LOWER(name) LIKE '%acantus blanco%' THEN 'A fresh Spanish white wine with crisp fruit flavour, refreshing acidity and easy-drinking character.'
        WHEN LOWER(name) LIKE '%acantus tinto%' THEN 'A smooth Spanish red wine with ripe berry flavours, gentle tannins and balanced finish.'
        WHEN LOWER(name) LIKE '%acantus rosado%' THEN 'A refreshing Spanish rosé with delicate red fruit flavours and crisp finish.'
        WHEN LOWER(name) LIKE '%bach tinto%' THEN 'A Spanish red wine with soft berry flavours, smooth texture and approachable character.'
        WHEN LOWER(name) LIKE '%bach seco%' THEN 'A refreshing dry Spanish wine with crisp fruit notes and clean finish.'
        WHEN LOWER(name) LIKE '%bach semi%' THEN 'A semi-sweet Spanish wine with gentle fruit character and smooth finish.'
        WHEN LOWER(name) LIKE '%bach rosado%' THEN 'A bright blush rosé with soft berry notes and refreshing character.'
        WHEN LOWER(name) LIKE '%bicicletes i peces%rosado%' THEN 'A refreshing Spanish rosé with red berry flavours, crisp acidity and smooth finish.'
        WHEN LOWER(name) LIKE '%bicicletes i peces%verdejo%' THEN 'A fresh Verdejo white wine with citrus, tropical fruit and floral notes.'
        WHEN LOWER(name) LIKE '%bicicletes i peces%sauv%' THEN 'A Sauvignon Blanc with citrus, gooseberry and tropical fruit flavours. Bright and refreshing.'
        WHEN LOWER(name) LIKE '%blossom hill%' THEN 'A popular easy-drinking wine with soft fruit flavours and smooth approachable finish.'
        WHEN LOWER(name) LIKE '%buckfast%' THEN 'A fortified tonic wine with distinctive sweet flavour and rich character.'
        WHEN LOWER(name) LIKE '%campo viejo%' THEN 'A renowned Rioja wine with rich berry fruit, oak notes and smooth balanced character.'
        WHEN LOWER(name) LIKE '%casillero del diablo%' THEN 'A premium Chilean wine known for bold fruit flavours, smooth structure and excellent value.'
        WHEN LOWER(name) LIKE '%conde de caralt%rosado%' THEN 'A Spanish rosé with strawberry and raspberry notes, balanced acidity and refreshing finish.'
        WHEN LOWER(name) LIKE '%conde de caralt%seco%' THEN 'A dry Spanish wine with crisp fruit flavour and clean finish.'
        WHEN LOWER(name) LIKE '%conde de caralt%semi%' THEN 'A semi-sweet Spanish wine with soft fruit character and gentle sweetness.'
        WHEN LOWER(name) LIKE '%conde de caralt%tinto%' THEN 'A smooth Spanish red wine with ripe berry flavours and soft tannins.'
        WHEN LOWER(name) LIKE '%costa d%or%rosado%' OR LOWER(name) LIKE '%costa dor%rosado%' THEN 'A refreshing Spanish rosé with bright berry flavours and crisp finish.'
        WHEN LOWER(name) LIKE '%costa d%or%tinto%' OR LOWER(name) LIKE '%costa dor%tinto%' THEN 'A balanced Spanish red wine with red fruit notes and smooth finish.'
        WHEN LOWER(name) LIKE '%costa d%or%select%' OR LOWER(name) LIKE '%costa dor%select%' THEN 'A smooth Spanish wine with rounded fruit character and easy-drinking finish.'
        WHEN LOWER(name) LIKE '%echo falls%chardonnay%' THEN 'A Chardonnay with ripe tropical fruit flavours, subtle vanilla notes and smooth finish.'
        WHEN LOWER(name) LIKE '%echo falls%white zinfandel%' THEN 'A fruity rosé with strawberry and raspberry flavours balanced by refreshing sweetness.'
        WHEN LOWER(name) LIKE '%echo falls%pinot grigio%' THEN 'A crisp Pinot Grigio with citrus, green apple and pear notes.'
        WHEN LOWER(name) LIKE '%echo falls%summer berries%' THEN 'A fruit-infused wine bursting with mixed berry flavours and refreshing sweetness.'
        WHEN LOWER(name) LIKE '%el coto%tinto%' THEN 'A classic Rioja red wine with ripe berry flavours, gentle oak and smooth balanced finish.'
        WHEN LOWER(name) LIKE '%el coto%white%' THEN 'A refreshing Spanish white wine with citrus fruit, floral aromas and crisp acidity.'
        WHEN LOWER(name) LIKE '%faustino i%' THEN 'An iconic Gran Reserva Rioja with ripe fruit, spice, vanilla and oak character.'
        WHEN LOWER(name) LIKE '%faustino v%' THEN 'A smooth Rioja wine with ripe fruit character, gentle oak notes and balanced finish.'
        WHEN LOWER(name) LIKE '%faustino vii%' THEN 'A classic Rioja red wine with soft red fruit flavours and easy-drinking character.'
        WHEN LOWER(name) LIKE '%i heart pinot grigio%' THEN 'A crisp Pinot Grigio with fresh citrus and pear notes. Light and refreshing.'
        WHEN LOWER(name) LIKE '%i heart merlot%' THEN 'A smooth Merlot with plum and berry flavours and a soft finish.'
        WHEN LOWER(name) LIKE '%i heart sauv%' THEN 'A fresh Sauvignon Blanc with citrus and tropical fruit notes.'
        WHEN LOWER(name) LIKE '%i heart chardonnay%' THEN 'A rounded Chardonnay with ripe fruit flavours and smooth finish.'
        WHEN LOWER(name) LIKE '%i heart rosado%' THEN 'A refreshing rosé with soft berry flavours and crisp finish.'
        WHEN LOWER(name) LIKE '%jamshed chardonnay%' THEN 'A smooth Chardonnay with ripe fruit flavours and rounded easy-drinking finish.'
        WHEN LOWER(name) LIKE '%lancers%' THEN 'A lightly sparkling Portuguese rosé with refreshing fruit character.'
        WHEN LOWER(name) LIKE '%macia batle red%' THEN 'A Mallorcan red wine with ripe fruit flavours and balanced structure.'
        WHEN LOWER(name) LIKE '%macia batle rosado%' THEN 'A Mallorcan rosé with fresh red fruit character and refreshing finish.'
        WHEN LOWER(name) LIKE '%macia batle white%' THEN 'A Mallorcan white wine with crisp citrus notes and refreshing acidity.'
        WHEN LOWER(name) LIKE '%marques de caceres crianza%' THEN 'A Rioja Crianza with red fruit, spice and gentle oak character.'
        WHEN LOWER(name) LIKE '%marques de caceres rosado%' THEN 'A refreshing Rioja rosé with strawberry and red berry flavours.'
        WHEN LOWER(name) LIKE '%marques de caceres white%' THEN 'A bright Spanish white wine with citrus fruit character and clean finish.'
        WHEN LOWER(name) LIKE '%martin codax%' THEN 'A premium Albariño with citrus, stone fruit and fresh acidity.'
        WHEN LOWER(name) LIKE '%mateus%' THEN 'A lightly sparkling rosé wine with gentle fruit sweetness and refreshing character.'
        WHEN LOWER(name) LIKE '%sangre del toro%' THEN 'A Spanish wine with ripe fruit flavours, balanced structure and smooth finish.'
        WHEN LOWER(name) LIKE '%sangria don simon%' THEN 'A classic Spanish sangria with fruity sweetness and refreshing character.'
        WHEN LOWER(name) LIKE '%sarria verdejo%' THEN 'A crisp Verdejo white wine with citrus and tropical fruit notes.'
        WHEN LOWER(name) LIKE '%vina sol%' THEN 'A popular Spanish white wine with crisp fruit flavour and refreshing finish.'
        WHEN LOWER(name) LIKE '%whispering angel%' THEN 'A premium Provence rosé with delicate red fruit flavours, crisp acidity and elegant dry finish.'
        WHEN LOWER(name) LIKE '%freixenet%' THEN 'A sparkling wine with lively bubbles, fresh fruit flavour and celebratory character.'
        WHEN LOWER(name) LIKE '%cava rigol%' THEN 'A traditional Spanish cava with crisp fruit flavour and lively bubbles.'
        WHEN LOWER(name) LIKE '%canella%' THEN 'A sparkling wine with bright bubbles and refreshing fruit character.'
        WHEN LOWER(name) LIKE '%biciclette pesci%' THEN 'A sparkling wine with fresh fruit flavour, lively bubbles and easy-drinking character.'

        /* =========================
           SPIRITS / LIQUEURS
        ========================= */

        WHEN LOWER(name) LIKE '%anis del mono dulce%' THEN 'A sweet Spanish anise liqueur with classic liquorice notes and smooth finish. Traditionally served after meals.'
        WHEN LOWER(name) LIKE '%anis del mono secas%' THEN 'A dry Spanish anise spirit with aromatic herbal character and liquorice notes.'
        WHEN LOWER(name) LIKE '%anis jordi%' THEN 'A traditional Mallorcan anise spirit with smooth liquorice flavour and herbal character.'
        WHEN LOWER(name) LIKE '%hierbas dulce%' THEN 'A traditional Mallorcan herbal liqueur with sweet botanical flavours. Best served chilled after meals.'
        WHEN LOWER(name) LIKE '%hierbas mix%' THEN 'A balanced Mallorcan herbal liqueur combining sweet and dry Mediterranean botanicals.'
        WHEN LOWER(name) LIKE '%hierbas seca%' THEN 'A dry Mallorcan herbal liqueur with aromatic Mediterranean herb character.'
        WHEN LOWER(name) LIKE '%licor hierbas%' THEN 'A herbal liqueur infused with aromatic botanicals and Mediterranean character.'
        WHEN LOWER(name) LIKE '%palo tunel%' THEN 'A traditional Mallorcan aperitif with bittersweet herbal flavour. Best served chilled.'
        WHEN LOWER(name) LIKE '%pernod%' THEN 'A classic anise spirit with liquorice and herbal notes. Traditionally served with cold water.'
        WHEN LOWER(name) LIKE '%ricard%' THEN 'A French pastis with bold anise flavour and herbal character. Best served diluted with cold water.'
        WHEN LOWER(name) LIKE '%campari%' THEN 'A famous Italian bitter aperitif with orange and herbal flavours. Essential for classic cocktails.'
        WHEN LOWER(name) LIKE '%martini bianco%' THEN 'A sweet white vermouth with vanilla and botanical notes. Great over ice or with tonic.'
        WHEN LOWER(name) LIKE '%martini rosso%' THEN 'A rich red vermouth with spice, herbs and caramel character.'
        WHEN LOWER(name) LIKE '%martini dry%' THEN 'A dry vermouth with crisp herbal character, essential for classic martinis.'
        WHEN LOWER(name) LIKE '%martini asti%' THEN 'A sweet sparkling Italian wine with fruity and floral character.'
        WHEN LOWER(name) LIKE '%yzaguirre%' THEN 'A Spanish vermouth with aromatic herbs, citrus notes and gentle sweetness.'
        WHEN LOWER(name) LIKE '%103%' THEN 'A popular Spanish brandy with smooth oak, dried fruit and warming character.'
        WHEN LOWER(name) LIKE '%asbach%' THEN 'A German brandy with smooth fruit, oak notes and warming finish.'
        WHEN LOWER(name) LIKE '%cardinal mendoza%' THEN 'A premium Spanish brandy with raisin, oak and spice character.'
        WHEN LOWER(name) LIKE '%carlos i%' THEN 'A premium Spanish brandy with rich oak, dried fruit and vanilla flavours.'
        WHEN LOWER(name) LIKE '%carlos iii%' THEN 'A smooth Spanish brandy with mellow oak and caramel notes.'
        WHEN LOWER(name) LIKE '%grand duque%' THEN 'A rich Spanish brandy with oak, raisin and warming spice character.'
        WHEN LOWER(name) LIKE '%lepanto%' THEN 'A luxury Spanish brandy with elegant oak and dried fruit flavours.'
        WHEN LOWER(name) LIKE '%magno%' THEN 'A Spanish brandy with mellow oak and caramel notes.'
        WHEN LOWER(name) LIKE '%metaxa 5%' THEN 'A Greek spirit with smooth brandy character, soft fruit notes and warming finish.'
        WHEN LOWER(name) LIKE '%metaxa 7%' THEN 'A richer Greek spirit with oak, dried fruit and smooth warming character.'
        WHEN LOWER(name) LIKE '%ponche caballero%' THEN 'A Spanish liqueur with brandy, spice and citrus flavours.'
        WHEN LOWER(name) LIKE '%soberano%' THEN 'A smooth Spanish brandy with gentle dried fruit and oak character.'
        WHEN LOWER(name) LIKE '%terrys%' THEN 'A classic Spanish brandy with smooth oak and fruit character.'
        WHEN LOWER(name) LIKE '%tio pedro%' THEN 'A Spanish brandy-style spirit with sweet fruit and oak flavours.'
        WHEN LOWER(name) LIKE '%torres 10%' THEN 'A Spanish brandy with vanilla, oak and dried fruit notes.'
        WHEN LOWER(name) LIKE '%torres 5%' THEN 'A light Spanish brandy with fruit, oak and smooth character.'
        WHEN LOWER(name) LIKE '%veterano%' THEN 'A classic Spanish spirit with smooth oak, caramel and warming notes.'
        WHEN LOWER(name) LIKE '%courvoisier%' THEN 'A French cognac with fruit, oak and floral notes. Smooth and versatile.'
        WHEN LOWER(name) LIKE '%hennessy%' THEN 'A premium cognac with rich fruit, oak and warming spice character.'
        WHEN LOWER(name) LIKE '%martell%' THEN 'A refined cognac with soft fruit flavours and vanilla undertones.'
        WHEN LOWER(name) LIKE '%banana caiman%' THEN 'A banana syrup with tropical fruit sweetness. Ideal for cocktails and dessert drinks.'
        WHEN LOWER(name) LIKE '%blackcurrant caiman%' THEN 'A blackcurrant syrup with rich berry flavour, ideal for cocktails and soft drinks.'
        WHEN LOWER(name) LIKE '%blue curacao caiman%' THEN 'A blue orange-flavoured syrup that adds colour and citrus flavour to cocktails.'
        WHEN LOWER(name) LIKE '%coco caiman%' THEN 'A coconut syrup with smooth tropical sweetness, perfect for exotic drinks.'
        WHEN LOWER(name) LIKE '%frambuesa caiman%' THEN 'A raspberry syrup bursting with sweet berry flavour.'
        WHEN LOWER(name) LIKE '%green apple caiman%' THEN 'A green apple syrup with crisp fruit sweetness.'
        WHEN LOWER(name) LIKE '%grenadina caiman%' THEN 'A grenadine syrup with sweet red fruit flavour, ideal for cocktails.'
        WHEN LOWER(name) LIKE '%kiwi caiman%' THEN 'A kiwi syrup with tropical fruit sweetness and bright flavour.'
        WHEN LOWER(name) LIKE '%lime caiman%' THEN 'A lime syrup with sharp citrus flavour and refreshing sweetness.'
        WHEN LOWER(name) LIKE '%maracuya caiman%' THEN 'A passion fruit syrup with tropical sweetness and tangy fruit notes.'
        WHEN LOWER(name) LIKE '%peach caiman%' THEN 'A peach syrup with juicy stone fruit flavour.'
        WHEN LOWER(name) LIKE '%strawberry caiman%' THEN 'A strawberry syrup with vibrant berry sweetness.'
        WHEN LOWER(name) LIKE '%tropical blue caiman%' THEN 'A colourful tropical syrup with sweet exotic fruit character.'
        WHEN LOWER(name) LIKE '%mango caiman%' THEN 'A mango syrup with rich tropical fruit flavour and smooth sweetness.'
        WHEN LOWER(name) LIKE '%bora bora coconut milk%' THEN 'A creamy coconut mixer designed for tropical cocktails and frozen drinks.'
        WHEN LOWER(name) LIKE '%bora bora flor%' THEN 'An elderflower syrup with delicate floral sweetness, ideal for spritzes and refreshing cocktails.'
        WHEN LOWER(name) LIKE '%bora bora goma%' THEN 'A gomme syrup used to sweeten cocktails and add smooth texture.'
        WHEN LOWER(name) LIKE '%bora bora fresa%' THEN 'A strawberry syrup with vibrant fruit sweetness, ideal for cocktails and desserts.'
        WHEN LOWER(name) LIKE '%bora bora passion%' THEN 'A passion fruit syrup with tropical sweetness and tangy refreshing flavour.'
        WHEN LOWER(name) LIKE '%bora bora coconut%' THEN 'A coconut syrup with smooth exotic flavour, ideal for tropical cocktails.'
        WHEN LOWER(name) LIKE '%bora bora mojito%' THEN 'A mint syrup designed for mojitos and refreshing mixed drinks.'
        WHEN LOWER(name) LIKE '%bora bora vanilla%' THEN 'A vanilla syrup with sweet creamy flavour, ideal for coffees, cocktails and desserts.'
        WHEN LOWER(name) LIKE '%puree bora bora fresa%' THEN 'A strawberry fruit puree with authentic berry flavour and smooth cocktail texture.'
        WHEN LOWER(name) LIKE '%puree bora bora mango%' THEN 'A mango fruit puree with tropical fruit character, ideal for cocktails and smoothies.'
        WHEN LOWER(name) LIKE '%beefeater rose%' THEN 'A pink gin with strawberry-inspired fruit flavours and smooth botanical character.'
        WHEN LOWER(name) LIKE '%beefeater%' THEN 'A classic London dry gin with bold juniper and citrus notes.'
        WHEN LOWER(name) LIKE '%boe violet%' THEN 'A violet flavoured gin with floral sweetness and smooth botanical character.'
        WHEN LOWER(name) LIKE '%bombay%' THEN 'A premium gin with bright citrus, juniper and aromatic botanical flavours.'
        WHEN LOWER(name) LIKE '%bulldog%' OR LOWER(name) LIKE '%buldog%' THEN 'A premium London dry gin with crisp juniper, citrus and floral botanical notes.'
        WHEN LOWER(name) LIKE '%brockmans%' THEN 'A fruity premium gin with berry, citrus and botanical notes.'
        WHEN LOWER(name) LIKE '%botanist%' THEN 'A Scottish gin made with a wide range of botanicals for complex flavour.'
        WHEN LOWER(name) LIKE '%gin eva%' THEN 'A Mediterranean gin with fresh citrus and botanical flavours.'
        WHEN LOWER(name) LIKE '%gordons no%' THEN 'An alcohol-free botanical spirit inspired by classic gin flavour.'
        WHEN LOWER(name) LIKE '%gordons pink%' THEN 'A berry flavoured pink gin with sweet fruit notes and classic gin character.'
        WHEN LOWER(name) LIKE '%gordons sicillian%' THEN 'A citrus gin bursting with lemon character and refreshing botanical notes.'
        WHEN LOWER(name) LIKE '%gordons%' THEN 'A classic gin with juniper and citrus character, ideal with tonic.'
        WHEN LOWER(name) LIKE '%hendricks%' THEN 'A premium gin known for cucumber and rose botanical notes.'
        WHEN LOWER(name) LIKE '%larios rose%' THEN 'A strawberry-inspired Spanish pink gin with smooth fruity finish.'
        WHEN LOWER(name) LIKE '%larios 12%' THEN 'A premium Spanish gin with citrus and botanical character.'
        WHEN LOWER(name) LIKE '%larios%' THEN 'A Spanish gin with fresh citrus and juniper notes.'
        WHEN LOWER(name) LIKE '%london no%' THEN 'A distinctive premium gin with elegant botanical character.'
        WHEN LOWER(name) LIKE '%mare%' THEN 'A Mediterranean gin with olive, thyme and citrus botanicals.'
        WHEN LOWER(name) LIKE '%monkey%' THEN 'A premium gin with complex botanicals and citrus notes.'
        WHEN LOWER(name) LIKE '%nordes%' THEN 'A Galician gin known for floral, fruity and aromatic botanicals.'
        WHEN LOWER(name) LIKE '%palmbridge pink%' THEN 'A pink gin with berry sweetness and easy-drinking character.'
        WHEN LOWER(name) LIKE '%palmbridge%' THEN 'A straightforward gin with classic juniper and citrus flavours.'
        WHEN LOWER(name) LIKE '%puerto de indias%' THEN 'A Spanish strawberry gin with vibrant fruit flavour and smooth finish.'
        WHEN LOWER(name) LIKE '%seagrams%' THEN 'A smooth gin with traditional juniper and citrus character.'
        WHEN LOWER(name) LIKE '%sharish%' THEN 'A Portuguese gin with apple, citrus and aromatic botanical notes.'
        WHEN LOWER(name) LIKE '%suau%' THEN 'A locally popular gin with clean botanical flavour and smooth finish.'
        WHEN LOWER(name) LIKE '%tanqueray 10%' THEN 'A premium citrus-forward gin with refined botanicals.'
        WHEN LOWER(name) LIKE '%tanqueray zero%' THEN 'An alcohol-free botanical spirit inspired by classic Tanqueray gin.'
        WHEN LOWER(name) LIKE '%tanqueray seville%' THEN 'A Seville orange gin with bright citrus sweetness and classic botanicals.'
        WHEN LOWER(name) LIKE '%tanqueray royale%' THEN 'A blackcurrant flavoured gin with rich berry notes.'
        WHEN LOWER(name) LIKE '%tanqueray rangpur%' THEN 'A lime-forward gin with zesty citrus character and balanced botanicals.'
        WHEN LOWER(name) LIKE '%tanqueray%' THEN 'A classic London dry gin with bold juniper and crisp citrus character.'
        WHEN LOWER(name) LIKE '%xoriguer%' THEN 'A famous Menorcan gin with bold juniper character and traditional island heritage.'
        WHEN LOWER(name) LIKE '%whitley neill%rhubarb%' THEN 'A flavoured gin combining sweet rhubarb with warming ginger spice.'
        WHEN LOWER(name) LIKE '%whitley neill%blood orange%' THEN 'A blood orange gin with bright citrus flavour and smooth botanical balance.'
        WHEN LOWER(name) LIKE '%whitley neill%raspberry%' THEN 'A raspberry gin with rich berry notes and refreshing finish.'
        WHEN LOWER(name) LIKE '%whitley neill%parma%' THEN 'A floral gin inspired by Parma Violet sweets with delicate sweet character.'

        /* =========================
           RUMS / TEQUILA / VODKA / WHISKY
        ========================= */

        WHEN LOWER(name) LIKE '%bacardi black%' THEN 'A dark rum with rich oak, vanilla and caramel flavours. Ideal with cola or in cocktails.'
        WHEN LOWER(name) LIKE '%bacardi carta fuego%' THEN 'A spiced rum with cinnamon heat and warming flavour.'
        WHEN LOWER(name) LIKE '%bacardi gold%' THEN 'A golden rum with vanilla, caramel and oak notes.'
        WHEN LOWER(name) LIKE '%bacardi lemon%' THEN 'A lemon flavoured rum with bright citrus character.'
        WHEN LOWER(name) LIKE '%bacardi razz%' THEN 'A raspberry flavoured rum with sweet berry notes.'
        WHEN LOWER(name) LIKE '%bacardi%' THEN 'A light rum with smooth clean flavour, ideal for mojitos and classic cocktails.'
        WHEN LOWER(name) LIKE '%barcelo%' THEN 'A Dominican rum with rich vanilla, oak and caramel notes.'
        WHEN LOWER(name) LIKE '%brugal%' THEN 'A Dominican rum with dry oak character and balanced spice.'
        WHEN LOWER(name) LIKE '%bumbu%' THEN 'A premium rum with banana, vanilla and caramel notes.'
        WHEN LOWER(name) LIKE '%cacique%' THEN 'A Venezuelan rum with soft oak and spice flavours.'
        WHEN LOWER(name) LIKE '%cachaza%' THEN 'A Brazilian sugarcane spirit used in caipirinhas and tropical cocktails.'
        WHEN LOWER(name) LIKE '%captain morgan black%' THEN 'A dark spiced rum with molasses, vanilla and warming spice character.'
        WHEN LOWER(name) LIKE '%captain morgan dark%' THEN 'A dark rum with warming spice and oak character.'
        WHEN LOWER(name) LIKE '%captain morgan white%' THEN 'A clean white rum with smooth finish, ideal for mojitos and tropical drinks.'
        WHEN LOWER(name) LIKE '%captain morgan%' THEN 'A spiced rum with vanilla, caramel and warming spice notes. Excellent with cola.'
        WHEN LOWER(name) LIKE '%havana club 3%' THEN 'A Cuban white rum with smooth vanilla and light oak character.'
        WHEN LOWER(name) LIKE '%havana club 5%' THEN 'A Cuban aged rum with oak, vanilla and tropical fruit character.'
        WHEN LOWER(name) LIKE '%havana club 7%' THEN 'A premium Cuban rum with deep oak, vanilla and spice notes.'
        WHEN LOWER(name) LIKE '%kraken%' THEN 'A black spiced rum with bold molasses, vanilla and spice flavours.'
        WHEN LOWER(name) LIKE '%legendario%' THEN 'A Cuban rum liqueur with raisin sweetness and smooth oak notes.'
        WHEN LOWER(name) LIKE '%matusalem%' THEN 'An aged premium rum with oak, vanilla and dried fruit flavour.'
        WHEN LOWER(name) LIKE '%mount gay%' THEN 'A Barbados rum with balanced oak and vanilla character.'
        WHEN LOWER(name) LIKE '%pampero%' THEN 'A Venezuelan rum with caramel, spice and oak notes.'
        WHEN LOWER(name) LIKE '%sailor jerry%' THEN 'A spiced rum with vanilla, cinnamon and rich sweetness.'
        WHEN LOWER(name) LIKE '%stroh%' THEN 'A powerful Austrian rum-style spirit with intense spice and warming flavour.'
        WHEN LOWER(name) LIKE '%tobacco honey%' THEN 'A honey flavoured spirit with smooth sweetness and warming character.'
        WHEN LOWER(name) LIKE '%tobacco%' THEN 'A rum-style spirit with smooth flavour and easy-drinking character.'
        WHEN LOWER(name) LIKE '%trinidad%' THEN 'A rum-style spirit with tropical sweetness and smooth finish.'
        WHEN LOWER(name) LIKE '%peach tunel%' OR LOWER(name) LIKE '%peach schnapps%' THEN 'A peach flavoured schnapps with juicy fruit sweetness and smooth finish.'
        WHEN LOWER(name) LIKE '%apple tunel%' THEN 'An apple schnapps with crisp fruit flavour and refreshing character.'
        WHEN LOWER(name) LIKE '%kiwi tunel%' THEN 'A kiwi flavoured schnapps with tropical fruit sweetness.'
        WHEN LOWER(name) LIKE '%strawberry tunel%' OR LOWER(name) LIKE '%strawberry schnapps%' THEN 'A strawberry schnapps with sweet berry flavour and smooth finish.'
        WHEN LOWER(name) LIKE '%melon vealt%' THEN 'A melon liqueur with sweet tropical notes.'
        WHEN LOWER(name) LIKE '%aguascalientes coffee%' THEN 'A coffee flavoured tequila-style liqueur with roasted sweetness.'
        WHEN LOWER(name) LIKE '%aguascalientes mango%' THEN 'A mango flavoured tequila-style spirit with tropical sweetness.'
        WHEN LOWER(name) LIKE '%aguascalientes strawberry%' THEN 'A strawberry flavoured tequila-style spirit with sweet berry character.'
        WHEN LOWER(name) LIKE '%aguascalientes%' THEN 'A tequila-style spirit with smooth agave character, ideal for shots and cocktails.'
        WHEN LOWER(name) LIKE '%cazcabel%' THEN 'A coffee tequila liqueur with roasted coffee and agave flavour.'
        WHEN LOWER(name) LIKE '%don julio 1942%' THEN 'A luxury aged tequila with caramel, vanilla and agave character.'
        WHEN LOWER(name) LIKE '%don julio reposado%' THEN 'A rested tequila with smooth oak, vanilla and agave notes.'
        WHEN LOWER(name) LIKE '%don julio blanco%' THEN 'A premium blanco tequila with crisp agave, citrus and pepper notes.'
        WHEN LOWER(name) LIKE '%jose cuervo gold%' THEN 'A gold tequila with mellow agave and light oak character.'
        WHEN LOWER(name) LIKE '%jose cuervo silver%' THEN 'A silver tequila with clean agave flavour and crisp finish.'
        WHEN LOWER(name) LIKE '%mexicali fresa%' THEN 'A strawberry tequila-style liqueur with sweet berry flavour.'
        WHEN LOWER(name) LIKE '%tequila rose%' THEN 'A creamy strawberry tequila liqueur with sweet dessert-style flavour.'
        WHEN LOWER(name) LIKE '%absolut blue%' THEN 'A classic Swedish vodka with clean crisp flavour and smooth finish.'
        WHEN LOWER(name) LIKE '%absolut mango%' THEN 'A mango flavoured vodka with tropical sweetness and smooth finish.'
        WHEN LOWER(name) LIKE '%absolut wildberries%' THEN 'A berry flavoured vodka with forest fruit character.'
        WHEN LOWER(name) LIKE '%absolut raspberry%' THEN 'A raspberry flavoured vodka with bright berry notes.'
        WHEN LOWER(name) LIKE '%absolut peach%' THEN 'A peach flavoured vodka with juicy fruit character.'
        WHEN LOWER(name) LIKE '%absolut peppar%' OR LOWER(name) LIKE '%abslout peppar%' THEN 'A pepper infused vodka with warming spice, famous for Bloody Mary cocktails.'
        WHEN LOWER(name) LIKE '%absolut passion%' THEN 'A passion fruit vodka with bright tropical flavour.'
        WHEN LOWER(name) LIKE '%absolut vanilla%' THEN 'A vanilla vodka with smooth creamy sweetness.'
        WHEN LOWER(name) LIKE '%au raspberry%' THEN 'A premium raspberry flavoured vodka with smooth finish and sweet berry notes.'
        WHEN LOWER(name) LIKE '%au watermelon%' THEN 'A premium watermelon flavoured vodka with refreshing fruit sweetness.'
        WHEN LOWER(name) LIKE '%au bubblegum%' THEN 'A sweet bubblegum flavoured vodka with playful candy flavour.'
        WHEN LOWER(name) LIKE '%belvedere%' THEN 'A premium Polish vodka with rich smooth texture and refined finish.'
        WHEN LOWER(name) LIKE '%ciroc red berry%' THEN 'A berry flavoured premium vodka with sweet fruit notes.'
        WHEN LOWER(name) LIKE '%ciroc pineapple%' THEN 'A tropical pineapple flavoured vodka with smooth sweetness.'
        WHEN LOWER(name) LIKE '%ciroc peach%' THEN 'A peach flavoured premium vodka with juicy fruit character.'
        WHEN LOWER(name) LIKE '%ciroc%' THEN 'A premium French vodka distilled from grapes for a smooth refined finish.'
        WHEN LOWER(name) LIKE '%crystal head%' THEN 'A premium vodka known for exceptional purity and smoothness.'
        WHEN LOWER(name) LIKE '%finlandia%' THEN 'A Finnish vodka with clean smooth taste and crisp finish.'
        WHEN LOWER(name) LIKE '%grey goose citron%' THEN 'A premium lemon flavoured vodka with vibrant citrus freshness.'
        WHEN LOWER(name) LIKE '%grey goose%' THEN 'A premium French vodka with refined smoothness and clean finish.'
        WHEN LOWER(name) LIKE '%jerikoff%' THEN 'A clean vodka with smooth flavour and versatile mixing character.'
        WHEN LOWER(name) LIKE '%ketel%' THEN 'A Dutch premium vodka with crisp clean finish and balanced flavour.'
        WHEN LOWER(name) LIKE '%moskovskaya%' THEN 'A classic vodka with crisp spirit character and clean finish.'
        WHEN LOWER(name) LIKE '%naga chilli%' THEN 'A fiery chilli infused vodka with intense heat and bold flavour.'
        WHEN LOWER(name) LIKE '%rushkinoff caramel%' THEN 'A caramel flavoured vodka with rich sweetness and smooth finish.'
        WHEN LOWER(name) LIKE '%rushkinoff vanilla%' THEN 'A vanilla vodka with sweet creamy character.'
        WHEN LOWER(name) LIKE '%rushkinoff strawberry%lime%' THEN 'A fruit flavoured vodka combining strawberry sweetness with zesty lime.'
        WHEN LOWER(name) LIKE '%rushkinoff strawberry%' THEN 'A strawberry flavoured vodka with juicy berry sweetness.'
        WHEN LOWER(name) LIKE '%rushkinoff mix fruit%' THEN 'A mixed fruit vodka packed with sweet fruit flavours.'
        WHEN LOWER(name) LIKE '%rushkinoff%' THEN 'A smooth vodka with clean neutral flavour and versatile mixing character.'
        WHEN LOWER(name) LIKE '%russian standard%' THEN 'A premium vodka with crisp flavour and smooth finish.'
        WHEN LOWER(name) LIKE '%smirnoff mango%' THEN 'A tropical flavoured vodka blending mango and passion fruit notes.'
        WHEN LOWER(name) LIKE '%smirnoff rosca%' THEN 'A smooth vodka with clean flavour and versatile mixing potential.'
        WHEN LOWER(name) LIKE '%smirnoff valve%' THEN 'A party-format vodka product with classic clean Smirnoff character.'
        WHEN LOWER(name) LIKE '%smirnoff blue%' THEN 'A stronger vodka with clean bold character, ideal for mixers.'
        WHEN LOWER(name) LIKE '%smirnoff%' THEN 'A classic vodka with clean crisp flavour and smooth finish.'
        WHEN LOWER(name) LIKE '%stolichnaya%' THEN 'A traditional vodka with smooth grain character and balanced finish.'
        WHEN LOWER(name) LIKE '%titos%' THEN 'An American craft vodka with smooth, slightly sweet character.'

        /* =========================
           WHISKY / WHISKEY
        ========================= */

        WHEN LOWER(name) LIKE '%canadian club%' THEN 'A smooth Canadian whisky with vanilla, grain and oak notes.'
        WHEN LOWER(name) LIKE '%four roses%' THEN 'A Kentucky bourbon with smooth vanilla, caramel and spice flavours.'
        WHEN LOWER(name) LIKE '%gentleman jack%' THEN 'A double charcoal mellowed Tennessee whiskey with exceptional smoothness.'
        WHEN LOWER(name) LIKE '%jack daniels single barrel%' THEN 'A premium Tennessee whiskey selected from individual barrels, with oak, caramel and spice.'
        WHEN LOWER(name) LIKE '%jack daniels fire%' THEN 'A cinnamon whiskey liqueur with sweet warming spice.'
        WHEN LOWER(name) LIKE '%jack daniels honey%' THEN 'A honey whiskey liqueur with smooth sweetness and gentle whiskey character.'
        WHEN LOWER(name) LIKE '%jack daniels apple%' THEN 'An apple flavoured whiskey liqueur with crisp fruit and Tennessee whiskey character.'
        WHEN LOWER(name) LIKE '%jack daniels%' THEN 'A classic Tennessee whiskey with vanilla, oak and charcoal mellowed smoothness.'
        WHEN LOWER(name) LIKE '%jim beam honey%' OR LOWER(name) LIKE '%jim bean honey%' THEN 'A honey infused bourbon liqueur with whiskey warmth and sweet honey notes.'
        WHEN LOWER(name) LIKE '%jim beam%' OR LOWER(name) LIKE '%jim bean%' THEN 'A Kentucky bourbon with oak, caramel and vanilla flavours.'
        WHEN LOWER(name) LIKE '%southern comfort%' THEN 'A whiskey-based liqueur with fruit and spice flavours.'
        WHEN LOWER(name) LIKE '%black bush%' THEN 'A rich Irish whiskey with malt depth and sherry cask influence.'
        WHEN LOWER(name) LIKE '%bushmills%' THEN 'A smooth Irish whiskey with gentle honey and fruit notes.'
        WHEN LOWER(name) LIKE '%jameson%' THEN 'A smooth Irish whiskey with vanilla and gentle spice character.'
        WHEN LOWER(name) LIKE '%paddy%' THEN 'An easy-drinking Irish whiskey with smooth grain and malt character.'
        WHEN LOWER(name) LIKE '%tullamore%' THEN 'A triple distilled Irish whiskey with vanilla and gentle spice notes.'
        WHEN LOWER(name) LIKE '%ballantines%' THEN 'A blended Scotch whisky with honey, oak and malt notes.'
        WHEN LOWER(name) LIKE '%bells%' THEN 'A classic blended Scotch whisky with soft spice and malt character.'
        WHEN LOWER(name) LIKE '%cardhu%' THEN 'A Speyside single malt with honeyed fruit and smooth character.'
        WHEN LOWER(name) LIKE '%chivas%' THEN 'A premium blended Scotch whisky with honey, fruit and oak notes.'
        WHEN LOWER(name) LIKE '%cutty sark%' THEN 'A lighter blended Scotch with citrus and vanilla notes.'
        WHEN LOWER(name) LIKE '%famous grouse%' THEN 'A smooth blended Scotch whisky with malt and oak flavours.'
        WHEN LOWER(name) LIKE '%fireball%' THEN 'A cinnamon whisky liqueur with warming spice and sweet flavour.'
        WHEN LOWER(name) LIKE '%glenfiddich%' THEN 'A Speyside single malt with pear, malt and oak flavours.'
        WHEN LOWER(name) LIKE '%glenmorangie%' THEN 'A Highland single malt with vanilla, fruit and oak flavours.'
        WHEN LOWER(name) LIKE '%glenkinchie%' THEN 'A Lowland single malt with floral notes, smooth texture and light citrus character.'
        WHEN LOWER(name) LIKE '%goldenheart%' THEN 'A blended whisky with smooth flavour, gentle sweetness and approachable character.'
        WHEN LOWER(name) LIKE '%grants%' THEN 'A blended Scotch whisky with vanilla, fruit and oak notes.'
        WHEN LOWER(name) LIKE '%highlander%' THEN 'A Scotch-style whisky with mellow malt and oak character.'
        WHEN LOWER(name) LIKE '%j&b%' OR LOWER(name) LIKE '%j and b%' THEN 'A smooth blended Scotch whisky with light malt and fruit notes.'
        WHEN LOWER(name) LIKE '%johnny walker black%' OR LOWER(name) LIKE '%johnnie walker black%' THEN 'A premium blended Scotch whisky with rich fruit, oak and gentle smoke.'
        WHEN LOWER(name) LIKE '%johnny walker red%' OR LOWER(name) LIKE '%johnnie walker red%' THEN 'A blended Scotch whisky with bold flavour and subtle smoky character.'
        WHEN LOWER(name) LIKE '%johnny walker blue%' THEN 'A luxury blended Scotch whisky with rich complexity, smooth texture and exceptional depth.'
        WHEN LOWER(name) LIKE '%macallan%' THEN 'A highly regarded single malt Scotch whisky with dried fruit, vanilla, spice and oak character.'
        WHEN LOWER(name) LIKE '%talisker%' THEN 'An island single malt Scotch whisky with maritime character, peppery spice and gentle smoke.'
        WHEN LOWER(name) LIKE '%teachers%' THEN 'A blended Scotch whisky with fuller malt profile and gentle smoky notes.'
        WHEN LOWER(name) LIKE '%whyte%' THEN 'A smooth blended Scotch whisky with balanced malt, oak and honey notes.'
        WHEN LOWER(name) LIKE '%william lawson%' THEN 'A blended Scotch whisky with smooth sweet character and light spice.'

        /* =========================
           FROZEN FOOD
        ========================= */

        WHEN LOWER(name) LIKE '%chicken%mushroom%pie%' THEN 'A traditional British pie filled with tender chicken pieces and creamy mushroom sauce, wrapped in golden pastry.'
        WHEN LOWER(name) LIKE '%mince%onion%pie%' THEN 'A hearty pie packed with seasoned minced beef and onion in rich savoury gravy.'
        WHEN LOWER(name) LIKE '%steak%guinness%pie%' THEN 'A premium pie filled with steak and rich Guinness gravy, wrapped in golden flaky pastry.'
        WHEN LOWER(name) LIKE '%steak%kidney%pie%' THEN 'A classic British pie combining steak and kidney in rich savoury gravy.'
        WHEN LOWER(name) LIKE '%steak pie%' THEN 'A hearty steak pie packed with tender beef and rich gravy in golden pastry.'
        WHEN LOWER(name) LIKE '%meat%potato%pie%' THEN 'A comforting pie filled with seasoned meat and potatoes in traditional gravy.'
        WHEN LOWER(name) LIKE '%cornish pastie%' THEN 'A traditional pastry filled with seasoned meat and vegetables.'
        WHEN LOWER(name) LIKE '%cheese%onion%pastie%' THEN 'A savoury pastry filled with cheese and onion.'
        WHEN LOWER(name) LIKE '%sausage roll%' THEN 'A generously sized sausage roll with seasoned sausage meat wrapped in golden puff pastry.'
        WHEN LOWER(name) LIKE '%bacon 2.25%' THEN 'A bulk pack of quality bacon, ideal for breakfasts, sandwiches and catering.'
        WHEN LOWER(name) LIKE '%bacon 400%' THEN 'A pack of quality bacon with rich savoury flavour, ideal for breakfasts and sandwiches.'
        WHEN LOWER(name) LIKE '%bacon 200%' THEN 'A convenient pack of bacon ideal for breakfasts and smaller meals.'
        WHEN LOWER(name) LIKE '%sausage bag%' THEN 'A large pack of traditional sausages, ideal for breakfasts, family meals and barbecues.'
        WHEN LOWER(name) LIKE '%sausage individual%' THEN 'A single traditional sausage with savoury flavour, ideal for breakfast rolls or quick meals.'
        WHEN LOWER(name) LIKE '%lorne sausage%' THEN 'Traditional Scottish square sausage with rich savoury flavour.'
        WHEN LOWER(name) LIKE '%black pudding single%' THEN 'A single portion of black pudding, ideal for cooked breakfasts.'
        WHEN LOWER(name) LIKE '%black pudding stick%' THEN 'A full stick of traditional black pudding, ideal for slicing and cooking.'
        WHEN LOWER(name) LIKE '%gammon joint%' THEN 'A frozen gammon joint sold by weight, ideal for roasting and serving hot or cold.'
        WHEN LOWER(name) LIKE '%gammon steak%' THEN 'Thick-cut gammon steaks with juicy texture and rich flavour.'
        WHEN LOWER(name) LIKE '%irish steak burger%' THEN 'A premium Irish steak burger with rich beef flavour and succulent texture.'
        WHEN LOWER(name) LIKE '%haggis%' THEN 'A traditional Scottish haggis with rich savoury flavour and authentic character.'
        WHEN LOWER(name) LIKE '%chicken kiev bag%' THEN 'A pack of chicken Kiev portions filled with garlic butter and coated for a crispy finish.'
        WHEN LOWER(name) LIKE '%chicken kiev single%' THEN 'A tender chicken Kiev filled with garlic butter, ideal for a quick meal.'
        WHEN LOWER(name) LIKE '%spicy chicken wings bag%' THEN 'A large pack of spicy chicken wings with bold seasoning and satisfying kick.'
        WHEN LOWER(name) LIKE '%spicy chicken wings single%' THEN 'A spicy chicken wing with bold seasoning, perfect as a snack or starter.'
        WHEN LOWER(name) LIKE '%southern fried chicken goujon%' THEN 'A bag of southern fried chicken goujon strips with crispy coating and tender chicken inside.'
        WHEN LOWER(name) LIKE '%pork pies%' THEN 'Traditional pork pies with seasoned pork filling and crisp pastry crust.'
        WHEN LOWER(name) LIKE '%thick bread%' THEN 'Frozen thick-sliced bread perfect for toast, sandwiches and everyday meals.'
        WHEN LOWER(name) LIKE '%medium bread%' THEN 'Soft medium-cut bread suitable for sandwiches, toast and snacks.'
        WHEN LOWER(name) LIKE '%wholemeal bread%' THEN 'Nutritious wholemeal bread with rich flavour and soft texture.'
        WHEN LOWER(name) LIKE '%malted wholegrain%' THEN 'A wholesome malted wholegrain loaf with rich flavour and hearty texture.'
        WHEN LOWER(name) LIKE '%dutch baps%' THEN 'Soft bread rolls ideal for breakfast rolls, sandwiches and lunchtime snacks.'
        WHEN LOWER(name) LIKE '%tea cakes%' THEN 'Traditional teacakes with fruit, delicious toasted and served warm with butter.'
        WHEN LOWER(name) LIKE '%crumpets%' THEN 'Traditional crumpets with soft texture, ideal toasted and buttered.'
        WHEN LOWER(name) LIKE '%muffins%' THEN 'Classic English muffins with soft texture, perfect toasted for breakfast or brunch.'
        WHEN LOWER(name) LIKE '%fruit scones%' THEN 'A traditional fruit scone with dried fruit, delicious with butter, jam or cream.'
        WHEN LOWER(name) LIKE '%jacket potato bag%' THEN 'A bag of baking potatoes ideal for oven cooking and serving with toppings.'
        WHEN LOWER(name) LIKE '%jacket potato single%' THEN 'A large baking potato perfect for a quick filling meal.'
        WHEN LOWER(name) LIKE '%hash brown%' THEN 'Golden crispy potato hash browns ideal for breakfasts and catering.'
        WHEN LOWER(name) LIKE '%chips 2.5%' THEN 'Frozen potato chips suitable for oven cooking or frying.'
        WHEN LOWER(name) LIKE '%potato scones%' THEN 'Traditional Scottish potato scones with soft texture and rich potato flavour.'
        WHEN LOWER(name) LIKE '%yorkshire puddings%' THEN 'Traditional Yorkshire puddings ideal for roast dinners and family meals.'

        /* =========================
           DRIED FOOD / SWEETS / CRISPS
        ========================= */

        WHEN LOWER(name) LIKE '%beans%' THEN 'Classic baked beans in tomato sauce, ideal for breakfasts, lunches and quick meals.'
        WHEN LOWER(name) LIKE '%branston pickle%' THEN 'A traditional British pickle with sweet and tangy vegetable flavour.'
        WHEN LOWER(name) LIKE '%colmans mustard%' THEN 'A classic English mustard with strong distinctive flavour.'
        WHEN LOWER(name) LIKE '%corned beef%' THEN 'A tinned cooked beef product suitable for sandwiches, salads and meals.'
        WHEN LOWER(name) LIKE '%crackers%' THEN 'Crisp savoury crackers ideal for cheese boards, snacks and light bites.'
        WHEN LOWER(name) LIKE '%gravy%' THEN 'A savoury gravy product ideal for roast dinners, pies and hearty meals.'
        WHEN LOWER(name) LIKE '%heinz ketchup%' THEN 'A rich tomato ketchup made with sun-ripened tomatoes.'
        WHEN LOWER(name) LIKE '%hp sauce%' THEN 'A traditional brown sauce with tangy fruity flavour.'
        WHEN LOWER(name) LIKE '%lea%perrins%' THEN 'A famous Worcestershire sauce with rich savoury flavour.'
        WHEN LOWER(name) LIKE '%mint sauce%' THEN 'A classic mint condiment often served with lamb and roast dishes.'
        WHEN LOWER(name) LIKE '%mushy peas%' THEN 'Traditional mushy peas perfect with pies, fish and chips and hearty meals.'
        WHEN LOWER(name) LIKE '%pot noodle%' THEN 'A quick instant noodle snack with savoury flavour and easy preparation.'
        WHEN LOWER(name) LIKE '%sarsons vinegar%' THEN 'A traditional malt vinegar ideal for chips, cooking and seasoning.'
        WHEN LOWER(name) LIKE '%soup chicken%' THEN 'A comforting chicken soup, ready to heat and enjoy.'
        WHEN LOWER(name) LIKE '%soup tomato%' THEN 'A smooth tomato soup with rich comforting flavour.'
        WHEN LOWER(name) LIKE '%tabasco%' THEN 'A famous hot sauce made with aged peppers for a spicy kick.'
        WHEN LOWER(name) LIKE '%tea bags%' THEN 'Classic tea bags ideal for making a proper cup of tea.'
        WHEN LOWER(name) LIKE '%twirl%' THEN 'A flaky milk chocolate bar made with delicate swirls of Cadbury chocolate.'
        WHEN LOWER(name) LIKE '%dairy milk%' THEN 'A classic milk chocolate bar with rich creamy taste.'
        WHEN LOWER(name) LIKE '%whole nut%' THEN 'A milk chocolate bar with whole roasted hazelnuts.'
        WHEN LOWER(name) LIKE '%fruit%nut%' THEN 'A milk chocolate bar packed with raisins and crunchy nuts.'
        WHEN LOWER(name) LIKE '%crunchie%' THEN 'A chocolate-coated honeycomb bar with a crunchy centre.'
        WHEN LOWER(name) LIKE '%caramel%' THEN 'A milk chocolate bar filled with smooth flowing caramel.'
        WHEN LOWER(name) LIKE '%walkers%' THEN 'Classic potato crisps available in a variety of popular flavours.'
        WHEN LOWER(name) LIKE '%lays%' THEN 'Large bags of crisps with bold flavour and crunchy texture, ideal for sharing.'
        WHEN LOWER(name) LIKE '%nuts%' THEN 'A savoury nut snack ideal for sharing, parties and bar snacks.'
        WHEN LOWER(name) LIKE '%bacon fries%' THEN 'A crunchy bacon-flavoured snack, ideal for bar snacks and sharing.'
        WHEN LOWER(name) LIKE '%scampi fries%' THEN 'A classic pub-style savoury snack with seafood-inspired flavour.'
        WHEN LOWER(name) LIKE '%pork scratchings%' THEN 'A crunchy savoury pork snack with bold traditional flavour.'
        WHEN LOWER(name) LIKE '%chewing gum%' OR LOWER(name) LIKE '%orbit%' THEN 'A convenient chewing gum product for freshening up on the go.'

        /* =========================
           FINAL REAL CATEGORY DESCRIPTIONS
        ========================= */

        WHEN LOWER(category) LIKE '%beer%' THEN 'A refreshing beer with crisp flavour and easy-drinking character. Best served chilled.'
        WHEN LOWER(category) LIKE '%cider%' THEN 'A refreshing cider with fruit-forward flavour and crisp finish. Best served chilled.'
        WHEN LOWER(category) LIKE '%alco%' THEN 'A ready-to-drink alcoholic beverage with fruity flavour and refreshing easy-drinking character.'
        WHEN LOWER(category) LIKE '%wine%' THEN 'A quality wine with balanced flavour and easy-drinking character. Best served at the right temperature for its style.'
        WHEN LOWER(category) LIKE '%spirit%' THEN 'A quality spirit with smooth character and versatile serving options. Enjoy neat, over ice or mixed.'
        WHEN LOWER(category) LIKE '%liqueur%' OR LOWER(category) LIKE '%liquor%' THEN 'A smooth liqueur with distinctive flavour and sweet character. Ideal chilled, over ice or in cocktails.'
        WHEN LOWER(category) LIKE '%soft drink%' THEN 'A refreshing soft drink, mixer or juice product ideal served chilled.'
        WHEN LOWER(category) LIKE '%frozen%' THEN 'A convenient frozen food product ideal for quick meals, snacks or easy cooking.'
        WHEN LOWER(category) LIKE '%dried%' THEN 'A cupboard essential suitable for everyday meals, snacks or cooking.'
        WHEN LOWER(category) LIKE '%sweet%' THEN 'A sweet or savoury snack product ideal for treats, sharing or everyday snacking.'
        WHEN LOWER(category) LIKE '%miniature%' THEN 'A miniature bottle or multipack option, ideal for gifts, sampling, parties or travel.'

        ELSE description
      END
      WHERE description IS NULL
         OR TRIM(description) = ''
         OR LOWER(TRIM(description)) IN (
          'beer',
          'wine',
          'vodka',
          'gin',
          'rum',
          'whiskey',
          'tequila',
          'liqueur or spirit',
          'soft drink',
          'fruit juice',
          'energy drink',
          'bottled water',
          'frozen food item',
          'frozen meat product',
          'frozen bakery item',
          'frozen savoury pastry',
          'tinned grocery item',
          'condiment',
          'chocolate bar',
          'snack food',
          'sparkling wine',
          'miniature spirit',
          'miniature multipack',
          'ready-to-drink alcoholic beverage'
        );
    `);

    const count = await db.query(`
      SELECT COUNT(*) AS total,
             COUNT(description) AS with_descriptions
      FROM products;
    `);

    res.json({
      success: true,
      message: "Descriptions restored",
      counts: count.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});


app.listen(process.env.PORT || 10000, () => {
  console.log("Server running ✅");
});
