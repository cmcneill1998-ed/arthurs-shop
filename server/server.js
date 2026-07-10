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

app.get("/load-descriptions", async (req, res) => {
  try {
    await db.query(`
      UPDATE products
      SET description = CASE

        WHEN name = 'Yzaguirre Blanco' THEN 'A premium Spanish white vermouth with aromatic herbs, citrus notes and gentle sweetness. Perfect served over ice, with tonic, or as an aperitif before a meal.'
        WHEN name = 'Veterano' THEN 'A classic Spanish spirit with smooth oak, caramel and warming notes. Traditionally enjoyed neat, over ice or as a relaxing after-dinner drink.'
        WHEN name = 'Bulldog Gin' THEN 'A premium London dry gin featuring a unique blend of botanicals, delivering crisp juniper character with smooth citrus and floral notes. Ideal for premium gin and tonic serves.'
        WHEN name = 'London No 1' THEN 'An award-winning premium gin recognised for its distinctive blue colour and elegant botanical profile. Smooth, aromatic and perfect for sophisticated cocktails.'
        WHEN name = 'Xoriguer Mahon Gin' THEN 'A famous Mediterranean gin produced in Menorca using traditional methods. Rich in juniper character with a distinctive island heritage and refreshing finish.'
        WHEN name = 'Midori' THEN 'A vibrant melon liqueur known for its bright green colour and sweet tropical flavour. Popular in cocktails adding both colour and refreshing fruit character.'
        WHEN name = 'Kahlua' THEN 'A rich coffee liqueur combining roasted coffee beans, vanilla and caramel notes. Perfect in espresso martinis, cocktails or served over ice.'
        WHEN name = 'Amaretto Ferrone' THEN 'A smooth almond liqueur with sweet marzipan, vanilla and nutty notes. Excellent after dinner, over ice or mixed into classic cocktails.'
        WHEN name = 'Limoncello Ferrone' THEN 'A traditional Italian lemon liqueur bursting with fresh citrus flavour and refreshing sweetness. Best enjoyed ice cold after a meal.'
        WHEN name = 'Bora Bora Cacao' THEN 'A premium chocolate flavoured syrup delivering rich cocoa sweetness. Perfect for cocktails, coffees, milkshakes and dessert creations.'
        WHEN name = 'Der Meister' THEN 'A herbal liqueur crafted from a blend of botanicals, spices and herbs. Smooth, warming and ideal served chilled or over ice.'
        WHEN name = 'Guilioncello' THEN 'A refreshing citrus liqueur inspired by traditional Italian recipes, offering vibrant lemon character and a smooth sweet finish.'
        WHEN name = 'Irish Knights' THEN 'A smooth Irish cream liqueur combining whiskey notes with rich cream and vanilla flavours. Ideal over ice or in coffee-based drinks.'
        WHEN name = 'Licor 1898' THEN 'A traditional Spanish liqueur featuring smooth sweetness and warming character. Excellent served chilled or enjoyed after dinner.'
        WHEN name = 'Triple Sec Caiman' THEN 'A premium orange liqueur made from citrus peel extracts, providing bright orange flavour essential for margaritas and classic cocktails.'
        WHEN name = 'Havana Club 5' THEN 'A premium Cuban aged rum with rich notes of vanilla, oak, cocoa and tropical fruit. Smooth enough for sipping while remaining excellent in cocktails.'
        WHEN name = 'Captain Morgan Spiced sin alcohol' THEN 'An alcohol-free spiced spirit alternative delivering the familiar vanilla and warming spice character associated with classic spiced rum serves.'
        WHEN name = 'Absolut Mango' THEN 'A tropical mango flavoured vodka offering ripe fruit sweetness balanced by Absolut’s signature smooth finish. Great with lemonade and cocktails.'
        WHEN name = 'Absolut Wildberries' THEN 'A berry flavoured vodka packed with rich forest fruit character and vibrant sweetness. Perfect for refreshing long drinks and fruity cocktails.'
        WHEN name = 'Absolut Raspberry' THEN 'A raspberry infused vodka with bright berry flavour and a clean, crisp finish. Excellent with soda, lemonade or mixed drinks.'
        WHEN name = 'Absolut Peach' THEN 'A peach flavoured vodka bursting with juicy fruit notes and smooth character. Ideal for summer cocktails and refreshing serves.'
        WHEN name = 'Absolut Peppar' THEN 'A pepper infused vodka delivering warming spice and savoury depth. Famously used in Bloody Mary cocktails and spicy mixed drinks.'
        WHEN name = 'Absolut Passion Fruit' THEN 'A tropical passion fruit vodka with vibrant exotic flavour and refreshing finish. Excellent in fruity cocktails and mixers.'
        WHEN name = 'Absolut Vanilla' THEN 'A vanilla flavoured vodka with smooth sweetness and creamy character. Ideal for espresso martinis and dessert-inspired cocktails.'
        WHEN name = 'Crystal Head' THEN 'A luxury Canadian vodka renowned for exceptional purity and smoothness. Distilled multiple times and presented in the iconic crystal skull bottle.'
        WHEN name = 'Naga Chilli Vodka' THEN 'A powerful chilli infused vodka delivering intense heat alongside smooth spirit character. Popular with adventurous drinkers and spicy cocktails.'
        WHEN name = 'Jack Daniels Single Barrel' THEN 'A premium Tennessee whiskey selected from individual barrels for exceptional character. Rich notes of oak, caramel, vanilla and spice.'
        WHEN name = 'XUXU' THEN 'A strawberry liqueur combining real fruit flavour with smooth sweetness. Refreshing served chilled or used in fruity cocktails.'
        WHEN name = 'Smirnoff Mango Passionfruit' THEN 'A tropical flavoured vodka blending juicy mango and passion fruit notes with Smirnoff’s clean, crisp finish.'
        WHEN name = 'Smirnoff Rosca' THEN 'A classic vodka offering smooth, clean flavour and versatility. Ideal for cocktails, mixers and chilled serves.'
        WHEN name = 'Jim Bean Honey' THEN 'A honey infused bourbon liqueur combining smooth whiskey warmth with sweet honey notes. Excellent over ice or mixed with lemonade.'
        WHEN name = 'J and B' THEN 'A famous blended Scotch whisky delivering smooth malt character, light fruit notes and easy-drinking versatility. Perfect for mixing or enjoying over ice.'
        WHEN name = 'Macallan 12 yo' THEN 'A highly regarded single malt Scotch whisky matured in oak casks, featuring rich dried fruit, vanilla and spice flavours with exceptional smoothness.'
        WHEN name = 'Whyte and Mackay' THEN 'A smooth blended Scotch whisky with balanced malt, oak and honey notes. Popular with both whisky enthusiasts and casual drinkers.'

        WHEN name = 'Acantus Blanco' THEN 'A fresh Spanish white wine with crisp fruit flavours, refreshing acidity and an easy-drinking style suitable for any occasion.'
        WHEN name = 'Acantus Tinto' THEN 'A smooth Spanish red wine offering ripe berry flavours, gentle tannins and balanced character. Excellent with food or enjoyed on its own.'
        WHEN name = 'Acantus Rosado' THEN 'A refreshing Spanish rosé wine with delicate red fruit flavours and a crisp finish. Perfect served chilled.'
        WHEN name = 'Bach Tinto' THEN 'A popular Spanish red wine with soft berry flavours, smooth texture and approachable character. Ideal for pairing with a variety of dishes.'

        WHEN name = 'Bach Seco' THEN 'A refreshing Spanish sparkling wine with crisp fruit flavours, lively bubbles and a clean dry finish. Ideal for celebrations, aperitifs and light meals.'
        WHEN name = 'Bach Semi' THEN 'A semi-sweet Spanish sparkling wine offering delicate fruit notes, gentle sweetness and refreshing bubbles. Perfect for special occasions and easy drinking.'
        WHEN name = 'Bach Rosado (Blush)' THEN 'A vibrant rosé sparkling wine with fresh berry flavours, delicate sweetness and elegant fizz. Best served chilled.'
        WHEN name = 'Bicicletes I Peces Rosado' THEN 'A refreshing Spanish rosé wine featuring red berry flavours, crisp acidity and a smooth finish. Ideal for warm evenings and Mediterranean cuisine.'
        WHEN name = 'Bicicletes I Peces Verdejo' THEN 'A fresh Verdejo white wine with citrus, tropical fruit and floral notes. Crisp, aromatic and highly refreshing.'
        WHEN name = 'Bicicletes I Peces Sauv Blanc' THEN 'A Sauvignon Blanc bursting with citrus, gooseberry and tropical fruit flavours. Bright, lively and perfect served chilled.'
        WHEN name = 'Campo Viejo Crianza' THEN 'A renowned Rioja red wine aged in oak barrels, delivering rich berry flavours, vanilla notes and a smooth balanced finish.'
        WHEN name = 'Conde De Caralt Rosado' THEN 'A delicate Spanish rosé with fresh strawberry and raspberry notes, balanced acidity and a refreshing finish.'
        WHEN name = 'Conde De Caralt Seco' THEN 'A dry sparkling wine with crisp fruit flavours, lively bubbles and an elegant finish. Ideal for celebrations and aperitifs.'
        WHEN name = 'Conde De Caralt Semi' THEN 'A semi-sweet sparkling wine offering refreshing fruit flavours, gentle sweetness and fine effervescence.'
        WHEN name = 'Conde De Caralt Tinto' THEN 'A smooth Spanish red wine featuring ripe berry fruit flavours, soft tannins and approachable character.'
        WHEN name = 'Costa Dor Rosada' THEN 'A refreshing Spanish rosé with bright berry flavours and a crisp finish. Perfect served chilled on sunny days.'
        WHEN name = 'Costa Dor Tinto' THEN 'A balanced Spanish red wine with notes of red fruits and soft oak influence. Smooth, versatile and easy drinking.'
        WHEN name = 'Costa Dor Select' THEN 'A premium Spanish wine offering rich fruit character, smooth texture and an elegant finish. Suitable for a variety of occasions.'
        WHEN name = 'Echo Falls Chardonnay' THEN 'A popular Chardonnay showing ripe tropical fruit flavours, hints of vanilla and a smooth approachable finish.'
        WHEN name = 'Echo Falls White Zinfandel' THEN 'A fruity rosé wine with juicy strawberry and raspberry flavours balanced by refreshing sweetness.'
        WHEN name = 'Echo Falls Pinot Grigio' THEN 'A crisp and refreshing Pinot Grigio with citrus, green apple and pear notes. Light, easy drinking and refreshing.'
        WHEN name = 'Echo Falls Summer Berries' THEN 'A fruit-infused wine bursting with mixed berry flavours and refreshing sweetness. Best served chilled over ice.'
        WHEN name = 'El Coto Tinto' THEN 'A classic Rioja red wine featuring ripe berry flavours, gentle oak character and a smooth balanced finish.'
        WHEN name = 'El Coto White' THEN 'A refreshing Spanish white wine with citrus fruit, floral aromas and crisp acidity. Perfect with seafood and lighter dishes.'
        WHEN name = 'Faustino I' THEN 'An iconic Gran Reserva Rioja showcasing layers of ripe fruit, spice, vanilla and oak. Elegant, complex and highly regarded by wine lovers.'

        ELSE description

      END;
    `);

    res.send("Descriptions loaded");
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});



app.listen(process.env.PORT || 10000, () => {
  console.log("Server running ✅");
});
