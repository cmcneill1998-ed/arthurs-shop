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
    const result = await db.query(`
      UPDATE products
      SET description = CASE

        /* =========================
           SPECIFIC WINES / CAVA / CHAMPAGNE
        ========================= */

        WHEN LOWER(TRIM(name)) = 'laurent perrier rose'
          THEN 'A prestigious rosé champagne with elegant red fruit flavours, fine bubbles and a refined finish. Perfect for celebrations, gifting and special occasions.'

        WHEN LOWER(TRIM(name)) = 'moet et chandon rose'
          THEN 'A luxurious rosé champagne with vibrant berry flavours, elegant bubbles and a smooth stylish finish. Ideal for celebrations and premium gifting.'

        WHEN LOWER(TRIM(name)) = 'moet et chandon brut'
          THEN 'A world-famous brut champagne with citrus, apple and brioche notes, balanced by fine bubbles and a clean refreshing finish.'

        WHEN LOWER(TRIM(name)) = 'veuve clicquot'
          THEN 'An iconic premium champagne known for rich fruit character, balanced acidity and elegant bubbles. A timeless choice for special occasions.'

        WHEN LOWER(TRIM(name)) = 'acantus blanco'
          THEN 'A fresh Spanish white wine with crisp fruit flavours, light acidity and an easy-drinking finish. Ideal served chilled with light meals or on its own.'

        WHEN LOWER(TRIM(name)) = 'acantus tinto'
          THEN 'A smooth Spanish red wine with ripe berry flavours, gentle tannins and a balanced finish. Great with food or casual evening drinks.'

        WHEN LOWER(TRIM(name)) = 'acantus rosado'
          THEN 'A refreshing Spanish rosé with delicate red fruit flavours and a crisp finish. Best served chilled.'

        WHEN LOWER(TRIM(name)) = 'bach tinto'
          THEN 'A popular Spanish red wine with soft berry flavours, smooth texture and approachable character. Ideal for pairing with a wide range of dishes.'

        WHEN LOWER(TRIM(name)) = 'bach seco'
          THEN 'A refreshing Spanish dry wine with crisp fruit notes and a clean finish. Great as an aperitif or with lighter meals.'

        WHEN LOWER(TRIM(name)) = 'bach semi'
          THEN 'A smooth semi-sweet Spanish wine with gentle fruit character and an easy-drinking finish. Best served chilled.'

        WHEN LOWER(TRIM(name)) = 'bach rosado (blush)'
          THEN 'A bright blush rosé with soft berry notes, gentle sweetness and refreshing character. Ideal served chilled.'

        WHEN LOWER(TRIM(name)) = 'bicicletes i peces rosado'
          THEN 'A refreshing Spanish rosé wine with red berry flavours, crisp acidity and a smooth finish. Perfect for warm evenings and Mediterranean food.'

        WHEN LOWER(TRIM(name)) = 'bicicletes i peces verdejo'
          THEN 'A fresh Verdejo white wine with citrus, tropical fruit and floral notes. Crisp, aromatic and refreshing.'

        WHEN LOWER(TRIM(name)) = 'bicicletes i peces sauv blanc'
          THEN 'A Sauvignon Blanc with citrus, gooseberry and tropical fruit flavours. Bright, lively and best served chilled.'

        WHEN LOWER(TRIM(name)) = 'campo viejo crianza'
          THEN 'A renowned Rioja Crianza aged in oak, offering rich berry fruit, vanilla notes and a smooth balanced finish.'

        WHEN LOWER(TRIM(name)) = 'conde de caralt rosado'
          THEN 'A delicate Spanish rosé with strawberry and raspberry notes, balanced acidity and a refreshing finish.'

        WHEN LOWER(TRIM(name)) = 'conde de caralt seco'
          THEN 'A dry Spanish wine with crisp fruit flavour and a clean finish. Great for everyday drinking and light meals.'

        WHEN LOWER(TRIM(name)) = 'conde de caralt semi'
          THEN 'A semi-sweet Spanish wine with soft fruit character, gentle sweetness and a smooth finish.'

        WHEN LOWER(TRIM(name)) = 'conde de caralt tinto'
          THEN 'A smooth Spanish red wine with ripe berry flavours, soft tannins and approachable character.'

        WHEN LOWER(TRIM(name)) = 'costa dor rosado'
          THEN 'A refreshing Spanish rosé with bright berry flavours and a crisp finish. Best served chilled.'

        WHEN LOWER(TRIM(name)) = 'costa dor tinto'
          THEN 'A balanced Spanish red wine with red fruit notes and a smooth easy-drinking finish.'

        WHEN LOWER(TRIM(name)) = 'costa dor select'
          THEN 'A smooth Spanish wine with rounded fruit character and an easy-drinking finish. Suitable for casual meals and gatherings.'

        WHEN LOWER(TRIM(name)) = 'echo falls chardonnay'
          THEN 'A popular Chardonnay with ripe tropical fruit flavours, subtle vanilla notes and a smooth approachable finish.'

        WHEN LOWER(TRIM(name)) = 'echo falls white zinfandel'
          THEN 'A fruity rosé wine with strawberry and raspberry flavours balanced by refreshing sweetness.'

        WHEN LOWER(TRIM(name)) = 'echo falls pinot grigio'
          THEN 'A crisp and refreshing Pinot Grigio with citrus, green apple and pear notes. Light and easy drinking.'

        WHEN LOWER(TRIM(name)) = 'echo falls summer berries'
          THEN 'A fruit-infused wine bursting with mixed berry flavours and refreshing sweetness. Best served chilled over ice.'

        WHEN LOWER(TRIM(name)) = 'el coto tinto'
          THEN 'A classic Rioja red wine with ripe berry flavours, gentle oak notes and a smooth balanced finish.'

        WHEN LOWER(TRIM(name)) = 'el coto white'
          THEN 'A refreshing Spanish white wine with citrus fruit, floral aromas and crisp acidity. Perfect with seafood and lighter dishes.'

        WHEN LOWER(TRIM(name)) = 'faustino i'
          THEN 'An iconic Gran Reserva Rioja with layers of ripe fruit, spice, vanilla and oak. Elegant, complex and highly regarded.'

        WHEN LOWER(TRIM(name)) = 'faustino v'
          THEN 'A smooth Rioja wine with ripe fruit character, gentle oak notes and a balanced finish. Great with meat, tapas and everyday meals.'

        WHEN LOWER(TRIM(name)) = 'faustino vii tinto'
          THEN 'A classic Rioja red wine with soft red fruit flavours, light oak character and an easy-drinking finish.'

        WHEN LOWER(TRIM(name)) = 'i heart pinot grigio'
          THEN 'A crisp Pinot Grigio with fresh citrus and pear notes. Light, refreshing and ideal served chilled.'

        WHEN LOWER(TRIM(name)) = 'i heart merlot'
          THEN 'A smooth Merlot with soft plum and berry flavours. Easy drinking and suitable for a variety of meals.'

        WHEN LOWER(TRIM(name)) = 'i heart sauvv blanc'
          THEN 'A fresh Sauvignon Blanc with citrus and tropical fruit notes. Bright, crisp and refreshing.'

        WHEN LOWER(TRIM(name)) = 'i heart chardonnay'
          THEN 'A rounded Chardonnay with ripe fruit flavours and a smooth finish. Great chilled or with lighter food.'

        WHEN LOWER(TRIM(name)) = 'i heart rosado'
          THEN 'A refreshing rosé with soft berry flavours and a crisp finish. Ideal chilled on warm days.'

        WHEN LOWER(TRIM(name)) = 'jamshed chardonnay'
          THEN 'A smooth Chardonnay with ripe fruit flavours and a rounded finish. Easy drinking and food friendly.'

        WHEN LOWER(TRIM(name)) = 'lancers'
          THEN 'A lightly sparkling Portuguese rosé wine with refreshing fruit character and a smooth easy-drinking style.'

        WHEN LOWER(TRIM(name)) = 'macia batle red'
          THEN 'A Mallorcan red wine with ripe fruit flavours and balanced structure. Great with meats, tapas and Mediterranean dishes.'

        WHEN LOWER(TRIM(name)) = 'macia batle rosado'
          THEN 'A Mallorcan rosé wine with fresh red fruit character and a refreshing finish. Best served chilled.'

        WHEN LOWER(TRIM(name)) = 'macia batle white'
          THEN 'A Mallorcan white wine with crisp citrus notes and refreshing acidity. Ideal with seafood and light dishes.'

        WHEN LOWER(TRIM(name)) = 'marques de caceres crianza'
          THEN 'A quality Rioja Crianza with red fruit, spice and gentle oak character. Smooth and balanced.'

        WHEN LOWER(TRIM(name)) = 'marques de caceres rosado'
          THEN 'A refreshing Rioja rosé with strawberry and red berry flavours. Crisp, fruity and elegant.'

        WHEN LOWER(TRIM(name)) = 'marques de caceres white'
          THEN 'A bright Spanish white wine with citrus fruit character and a clean refreshing finish.'

        WHEN LOWER(TRIM(name)) = 'martin codax'
          THEN 'A premium Albariño wine with citrus, stone fruit and fresh acidity. Excellent with seafood and Mediterranean dishes.'

        WHEN LOWER(TRIM(name)) = 'mateus'
          THEN 'A lightly sparkling rosé wine with gentle fruit sweetness and refreshing character. Best served chilled.'

        WHEN LOWER(TRIM(name)) = 'sangre del toro'
          THEN 'A Spanish wine with ripe fruit flavours, balanced structure and a smooth finish. Great with meat, tapas and everyday meals.'

        WHEN LOWER(TRIM(name)) = 'sangria don simon plastic'
          THEN 'A classic Spanish sangria with fruity sweetness and refreshing character. Best served chilled over ice with fruit.'

        WHEN LOWER(TRIM(name)) = 'sarria verdejo'
          THEN 'A crisp Verdejo white wine with citrus and tropical fruit notes. Fresh, aromatic and refreshing.'

        WHEN LOWER(TRIM(name)) = 'vina sol'
          THEN 'A popular Spanish white wine with crisp fruit flavour and a refreshing finish. Ideal chilled with seafood or light meals.'

        WHEN LOWER(TRIM(name)) = 'whispering angel'
          THEN 'A premium Provence rosé with delicate red fruit flavours, crisp acidity and an elegant dry finish.'

        /* =========================
           SPECIFIC SPIRITS / LIQUEURS
        ========================= */

        WHEN LOWER(TRIM(name)) = 'yzaguirre blanco'
          THEN 'A premium Spanish white vermouth with aromatic herbs, citrus notes and gentle sweetness. Perfect over ice, with tonic or as an aperitif.'

        WHEN LOWER(TRIM(name)) = 'veterano'
          THEN 'A classic Spanish spirit with smooth oak, caramel and warming notes. Traditionally enjoyed neat, over ice or after dinner.'

        WHEN LOWER(TRIM(name)) = 'bulldog gin'
          THEN 'A premium London dry gin with crisp juniper, citrus and floral botanicals. Ideal for a premium gin and tonic.'

        WHEN LOWER(TRIM(name)) = 'london no 1'
          THEN 'A premium gin with elegant botanical character and a distinctive style. Smooth, aromatic and excellent for cocktails.'

        WHEN LOWER(TRIM(name)) = 'xoriguer mahon gin'
          THEN 'A famous Menorcan gin made using traditional methods, with bold juniper character and Mediterranean heritage.'

        WHEN LOWER(TRIM(name)) = 'midori'
          THEN 'A vibrant melon liqueur known for its bright green colour and sweet tropical flavour. Great in cocktails.'

        WHEN LOWER(TRIM(name)) = 'kahlua'
          THEN 'A rich coffee liqueur with roasted coffee, vanilla and caramel notes. Perfect for espresso martinis and after-dinner drinks.'

        WHEN LOWER(TRIM(name)) = 'amaretto ferrone'
          THEN 'A smooth almond liqueur with sweet marzipan, vanilla and nutty notes. Ideal over ice or in classic cocktails.'

        WHEN LOWER(TRIM(name)) = 'limoncello ferrone'
          THEN 'A traditional Italian-style lemon liqueur with bright citrus flavour and refreshing sweetness. Best served ice cold.'

        WHEN LOWER(TRIM(name)) = 'bora bora cacao'
          THEN 'A chocolate flavoured cocktail syrup with rich cocoa sweetness. Perfect for cocktails, coffees, milkshakes and desserts.'

        WHEN LOWER(TRIM(name)) = 'der meister'
          THEN 'A herbal liqueur with botanical, spice and warming notes. Best served chilled or over ice.'

        WHEN LOWER(TRIM(name)) = 'giulioncello'
          THEN 'A citrus liqueur with bright lemon character and a smooth sweet finish. Excellent served chilled.'

        WHEN LOWER(TRIM(name)) = 'irish knights'
          THEN 'An Irish cream-style liqueur with smooth whiskey notes, cream and vanilla flavours. Great over ice or in coffee.'

        WHEN LOWER(TRIM(name)) = 'licor 1898'
          THEN 'A Spanish liqueur with smooth sweetness and warming character. Ideal served chilled or after dinner.'

        WHEN LOWER(TRIM(name)) = 'triple sec caiman'
          THEN 'An orange liqueur with bright citrus flavour, ideal for margaritas, cosmopolitans and classic cocktails.'

        WHEN LOWER(TRIM(name)) = 'havana club 5'
          THEN 'A Cuban aged rum with notes of oak, vanilla and tropical fruit. Smooth enough for sipping and versatile in cocktails.'

        WHEN LOWER(TRIM(name)) = 'captain morgan spiced sin alcohol'
          THEN 'An alcohol-free spiced spirit alternative with vanilla and warming spice character. Great with cola or mixers.'

        WHEN LOWER(TRIM(name)) = 'absolut mango'
          THEN 'A mango flavoured vodka with tropical sweetness and Absolut’s smooth clean finish. Great with lemonade or cocktails.'

        WHEN LOWER(TRIM(name)) = 'absolut wildberries'
          THEN 'A berry flavoured vodka with rich forest fruit character and vibrant sweetness. Perfect for refreshing mixed drinks.'

        WHEN LOWER(TRIM(name)) = 'absolut raspberry'
          THEN 'A raspberry flavoured vodka with bright berry notes and a clean crisp finish. Excellent with soda or lemonade.'

        WHEN LOWER(TRIM(name)) = 'absolut peach'
          THEN 'A peach flavoured vodka with juicy fruit notes and smooth character. Ideal for summer cocktails and mixers.'

        WHEN LOWER(TRIM(name)) = 'absolut peppar'
          THEN 'A pepper infused vodka with warming spice and savoury depth. Famous for Bloody Mary cocktails.'

        WHEN LOWER(TRIM(name)) = 'absolut passion fruit'
          THEN 'A tropical passion fruit vodka with exotic fruit flavour and refreshing finish. Perfect in fruity cocktails.'

        WHEN LOWER(TRIM(name)) = 'absolut vanilla'
          THEN 'A vanilla flavoured vodka with smooth sweetness and creamy character. Ideal for espresso martinis and dessert-style cocktails.'

        WHEN LOWER(TRIM(name)) = 'crystal head'
          THEN 'A premium Canadian vodka known for exceptional purity, smoothness and its iconic skull bottle.'

        WHEN LOWER(TRIM(name)) = 'naga chilli vodka'
          THEN 'A powerful chilli infused vodka with intense heat and smooth spirit character. Best for spicy shots and bold cocktails.'

        WHEN LOWER(TRIM(name)) = 'jack daniels single barrel'
          THEN 'A premium Tennessee whiskey selected from individual barrels, with rich oak, caramel, vanilla and spice notes.'

        WHEN LOWER(TRIM(name)) = 'xuxu'
          THEN 'A strawberry liqueur made with sweet fruit flavour and smooth character. Great chilled or in fruity cocktails.'

        WHEN LOWER(TRIM(name)) = 'smirnoff mango passionfruit'
          THEN 'A tropical flavoured vodka blending mango and passion fruit notes with Smirnoff’s clean crisp finish.'

        WHEN LOWER(TRIM(name)) = 'smirnoff rosca'
          THEN 'A smooth vodka with clean flavour and versatile mixing character. Ideal for cocktails and long drinks.'

        WHEN LOWER(TRIM(name)) = 'jim bean honey'
          THEN 'A honey infused bourbon liqueur combining whiskey warmth with sweet honey notes. Great over ice or with lemonade.'

        WHEN LOWER(TRIM(name)) = 'j and b'
          THEN 'A smooth blended Scotch whisky with light malt and fruit notes. Perfect for mixing or serving over ice.'

        WHEN LOWER(TRIM(name)) = 'macallan 12 yo'
          THEN 'A highly regarded single malt Scotch whisky with dried fruit, vanilla, spice and oak character.'

        WHEN LOWER(TRIM(name)) = 'whyte and mackay'
          THEN 'A smooth blended Scotch whisky with balanced malt, oak and honey notes. Easy drinking and versatile.'

        /* =========================
           CHAMPAGNE / CIDER / BEER / MIXERS REQUEST BATCH
        ========================= */

        WHEN LOWER(TRIM(name)) LIKE '%thatchers can%'
          THEN 'A premium apple cider with crisp fruit flavour, refreshing character and a clean finish. Best served chilled.'

        WHEN LOWER(TRIM(name)) LIKE '%koppaberg can pear%'
          THEN 'A Swedish pear cider packed with juicy pear flavour and refreshing sweetness. Best served chilled over ice.'

        WHEN LOWER(TRIM(name)) LIKE '%koppaberg can strawberry lime%'
          THEN 'A popular fruit cider blending sweet strawberry with zesty lime for a crisp refreshing finish.'

        WHEN LOWER(TRIM(name)) LIKE '%koppaberg can mix fruit%'
          THEN 'A refreshing mixed fruit cider with berry flavours and balanced sweetness. Perfect served ice cold.'

        WHEN LOWER(TRIM(name)) LIKE '%coors light can 500ml%'
          THEN 'A light American lager with crisp refreshing flavour and a clean finish. Best enjoyed ice cold.'

        WHEN LOWER(TRIM(name)) LIKE '%guinness zero can%'
          THEN 'An alcohol-free stout with roasted malt flavour, smooth body and a creamy Guinness-style finish.'

        WHEN LOWER(TRIM(name)) LIKE '%magners can 500ml%'
          THEN 'A traditional Irish cider with crisp apple flavour and refreshing character. Best served chilled.'

        WHEN LOWER(TRIM(name)) LIKE '%rekordelig can passion fruit%'
          THEN 'A Swedish fruit cider with exotic passion fruit flavour and refreshing sweetness.'

        WHEN LOWER(TRIM(name)) LIKE '%rekordelig can strawberry lime%'
          THEN 'A refreshing fruit cider combining sweet strawberry notes with zesty lime.'

        WHEN LOWER(TRIM(name)) LIKE '%rekordelig can wild berry%'
          THEN 'A mixed berry cider packed with juicy fruit character and balanced sweetness.'

        WHEN LOWER(TRIM(name)) LIKE '%rekordelig can mango%raspberry%'
          THEN 'A tropical fruit cider blending mango sweetness with raspberry freshness and a smooth finish.'

        WHEN LOWER(TRIM(name)) LIKE '%lucozade sport%'
          THEN 'An isotonic sports drink designed to help replenish fluids and electrolytes during and after exercise.'

        WHEN LOWER(TRIM(name)) LIKE '%walkers%'
          THEN 'Classic potato crisps available in a variety of popular flavours. Perfect for snacking, lunches and parties.'

        WHEN LOWER(TRIM(name)) LIKE '%fevertree pink grapefruit%'
          THEN 'A premium pink grapefruit soda with vibrant citrus flavour and refreshing bitterness. Ideal for premium mixed drinks.'

        WHEN LOWER(TRIM(name)) LIKE '%carlsberg bottle 330ml%'
          THEN 'A smooth Danish pilsner with balanced malt flavour and a crisp refreshing finish. Best served chilled.'

        WHEN LOWER(TRIM(name)) LIKE '%fevertree mediterranean tonic%'
          THEN 'A premium tonic water with Mediterranean herbs and citrus notes. Perfect with premium gin.'

        WHEN LOWER(TRIM(name)) LIKE '%fevertree sicillian lemonade%'
          THEN 'A sparkling Sicilian lemonade with vibrant citrus flavour and natural sweetness. Great as a mixer or soft drink.'

        WHEN LOWER(TRIM(name)) LIKE '%fevertree elderflower tonic%'
          THEN 'A delicate elderflower tonic water with light floral notes. Ideal with gin, vodka or served chilled on its own.'

        WHEN LOWER(TRIM(name)) LIKE '%fevertree soda%'
          THEN 'A premium soda water with fine carbonation and a clean refreshing finish. Ideal for cocktails and spirits.'

        /* =========================
           FROZEN FOOD
        ========================= */

        WHEN LOWER(TRIM(name)) = 'chicken & mushroom pie'
          THEN 'A traditional British pie filled with tender chicken pieces and rich creamy mushroom sauce, wrapped in golden flaky pastry.'

        WHEN LOWER(TRIM(name)) = 'mince meat & onion pie'
          THEN 'A hearty pie packed with seasoned minced beef and onion in rich savoury gravy, encased in golden pastry.'

        WHEN LOWER(TRIM(name)) = 'steak & guinness pie'
          THEN 'A premium pie filled with slow-cooked beef steak and rich Guinness gravy, wrapped in crisp golden pastry.'

        WHEN LOWER(TRIM(name)) = 'steak & kidney pie'
          THEN 'A classic British pie combining tender steak and kidney in rich savoury gravy with golden pastry.'

        WHEN LOWER(TRIM(name)) = 'steak pie'
          THEN 'A hearty steak pie packed with tender beef and rich gravy, finished with a golden pastry crust.'

        WHEN LOWER(TRIM(name)) = 'meat & potato pie'
          THEN 'A comforting pie filled with seasoned meat and soft potatoes in traditional rich gravy, wrapped in pastry.'

        WHEN LOWER(TRIM(name)) = 'sausage roll jumbo'
          THEN 'A generously sized sausage roll filled with seasoned sausage meat and wrapped in crisp golden puff pastry.'

        WHEN LOWER(TRIM(name)) = 'bacon 2.25kg'
          THEN 'A bulk pack of quality frozen bacon, ideal for breakfasts, sandwiches, cooking and catering.'

        WHEN LOWER(TRIM(name)) = 'bacon 400g'
          THEN 'Quality bacon with rich savoury flavour, ideal for breakfasts, sandwiches and everyday cooking.'

        WHEN LOWER(TRIM(name)) = 'bacon 200g'
          THEN 'A convenient pack of bacon ideal for breakfasts, sandwiches and smaller meals.'

        WHEN LOWER(TRIM(name)) = 'sausage bag 40'
          THEN 'A large pack of traditional sausages, ideal for breakfasts, family meals and barbecues.'

        WHEN LOWER(TRIM(name)) = 'sausage individual'
          THEN 'A single traditional sausage with savoury flavour, ideal for breakfast rolls or quick meals.'

        WHEN LOWER(TRIM(name)) = 'lorne sausage 1kg bag'
          THEN 'Traditional Scottish square sausage with rich savoury flavour. Perfect for cooked breakfasts and rolls.'

        WHEN LOWER(TRIM(name)) = 'black pudding single'
          THEN 'A single portion of black pudding, ideal for cooked breakfasts and traditional meals.'

        WHEN LOWER(TRIM(name)) = 'black pudding stick 1.36kg'
          THEN 'A full stick of traditional black pudding with rich savoury flavour, ideal for slicing and cooking.'

        WHEN LOWER(TRIM(name)) = 'gammon joint per kg'
          THEN 'A frozen gammon joint sold by weight, ideal for roasting or slicing for meals.'

        WHEN LOWER(TRIM(name)) = 'gammon steak pack 2'
          THEN 'Two thick-cut gammon steaks with juicy texture and rich flavour. Ideal grilled, fried or oven cooked.'

        WHEN LOWER(TRIM(name)) = 'irish steak burger'
          THEN 'A premium Irish steak burger with rich beef flavour and succulent texture. Great for grilling or frying.'

        WHEN LOWER(TRIM(name)) = 'haggis'
          THEN 'A traditional Scottish haggis with rich savoury flavour and authentic character.'

        WHEN LOWER(TRIM(name)) = 'chicken kiev bag 5'
          THEN 'A pack of chicken Kiev portions filled with garlic butter and coated for a crispy finish.'

        WHEN LOWER(TRIM(name)) = 'chicken kiev single'
          THEN 'A tender chicken Kiev filled with garlic butter, ideal for a quick and satisfying meal.'

        WHEN LOWER(TRIM(name)) = 'spicy chicken wings bag 48'
          THEN 'A large pack of spicy chicken wings with a flavourful coating and satisfying kick.'

        WHEN LOWER(TRIM(name)) = 'spicy chicken wings single'
          THEN 'A spicy chicken wing with bold seasoning, perfect as a snack, starter or party food.'

        WHEN LOWER(TRIM(name)) = 'southern fried chicken goujon strip bag'
          THEN 'A bag of southern fried chicken goujon strips with crispy coating and tender chicken inside.'

        WHEN LOWER(TRIM(name)) = 'pork pies pack 4'
          THEN 'A pack of traditional pork pies with seasoned pork filling and crisp pastry crust.'

        WHEN LOWER(TRIM(name)) = 'thick bread'
          THEN 'Frozen thick-sliced bread perfect for toast, sandwiches and everyday family meals.'

        WHEN LOWER(TRIM(name)) = 'medium bread'
          THEN 'Soft medium-cut bread suitable for sandwiches, toast and snacks.'

        WHEN LOWER(TRIM(name)) = 'wholemeal bread'
          THEN 'Nutritious wholemeal bread with rich flavour and soft texture, ideal for sandwiches and toast.'

        WHEN LOWER(TRIM(name)) = 'malted wholegrain'
          THEN 'A wholesome malted wholegrain loaf with rich flavour and texture, perfect for breakfasts and sandwiches.'

        WHEN LOWER(TRIM(name)) = 'dutch baps pack 8'
          THEN 'Soft bread rolls ideal for breakfast rolls, sandwiches and lunchtime snacks.'

        WHEN LOWER(TRIM(name)) = 'tea cakes pack 5'
          THEN 'Traditional teacakes with fruit, delicious toasted and served warm with butter.'

        WHEN LOWER(TRIM(name)) = 'muffins pack 4'
          THEN 'Classic English muffins with a soft texture, perfect toasted for breakfast or brunch.'

        WHEN LOWER(TRIM(name)) = 'fruit scones single'
          THEN 'A traditional fruit scone with dried fruit, delicious served with butter, jam or cream.'

        WHEN LOWER(TRIM(name)) = 'jacket potato bag 7'
          THEN 'A bag of large baking potatoes ideal for oven cooking and serving with a variety of toppings.'

        WHEN LOWER(TRIM(name)) = 'jacket potato single'
          THEN 'A large baking potato perfect for a quick, filling and versatile meal.'

        WHEN LOWER(TRIM(name)) = 'potato scones'
          THEN 'Traditional Scottish potato scones with soft texture and rich potato flavour, ideal for breakfast.'

        /* =========================
           GENERIC FALLBACKS BY CATEGORY / NAME
        ========================= */

        WHEN LOWER(name) LIKE '%gin%'
          THEN 'A quality gin with botanical character, refreshing flavour and versatile mixing potential. Perfect with tonic, citrus garnish or classic cocktails.'

        WHEN LOWER(name) LIKE '%vodka%' OR LOWER(name) LIKE '%smirnoff%' OR LOWER(name) LIKE '%absolut%' OR LOWER(name) LIKE '%rushkinoff%'
          THEN 'A smooth vodka with clean flavour and versatile character. Ideal for mixers, cocktails and chilled serves.'

        WHEN LOWER(name) LIKE '%rum%' OR LOWER(name) LIKE '%bacardi%' OR LOWER(name) LIKE '%captain morgan%' OR LOWER(name) LIKE '%havana%'
          THEN 'A flavourful rum with smooth sweetness and warming character. Excellent with cola, tropical mixers or cocktails.'

        WHEN LOWER(name) LIKE '%whisky%' OR LOWER(name) LIKE '%whiskey%' OR LOWER(name) LIKE '%jack daniels%' OR LOWER(name) LIKE '%johnny walker%' OR LOWER(name) LIKE '%j&b%'
          THEN 'A quality whisky with smooth malt, oak and warming character. Enjoy neat, over ice or with your favourite mixer.'

        WHEN LOWER(name) LIKE '%tequila%' OR LOWER(name) LIKE '%cuervo%' OR LOWER(name) LIKE '%don julio%'
          THEN 'A tequila with agave character and smooth finish. Great for shots, margaritas and premium cocktails.'

        WHEN LOWER(name) LIKE '%liqueur%' OR LOWER(category) LIKE '%liqueur%' OR LOWER(category) LIKE '%liquor%'
          THEN 'A smooth liqueur with distinctive flavour and sweet character. Ideal served chilled, over ice or mixed into cocktails.'

        WHEN LOWER(category) LIKE '%wine%'
          THEN 'A quality wine with balanced flavour and easy-drinking character. Best served at the appropriate temperature for its style.'

        WHEN LOWER(category) LIKE '%beer%' OR LOWER(category) LIKE '%beers%'
          THEN 'A refreshing beer with crisp flavour and easy-drinking character. Best served chilled.'

        WHEN LOWER(category) LIKE '%cider%'
          THEN 'A refreshing cider with fruit-forward flavour and crisp finish. Best served chilled.'

        WHEN LOWER(category) LIKE '%soft drink%'
          THEN 'A refreshing soft drink, mixer or juice product ideal for serving chilled or combining with drinks.'

        WHEN LOWER(category) LIKE '%frozen%'
          THEN 'A convenient frozen food product ideal for quick meals, snacks or family cooking.'

        WHEN LOWER(category) LIKE '%dried%'
          THEN 'A cupboard essential suitable for everyday meals, snacks or cooking.'

        WHEN LOWER(category) LIKE '%sweet%'
          THEN 'A sweet or snack product ideal for treats, sharing or everyday snacking.'

        WHEN LOWER(category) LIKE '%miniature%'
          THEN 'A miniature bottle or multipack option, ideal for gifts, sampling, parties or travel.'

        ELSE COALESCE(NULLIF(TRIM(description), ''), 'Quality product available from Arthurs Off Licence.')

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

    res.send("Descriptions restored");
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});


app.listen(process.env.PORT || 10000, () => {
  console.log("Server running ✅");
});
