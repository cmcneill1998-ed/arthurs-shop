import { useEffect, useMemo, useState } from "react";
import { Routes, Route, Link, Navigate, useNavigate } from "react-router-dom";
import logo from "./image.png";
import Orders from "./Orders";


const API_BASE = "https://arthurs-shop.onrender.com";

const PRODUCTS_PER_PAGE = 50;

export default function App() {
  const navigate = useNavigate();

  const defaultUsers = [
    {
      id: 1,
      role: "staff",
      fullName: "Arthurs Staff",
      email: "staff@arthurs.test",
      password: "demo123",
      nif: "",
      companyName: "Arthurs",
      address: "Store Address",
      hotelRoom: "",
      hotelAddress: "",
    },
  ];

const [email, setEmail] = useState("");
const [password, setPassword] = useState("");

  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState(() => {
    const saved = localStorage.getItem("arthurs_users");
    return saved ? JSON.parse(saved) : defaultUsers;
  });

  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem("arthurs_currentUser");
    return saved ? JSON.parse(saved) : null;
  });

  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem("arthurs_cart");
    return saved ? JSON.parse(saved) : [];
  });

  const [lastOrder, setLastOrder] = useState(() => {
    const saved = localStorage.getItem("arthurs_lastOrder");
    return saved ? JSON.parse(saved) : null;
  });

  const [orders, setOrders] = useState([]);
  const [orderItems, setOrderItems] = useState({});
  const [orderNotes, setOrderNotes] = useState({});

  const [message, setMessage] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  const [search, setSearch] = useState("");
  const [isResetMode, setIsResetMode] = useState(false);
  const [category, setCategory] = useState("All");
  const [page, setPage] = useState(1);
  const [authMode, setAuthMode] = useState("login");

  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });

  const [registerForm, setRegisterForm] = useState({
    role: "customer",
    fullName: "",
    email: "",
    password: "",
    nif: "",
    companyName: "",
    address: "",
    hotelRoom: "",
    hotelAddress: "",
  });

  const [checkoutForm, setCheckoutForm] = useState({
    contactName: "",
    email: "",
    nif: "",
    companyName: "",
    address: "",
    hotelRoom: "",
    hotelAddress: "",
  });

  const [profileForm, setProfileForm] = useState({
    fullName: "",
    email: "",
    nif: "",
    companyName: "",
    address: "",
    hotelRoom: "",
    hotelAddress: "",
  });

  const [newProduct, setNewProduct] = useState({
    name: "",
    category: "",
    retailPrice: "",
    barPrice: "",
    description: "",
  });

  const role = currentUser?.role || "customer";
  const isBar = role === "bar";
  const isStaff = role === "staff";

  useEffect(() => {
    localStorage.setItem("arthurs_users", JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem("arthurs_currentUser", JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem("arthurs_cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem("arthurs_lastOrder", JSON.stringify(lastOrder));
  }, [lastOrder]);

  useEffect(() => {
  fetch(`${API_BASE}/products`)
    .then((res) => {
      if (!res.ok) throw new Error("Failed to load products");
      return res.json();
    })
    .then((data) => {
      const cleanProducts = Array.isArray(data)
        ? data.map((p, index) => ({
            id: p.id ?? index + 1,
            name: p.name || "Unnamed product",
            category: p.category || "Uncategorised",
            description: p.description || "",
            retailPrice: Number(p.retailprice ?? p.retailPrice ?? p.price ?? 0),
            barPrice: Number(
  p.barprice ??
  p.barPrice ??
  p.retailprice ??
  p.retailPrice ??
  0
),
          }))
        : [];

      setProducts(cleanProducts);
    })
    .catch(() => {
      setProducts([]);
      setMessage("Could not load products from backend.");
    });
}, []);

function refreshOrders() {
  if (!currentUser) return;

  fetch(`${API_BASE}/orders?role=${currentUser.role}&email=${currentUser.email}`)
    .then((res) => {
      if (!res.ok) throw new Error("Failed to load orders");
      return res.json();
    })
    .then((data) => {
      setOrders(Array.isArray(data) ? data : []);
    })
    .catch(() => {
      setOrders([]);
    });
}

  useEffect(() => {
    if (!currentUser) {
      setOrders([]);
      return;
    }

    refreshOrders();

    if (currentUser.role === "staff") {
      const interval = setInterval(() => {
        refreshOrders();
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      setCheckoutForm({
        contactName: currentUser.fullName || "",
        email: currentUser.email || "",
        nif: currentUser.nif || "",
        companyName: currentUser.companyName || "",
        address: currentUser.address || "",
        hotelRoom: currentUser.hotelRoom || "",
        hotelAddress: currentUser.hotelAddress || "",
      });

      setProfileForm({
        fullName: currentUser.fullName || "",
        email: currentUser.email || "",
        nif: currentUser.nif || "",
        companyName: currentUser.companyName || "",
        address: currentUser.address || "",
        hotelRoom: currentUser.hotelRoom || "",
        hotelAddress: currentUser.hotelAddress || "",
      });
    }
  }, [currentUser]);

  useEffect(() => {
    setPage(1);
  }, [search, category]);

  const categories = ["All", ...new Set(products.map((p) => p.category))];

function getPrice(product) {
  const price = isBar
    ? product.barPrice ?? product.barprice
    : product.retailPrice ?? product.retailprice;

  return Number(price || 0);
}

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = search.toLowerCase();
      const matchesSearch =
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q);

      const matchesCategory = category === "All" || p.category === category;

      return matchesSearch && matchesCategory;
    });
  }, [products, search, category]);

  const searchSuggestions = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return products
      .filter((p) => p.name.toLowerCase().includes(q))
      .slice(0, 6);
  }, [products, search]);

  function resetMessages() {
    setMessage("");
    setCheckoutError("");
  }

  function createAccount() {
    resetMessages();

    if (!registerForm.fullName || !registerForm.email || !registerForm.password) {
      setMessage("Enter full name, email and password.");
      return;
    }

    if (users.some((u) => u.email.toLowerCase() === registerForm.email.toLowerCase())) {
      setMessage("That email is already registered. Use login instead.");
      return;
    }

    if (registerForm.role === "bar") {
      if (!registerForm.nif || !registerForm.companyName || !registerForm.address) {
        setMessage("Bar customer must enter NIF, company name and address.");
        return;
      }
    }

    if (registerForm.role === "customer") {
      if (!registerForm.hotelRoom || !registerForm.hotelAddress) {
        setMessage("Standard customer must enter hotel room and hotel address.");
        return;
      }
    }

    const newUser = {
      id: Date.now(),
      ...registerForm,
    };

    setUsers((prev) => [...prev, newUser]);
    setCurrentUser(newUser);
    setMessage(
      `Account created as ${
        registerForm.role === "bar" ? "Bar Customer" : "Standard Customer"
      }.`
    );
    navigate("/");
  }

 function login() {
  resetMessages();

  const foundUser = users.find(
    (u) =>
      u.email.toLowerCase() === loginForm.email.toLowerCase() &&
      u.password === loginForm.password
  );

  if (!foundUser) {
    setMessage("Login details not recognised.");
    return;
  }

  setCurrentUser(foundUser);
  setMessage(`Logged in as ${foundUser.role}.`);
  navigate("/");
}

function resetPassword() {
  resetMessages();

  // ✅ FIRST CLICK = instruction only, no reset yet
  if (!isResetMode) {
    setMessage("⚠️ Enter your email, NEW password, and hotel room/NIF below, then click 'Confirm reset password'.");
    setIsResetMode(true);
    return;
  }

  // ✅ SECOND CLICK = validate fields
  if (!loginForm.email || !loginForm.password || !loginForm.resetCheck) {
    setMessage("Enter email, new password, and hotel room/NIF.");
    return;
  }

  const matchedUser = users.find((u) => {
    const emailMatches =
      u.email.toLowerCase() === loginForm.email.toLowerCase();

    const securityMatches =
      (u.role === "customer" &&
        String(u.hotelRoom || "").toLowerCase() ===
          String(loginForm.resetCheck || "").toLowerCase()) ||
      (u.role === "bar" &&
        String(u.nif || "").toLowerCase() ===
          String(loginForm.resetCheck || "").toLowerCase()) ||
      (u.role === "staff" &&
        String(u.email || "").toLowerCase() ===
          String(loginForm.email || "").toLowerCase());

    return emailMatches && securityMatches;
  });

if (!matchedUser) {
  setMessage("Details do not match our records.");
  return;
}

const updatedUsers = users.map((u) => {
  if (u.email.toLowerCase() === loginForm.email.toLowerCase()) {
    return {
      ...u,
      password: loginForm.password.trim()
    };
  }
  return u;
});

setUsers(updatedUsers);
localStorage.setItem("arthurs_users", JSON.stringify(updatedUsers));

setMessage("✅ Password reset successful. You can now log in.");
setIsResetMode(false);

setLoginForm({
  email: "",
  password: "",
  resetCheck: ""
});

}


  function logout() {
    setCurrentUser(null);
    setCart([]);
    setLastOrder(null);
    setOrders([]);
    setOrderItems({});
    setMessage("");
    setCheckoutError("");
    navigate("/");
  }

  function saveProfile() {
    if (!currentUser) return;

    const updatedUser = {
      ...currentUser,
      ...profileForm,
    };

    setUsers((prev) =>
      prev.map((u) => (u.id === currentUser.id ? updatedUser : u))
    );
    setCurrentUser(updatedUser);
    setMessage("Your details were updated.");
  }

  function addToCart(product) {
    const existing = cart.find((item) => item.id === product.id);

    if (existing) {
      setCart(
        cart.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        )
      );
      return;
    }

    setCart([
      ...cart,
      {
        id: product.id,
        name: product.name,
        price: Number(getPrice(product)),
        qty: 1,
      },
    ]);
  }

  function increaseQty(id) {
    setCart(
      cart.map((item) =>
        item.id === id ? { ...item, qty: item.qty + 1 } : item
      )
    );
  }

  function decreaseQty(id) {
    setCart(
      cart
        .map((item) =>
          item.id === id ? { ...item, qty: item.qty - 1 } : item
        )
        .filter((item) => item.qty > 0)
    );
  }

  function removeItem(id) {
    setCart(cart.filter((item) => item.id !== id));
  }

  const subtotal = cart.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0),
    0
  );
  const total = subtotal;

  function placeOrder() {
    setCheckoutError("");
    setMessage("");

    if (!currentUser) {
      setCheckoutError("You must create an account or log in before placing an order.");
      return;
    }

    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();

    let deliveryDayMessage = "";
    if (day < 1 || day > 5) {
      deliveryDayMessage = "Order placed on weekend — delivery will be Monday.";
    }

    let deliveryMessage = "Same-day delivery applied.";
    if (hour >= 12) {
      deliveryMessage = "Order placed after 12pm — delivery will be next working day.";
    }

    if (cart.length === 0) {
      setCheckoutError("Your basket is empty.");
      return;
    }

    if (isBar) {
      if (
        !checkoutForm.contactName ||
        !checkoutForm.email ||
        !checkoutForm.companyName ||
        !checkoutForm.address ||
        !checkoutForm.nif
      ) {
        setCheckoutError("Bar checkout needs contact name, email, company name, address and NIF.");
        return;
      }
    } else if (!isStaff) {
      if (
        !checkoutForm.contactName ||
        !checkoutForm.email ||
        !checkoutForm.hotelRoom ||
        !checkoutForm.hotelAddress
      ) {
        setCheckoutError("Customer checkout needs name, email, hotel room and hotel address.");
        return;
      }
    }

 const orderNumber = `ARTH-${Date.now().toString().slice(-8)}`;

setLastOrder({
  orderNumber,
  customerType: isBar ? "Bar Customer" : isStaff ? "Staff" : "Standard Customer",
  delivery: "Free",
  total: Number(total).toFixed(2),
  items: cart,
});

fetch(`${API_BASE}/create-checkout-session`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    items: cart,
    customerName: checkoutForm.contactName,
    email: checkoutForm.email,
    role: currentUser.role,
    hotelRoom: checkoutForm.hotelRoom || "",
    hotelAddress: checkoutForm.hotelAddress || "",
  }),
})
  // ✅ YOU WERE MISSING THIS
  .then((res) => res.json())
.then(async (data) => {
  if (!data.url) {
    setCheckoutError("Stripe session failed");
    return;
  }

  try {
    // ✅ WAIT FOR ORDER TO SAVE
    await fetch(`${API_BASE}/order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customerName: checkoutForm.contactName,
        email: checkoutForm.email,
        total: total,
        items: cart,
        role: currentUser.role,
        hotelRoom: checkoutForm.hotelRoom || "",
        hotelAddress: checkoutForm.hotelAddress || "",
      }),
    });

    console.log("✅ ORDER SAVED");
  } catch (err) {
    console.error("❌ ORDER SAVE FAILED:", err);
  }

  // ✅ NOW redirect AFTER save is done
  window.location.href = data.url;
})

  .catch(() => {
    setCheckoutError("Checkout failed");
  });

}

  function markDelivered(orderId) {
    fetch(`${API_BASE}/orders/update`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: orderId,
        status: "Delivered",
        note: orderNotes[orderId] || "",
      }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Update failed");
        try {
          return await res.json();
        } catch {
          return {};
        }
      })
      .then(() => {
        setMessage(`Order ${orderId} marked as Delivered.`);
        refreshOrders();
      })
      .catch(() => {
        setMessage("Could not update order status.");
      });
  }

 function addProduct() {
  if (!newProduct.name || !newProduct.category || !newProduct.retailPrice || !newProduct.barPrice) {
    setMessage("Enter product name, category and both prices.");
    return;
  }

  fetch(`${API_BASE}/products/add`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: newProduct.name,
      category: newProduct.category,
      retailPrice: Number(newProduct.retailPrice),
      barPrice: Number(newProduct.barPrice),
      description: newProduct.description || "",
    }),
  })
    .then((res) => {
      if (!res.ok) throw new Error("Add product failed");
      return res.json();
    })
    .then(() => {
      setMessage("Product added.");
      setNewProduct({
        name: "",
        category: "",
        retailPrice: "",
        barPrice: "",
        description: "",
      });
      return fetch(`${API_BASE}/products`);
    })
    .then((res) => res.json())
    .then((data) => {
      const cleanProducts = Array.isArray(data)
        ? data.map((p, index) => ({
            id: p.id ?? index + 1,
            name: p.name || "Unnamed product",
            category: p.category || "Uncategorised",
            description: p.description || "",
            retailPrice: Number(p.retailprice ?? p.retailPrice ?? p.price ?? 0),
            barPrice: Number(
  p.barprice ??
  p.barPrice ??
  p.retailprice ??
  p.retailPrice ??
  0
),
          }))
        : [];

      setProducts(cleanProducts);
    })
    .catch(() => {
      setMessage("Could not add product.");
    });
}

  function loadItems(orderId) {
    fetch(`${API_BASE}/order-items/${orderId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Items load failed");
        return res.json();
      })
      .then((data) => {
        setOrderItems((prev) => ({
          ...prev,
          [orderId]: Array.isArray(data) ? data : [],
        }));
      })
      .catch(() => {
        setOrderItems((prev) => ({
          ...prev,
          [orderId]: [],
        }));
      });
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div style={styles.brandWrap}>
            <img src={logo} alt="Arthurs Off Licence logo" style={styles.logo} />
            <div style={{
  textAlign: "center",
  flex: 1,
}}>
  <p style={{ ...styles.kicker, marginBottom: "4px", textAlign: "center" }}>
    Premium drinks delivery
  </p>

  <h1 style={{ ...styles.h1, textAlign: "center" }}>
    Arthurs Off Licence
  </h1>

  <p style={{ ...styles.sub, textAlign: "center", maxWidth: "500px", margin: "0 auto" }}>
    Browse, order and manage stock with a cleaner, multi-page experience.
  </p>
</div>

          </div>

          <div style={styles.userBox}>
            <strong>User type:</strong>{" "}
            {isStaff ? "Staff" : isBar ? "Bar Customer" : currentUser ? "Standard Customer" : "Guest"}
            <div style={{ marginTop: 6, fontSize: 12 }}>
              {currentUser
                ? isStaff
                  ? "Internal account"
                  : isBar
                  ? "Bar discount pricing"
                  : "Standard customer pricing"
                : "Not logged in"}
            </div>
          </div>
        </header>

        <nav style={styles.nav}>
          <div style={styles.navLinks}>
            <Link style={styles.navLink} to="/">Products</Link>
            <Link style={styles.navLink} to="/cart">Cart ({cart.reduce((total, item) => total + item.qty, 0)})</Link>
            <Link style={styles.navLink} to="/orders">Orders</Link>
            {currentUser && <Link style={styles.navLink} to="/account">Account</Link>}
            {isStaff && <Link style={styles.navLink} to="/add-product">Add Product</Link>}
          </div>

          <div style={styles.navActions}>
            {!currentUser ? (
              <Link style={styles.primaryNavBtn} to="/login">Login / Register</Link>
            ) : (
              <button style={styles.secondaryBtn} onClick={logout}>Logout</button>
            )}
          </div>
        </nav>

        <Routes>
          <Route
            path="/"
            element={
              <ProductsPage
  filteredProducts={filteredProducts}
  categories={categories}
  category={category}
  setCategory={setCategory}
  search={search}
  setSearch={setSearch}
  searchSuggestions={searchSuggestions}
  addToCart={addToCart}
  getPrice={getPrice}
  isBar={isBar}
  isStaff={isStaff}
  page={page}
  setPage={setPage}
/>
            }
          />

          <Route
            path="/cart"
            element={
              <CartPage
                cart={cart}
                subtotal={subtotal}
                total={total}
                decreaseQty={decreaseQty}
                increaseQty={increaseQty}
                removeItem={removeItem}
              />
            }
          />

          <Route
            path="/checkout"
            element={
              <CheckoutPage
                currentUser={currentUser}
                isBar={isBar}
                isStaff={isStaff}
                checkoutForm={checkoutForm}
                setCheckoutForm={setCheckoutForm}
                checkoutError={checkoutError}
                placeOrder={placeOrder}
                total={total}
                cart={cart}
                message={message}
              />
            }
          />

          <Route
            path="/orders"
            element={
              <OrdersPage
                currentUser={currentUser}
                isStaff={isStaff}
                orders={orders}
                orderItems={orderItems}
                loadItems={loadItems}
                orderNotes={orderNotes}
                setOrderNotes={setOrderNotes}
                markDelivered={markDelivered}
                message={message}
                lastOrder={lastOrder}
              />
            }
          />

          <Route
            path="/add-product"
            element={
              isStaff ? (
                <AddProductPage
                  newProduct={newProduct}
                  setNewProduct={setNewProduct}
                  addProduct={addProduct}
                  message={message}
                />
              ) : (
                <Navigate to="/" />
              )
            }
          />

          <Route
  path="/account"
  element={
    currentUser ? (
      <AccountPage
        isBar={isBar}
        isStaff={isStaff}
        profileForm={profileForm}
        setProfileForm={setProfileForm}
        saveProfile={saveProfile}
        message={message}
      />
    ) : (
      <Navigate to="/login" />
    )
  }
/>

          <Route
            path="/login"
            element={
              !currentUser ? (
                <LoginPage
                  authMode={authMode}
                  setAuthMode={setAuthMode}
                  registerForm={registerForm}
                  setRegisterForm={setRegisterForm}
                  loginForm={loginForm}
                  setLoginForm={setLoginForm}
                  createAccount={createAccount}
                  login={login}
                  resetPassword={resetPassword}
                  isResetMode={isResetMode}
                  setIsResetMode={setIsResetMode}
                  message={message}
                  
                />
              ) : (
                <Navigate to="/" />
              )
            }
          />
        </Routes>
      </div>
    </div>
  );
}

function ProductsPage({
  filteredProducts,
  categories,
  category,
  setCategory,
  search,
  setSearch,
  searchSuggestions,
  addToCart,
  getPrice,
  isBar,
  isStaff,
  page,
  setPage,
}) {
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE));
  const startIndex = (page - 1) * PRODUCTS_PER_PAGE;
  const currentProducts = filteredProducts.slice(startIndex, startIndex + PRODUCTS_PER_PAGE);

  const visiblePages = [];
  for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i += 1) {
    visiblePages.push(i);
  }

  const [editingProduct, setEditingProduct] = useState(null);
const [editPrices, setEditPrices] = useState({
  retailPrice: "",
  barPrice: "",
});

  return (
    <section style={styles.card}>
      <h2 style={styles.sectionTitle}>Browse Products</h2>

      <div style={styles.searchRow}>
  <div style={{ position: "relative", flexGrow: 1 }}>
    <input
      style={styles.searchInput}
      placeholder="Search products"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
    />

    {search.trim() && searchSuggestions.length > 0 && (
      <div style={styles.suggestionBox}>
        {searchSuggestions.map((item) => (
          <button
            key={item.id}
            type="button"
            style={styles.suggestionItem}
            onClick={() => setSearch(item.name)}
          >
            {item.name}
          </button>
        ))}
      </div>
    )}
  </div>



  {/* DROPDOWN */}
  <select
    style={{
      ...styles.input,
      flex: 1,
      height: "42px",
      minWidth: "200px",
    }}
    value={category}
    onChange={(e) => setCategory(e.target.value)}
  >
    {categories.map((c) => (
      <option key={c}>{c}</option>
    ))}
  </select>
</div>

      <div style={styles.resultsInfo}>
        Showing {currentProducts.length} of {filteredProducts.length} products
      </div>

      {editingProduct && (
  <div
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,0,0,0.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
    }}
  >
    <div
      style={{
        background: "#ffffff",
        padding: "20px",
        borderRadius: "12px",
        width: "300px",
        boxSizing: "border-box",
        maxWidth: "90%",
        boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
      }}
    >
      <h3 style={{ marginTop: 0, color: "#F97316" }}>
        Edit Prices
      </h3>

     <p style={{ fontWeight: "bold", marginBottom: "10px" }}>
  {editingProduct.name}
</p>

<p style={{ fontSize: "13px", marginBottom: "4px" }}>
  Retail price
</p>
<input
  style={{
  width: "92%",
  boxSizing: "border-box",
  padding: "8px",
  borderRadius: "6px",
  border: "1px solid #d1d5db",
  margin: "0 auto 12px auto",
  display: "block",
  background: "#ffffff",
  color: "#111827",
}}

  value={editPrices.retailPrice}
  onChange={(e) =>
    setEditPrices({
      ...editPrices,
      retailPrice: e.target.value,
    })
  }
/>

<p style={{ fontSize: "13px", marginBottom: "4px" }}>
  Bar price
</p>
<input
style={{
  width: "92%",
  boxSizing: "border-box",
  padding: "8px",
  borderRadius: "6px",
  border: "1px solid #d1d5db",
  margin: "0 auto 12px auto",
  display: "block",
  background: "#ffffff",
  color: "#111827",
  outline: "none",
}}

  value={editPrices.barPrice}
  onChange={(e) =>
    setEditPrices({
      ...editPrices,
      barPrice: e.target.value,
    })
  }
/>


      <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
        <button
          style={styles.primaryBtn}
          onClick={() => {
            fetch(`${API_BASE}/products/update`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                id: editingProduct.id,
                retailPrice: Number(editPrices.retailPrice),
                barPrice: Number(editPrices.barPrice),
              }),
            })
              .then((res) => {
                if (!res.ok) throw new Error();
                window.location.reload();
              })
              .catch(() => alert("Failed to update product"));
          }}
        >
          Save
        </button>

        <button
          style={styles.secondaryBtn}
          onClick={() => {
            setEditingProduct(null);
            setEditPrices({
              retailPrice: "",
              barPrice: "",
            });
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}

      <div style={styles.productGrid}>
  {currentProducts.map((p) => (
    <div key={p.id} style={styles.productCard}>
      <div>
        <p style={styles.categoryTag}>{p.category}</p>
        <h3 style={styles.productTitle}>{p.name}</h3>
        <p style={styles.desc}>{p.description || " "}</p>
      </div>

      <div>
        <p style={styles.price}>€{Number(getPrice(p)).toFixed(2)}</p>
        <p style={styles.smallText}>
          {isBar ? "Bar discount applied" : ""}
        </p>
      </div>

      <div
  style={{
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginTop: "10px",
  }}
>
  <button
    style={styles.primaryBtn}
    onClick={() => addToCart(p)}
  >
    Add to Basket
  </button>

  {isStaff && (
    <button
      style={styles.removeBtn}
      onClick={() => {
        if (!window.confirm(`Delete ${p.name}?`)) return;

        fetch(`${API_BASE}/products/delete`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id: p.id }),
        })
          .then((res) => {
            if (!res.ok) throw new Error();
            window.location.reload();
          })
          .catch(() => alert("Failed to delete product"));
      }}
    >
      Delete Product
    </button>
  )}

  {isStaff && (
    <button
      style={styles.secondaryBtn}
      onClick={() => {
        setEditingProduct(p);
        setEditPrices({
          retailPrice: Number(p.retailPrice || 0).toFixed(2),
          barPrice: Number(p.barPrice || 0).toFixed(2),
        });
      }}
    >
      Edit Price
    </button>
  )}
</div>
    </div>
  ))}
</div>

      <div style={styles.paginationWrap}>
        <button
          style={styles.paginationBtn}
          onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          disabled={page === 1}
        >
          ← Previous
        </button>

        <div style={styles.pageNumberWrap}>
          {visiblePages.map((num) => (
            <button
              key={num}
              style={num === page ? styles.pageNumberActive : styles.pageNumber}
              onClick={() => setPage(num)}
            >
              {num}
            </button>
          ))}
        </div>

        <button
          style={styles.paginationBtn}
          onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          disabled={page === totalPages}
        >
          Next →
        </button>
      </div>
    </section>
  );
}

function CartPage({ cart, subtotal, total, decreaseQty, increaseQty, removeItem }) {
  const navigate = useNavigate();
  return (
    <section style={styles.card}>
      <h2 style={styles.sectionTitle}>Basket</h2>

      {cart.length === 0 ? (
        <p style={styles.desc}>Your basket is empty.</p>
      ) : (
        <>
          {cart.map((item) => (
            <div key={item.id} style={styles.basketItem}>
              <div>
                <strong>{item.name}</strong>
                <p style={{ fontSize: "18px", fontWeight: "bold", margin: "4px 0", color: "#111827" }}>
  €{Number(item.price).toFixed(2)} each
</p>
              </div>

         <div style={styles.qtyRow}>
  <button
    style={styles.qtyBtn}
    onClick={() => decreaseQty(item.id)}
  >
    −
  </button>

  <span style={{ ...styles.qtyText, margin: "0 8px" }}>
    {item.qty}
  </span>

  <button
    style={{ ...styles.qtyBtn, marginRight: "12px" }}
    onClick={() => increaseQty(item.id)}
  >
    +
  </button>

  <button
    style={{ ...styles.removeBtn, marginLeft: "10px" }}
    onClick={() => removeItem(item.id)}
  >
    Remove
  </button>
</div>
            </div>
          ))}

          <div style={styles.totalBox}>
  <p><strong>Subtotal:</strong> €{Number(subtotal).toFixed(2)}</p>
  <p><strong>Delivery:</strong> Free</p>
  <p style={styles.total}>
    <strong>Total:</strong> €{Number(total).toFixed(2)}
  </p>

  <button
    style={{ ...styles.primaryBtn, marginTop: "12px", width: "100%" }}
    onClick={() => navigate("/checkout")}
  >
    Go to Checkout
  </button>

  <div
    style={{
      marginTop: "12px",
      padding: "10px",
      background: "#f1f5f9",
      borderRadius: "8px",
      fontSize: "13px",
      textAlign: "center",
      color: "#334155"
    }}
  >
    🔒 You will be redirected to Stripe for secure payment
  </div>
</div>
        </>
      )}
    </section>
  );
}

function CheckoutPage({
  currentUser,
  isBar,
  isStaff,
  checkoutForm,
  setCheckoutForm,
  checkoutError,
  placeOrder,
  total,
  cart,
  message,
}) {
  return (
    <section style={styles.card}>
      <h2 style={styles.sectionTitle}>Checkout</h2>

      {!currentUser && (
        <div style={styles.errorBox}>
          You must log in before checking out.
        </div>
      )}

{currentUser && cart.length > 0 && (
  <div style={styles.successBox}>
    Confirm account details before checking out.
  </div>
)}


      <div style={styles.formGrid}>
        <input
          style={styles.input}
          placeholder="Contact name"
          value={checkoutForm.contactName}
          onChange={(e) =>
            setCheckoutForm({ ...checkoutForm, contactName: e.target.value })
          }
        />

        <input
          style={styles.input}
          placeholder="Email"
          value={checkoutForm.email}
          onChange={(e) =>
            setCheckoutForm({ ...checkoutForm, email: e.target.value })
          }
        />

        {isBar ? (
          <>
            <input
              style={styles.input}
              placeholder="Company name"
              value={checkoutForm.companyName}
              onChange={(e) =>
                setCheckoutForm({ ...checkoutForm, companyName: e.target.value })
              }
            />
            <input
              style={styles.input}
              placeholder="Business address"
              value={checkoutForm.address}
              onChange={(e) =>
                setCheckoutForm({ ...checkoutForm, address: e.target.value })
              }
            />
            <input
              style={styles.input}
              placeholder="NIF number"
              value={checkoutForm.nif}
              onChange={(e) =>
                setCheckoutForm({ ...checkoutForm, nif: e.target.value })
              }
            />
          </>
        ) : !isStaff ? (
          <>
            <input
              style={styles.input}
              placeholder="Hotel room"
              value={checkoutForm.hotelRoom}
              onChange={(e) =>
                setCheckoutForm({ ...checkoutForm, hotelRoom: e.target.value })
              }
            />
            <input
              style={styles.input}
              placeholder="Hotel address"
              value={checkoutForm.hotelAddress}
              onChange={(e) =>
                setCheckoutForm({ ...checkoutForm, hotelAddress: e.target.value })
              }
            />
          </>
        ) : null}
      </div>

      {checkoutError && (
        <div style={styles.errorBox}>{checkoutError}</div>
      )}

      <div style={styles.checkoutSummary}>
  <p><strong>Items:</strong> {cart.length}</p>
  <p><strong>Total:</strong> €{Number(total).toFixed(2)}</p>

  <div style={{ marginTop: "12px", padding: "12px", background: "#f9fafb", borderRadius: "8px" }}>
    <p style={{ fontWeight: "bold", marginBottom: "8px" }}>Final order summary</p>
    {cart.map((item) => (
      <p key={item.id} style={{ margin: "4px 0", fontSize: "14px" }}>
        {item.name} x {item.qty} — €{Number(item.price).toFixed(2)} each
      </p>
    ))}
  </div>
</div>

      <button style={styles.primaryBtn} onClick={placeOrder}>
        Place Order
      </button>
    </section>
  );
}


function OrdersPage({
  currentUser,
  isStaff,
  orders,
  orderItems,
  loadItems,
  orderNotes,
  setOrderNotes,
  markDelivered,
  message,
  lastOrder,
}) {
  const [openOrders, setOpenOrders] = useState({});

  if (!currentUser) {
    return (
      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>Orders</h2>
        <div style={styles.errorBox}>You need to log in to view orders.</div>
      </section>
    );
  }

  return (
    <section style={styles.card}>
      <h2 style={styles.sectionTitle}>
        {isStaff ? "Staff Orders" : "My Orders"}
      </h2>

      {message && <div style={styles.successBox}>{message}</div>}

      {orders.length === 0 ? (
        <p>No orders found.</p>
      ) : (
        orders.map((order) => (
          <div key={order.id} style={styles.orderCard}>
            <p><strong>Order #{order.id}</strong></p>

<p><strong>Name:</strong> {order.customerName || "N/A"}</p>
<p><strong>Email:</strong> {order.email || "N/A"}</p>

{order.hotelRoom && (
  <p><strong>Room:</strong> {order.hotelRoom}</p>
)}

{order.hotelAddress && (
  <p><strong>Address:</strong> {order.hotelAddress}</p>
)}

<p><strong>Total:</strong> €{Number(order.total || 0).toFixed(2)}</p>

            <button
              onClick={() => {
                if (openOrders[order.id]) {
                  setOpenOrders(prev => ({ ...prev, [order.id]: false }));
                } else {
                  loadItems(order.id);
                  setOpenOrders(prev => ({ ...prev, [order.id]: true }));
                }
              }}
            >
              {openOrders[order.id] ? "Hide Items" : "View Items"}
            </button>

            {openOrders[order.id] &&
              Array.isArray(orderItems[order.id]) && (
                <div>
                  {orderItems[order.id].map((item, i) => (
                    <p key={i}>
                      {item.productName} x {item.quantity}
                    </p>
                  ))}
                </div>
              )}

            {isStaff && (
              <>
                <input
                  placeholder="Delivery note"
                  value={orderNotes[order.id] || ""}
                  onChange={(e) =>
                    setOrderNotes((prev) => ({
                      ...prev,
                      [order.id]: e.target.value,
                    }))
                  }
                  style={styles.input}
                />

                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px" }}>
  <button
    style={styles.primaryBtn}
    onClick={() => markDelivered(order.id)}
  >
    Mark Delivered
  </button>

  <button
    style={styles.removeBtn}
    onClick={() => {
      if (!window.confirm(`Delete order #${order.id}?`)) return;

      fetch(`${API_BASE}/orders/delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: order.id }),
      })
        .then((res) => {
          if (!res.ok) throw new Error();
          window.location.reload();
        })
        .catch(() => alert("Failed to delete order"));
    }}
  >
    Delete Order
  </button>
</div>
              </>
            )}
          </div>
        ))
      )}
    </section>
  );
}


function AddProductPage({ newProduct, setNewProduct, addProduct, message }) {
  return (
    <section style={styles.card}>
      <h2 style={styles.sectionTitle}>Add Product</h2>

      {message && <div style={styles.successBox}>{message}</div>}

      <div style={styles.formGrid}>
        <input
          style={styles.input}
          placeholder="Product name"
          value={newProduct.name}
          onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
        />
        <select
  style={styles.input}
  value={newProduct.category}
  onChange={(e) =>
    setNewProduct({ ...newProduct, category: e.target.value })
  }
>
  <option value="">Select category</option>
  <option value="soft drinks">Soft drinks</option>
  <option value="beer">Beer</option>
  <option value="wine">Wine</option>
  <option value="spirits">Spirits</option>
  <option value="snacks">Snacks</option>
</select>
        <input
          style={styles.input}
          placeholder="Retail price"
          value={newProduct.retailPrice}
          onChange={(e) => setNewProduct({ ...newProduct, retailPrice: e.target.value })}
        />
        <input
          style={styles.input}
          placeholder="Bar price"
          value={newProduct.barPrice}
          onChange={(e) => setNewProduct({ ...newProduct, barPrice: e.target.value })}
        />
        <input
          style={styles.input}
          placeholder="Description"
          value={newProduct.description}
          onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
        />
      </div>

      <button style={styles.primaryBtn} onClick={addProduct}>
        Add Product
      </button>
    </section>
  );
}

function AccountPage({ isBar, isStaff, profileForm, setProfileForm, saveProfile, message }) {
  return (
    <section style={styles.card}>
      <h2 style={styles.sectionTitle}>My Details</h2>

      {message && <div style={styles.successBox}>{message}</div>}

      <div style={styles.formGrid}>
        <input
          style={styles.input}
          placeholder="Full name"
          value={profileForm.fullName}
          onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
        />
        <input
          style={styles.input}
          placeholder="Email"
          value={profileForm.email}
          onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
        />

       {isBar ? (
  <>
    <input
      style={styles.input}
      placeholder="Company name"
      value={profileForm.companyName}
      onChange={(e) => setProfileForm({ ...profileForm, companyName: e.target.value })}
    />
    <input
      style={styles.input}
      placeholder="Business address"
      value={profileForm.address}
      onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
    />
    <input
      style={styles.input}
      placeholder="NIF"
      value={profileForm.nif}
      onChange={(e) => setProfileForm({ ...profileForm, nif: e.target.value })}
    />
  </>
) : !isStaff ? (
  <>
    <input
      style={styles.input}
      placeholder="Hotel room"
      value={profileForm.hotelRoom}
      onChange={(e) => setProfileForm({ ...profileForm, hotelRoom: e.target.value })}
    />
    <input
      style={styles.input}
      placeholder="Hotel address"
      value={profileForm.hotelAddress}
      onChange={(e) => setProfileForm({ ...profileForm, hotelAddress: e.target.value })}
    />
  </>
) : null}
  
      </div>

      <button style={styles.primaryBtn} onClick={saveProfile}>
        Save My Details
      </button>
    </section>
  );
}

function LoginPage({
  authMode,
  setAuthMode,
  registerForm,
  setRegisterForm,
  loginForm,
  setLoginForm,
  createAccount,
  login,
  resetPassword,
  isResetMode,
  setIsResetMode,
  message,
}) {
  return (
    <section style={styles.authCard}>
      {message && <div style={styles.formMessage}>{message}</div>}

      {authMode === "register" ? (
        <>
          <h2 style={styles.sectionTitle}>Create Account</h2>

          <div style={styles.formGrid}>
            <select
              style={styles.input}
              value={registerForm.role}
              onChange={(e) =>
                setRegisterForm({ ...registerForm, role: e.target.value })
              }
            >
              <option value="customer">Standard Customer</option>
              <option value="bar">Bar Customer</option>
            </select>

            <input
              style={styles.input}
              placeholder="Full name"
              value={registerForm.fullName}
              onChange={(e) =>
                setRegisterForm({ ...registerForm, fullName: e.target.value })
              }
            />

            <input
              style={styles.input}
              placeholder="Email"
              value={registerForm.email}
              onChange={(e) =>
                setRegisterForm({ ...registerForm, email: e.target.value })
              }
            />

            <input
              style={styles.input}
              type="password"
              placeholder="Password"
              value={registerForm.password}
              onChange={(e) =>
                setRegisterForm({ ...registerForm, password: e.target.value })
              }
            />

            {registerForm.role === "bar" ? (
              <>
                <input
                  style={styles.input}
                  placeholder="Company name"
                  value={registerForm.companyName}
                  onChange={(e) =>
                    setRegisterForm({
                      ...registerForm,
                      companyName: e.target.value,
                    })
                  }
                />

                <input
                  style={styles.input}
                  placeholder="Business address"
                  value={registerForm.address}
                  onChange={(e) =>
                    setRegisterForm({
                      ...registerForm,
                      address: e.target.value,
                    })
                  }
                />

                <input
                  style={styles.input}
                  placeholder="NIF number"
                  value={registerForm.nif}
                  onChange={(e) =>
                    setRegisterForm({ ...registerForm, nif: e.target.value })
                  }
                />
              </>
            ) : (
              <>
                <input
                  style={styles.input}
                  placeholder="Hotel room"
                  value={registerForm.hotelRoom}
                  onChange={(e) =>
                    setRegisterForm({
                      ...registerForm,
                      hotelRoom: e.target.value,
                    })
                  }
                />

                <input
                  style={styles.input}
                  placeholder="Hotel address"
                  value={registerForm.hotelAddress}
                  onChange={(e) =>
                    setRegisterForm({
                      ...registerForm,
                      hotelAddress: e.target.value,
                    })
                  }
                />
              </>
            )}
          </div>

          <button
            style={{ ...styles.primaryBtn, marginTop: "20px" }}
            onClick={createAccount}
          >
            Create Account
          </button>

          <p style={{ marginTop: "20px", fontSize: 14 }}>
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => setAuthMode("login")}
              style={{
                background: "none",
                border: "none",
                color: "#F97316",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Login here
            </button>
          </p>
        </>
      ) : (
        <>
          <h2 style={styles.sectionTitle}>Login</h2>

          <div style={styles.formGrid}>
            <input
              style={styles.input}
              placeholder="Email"
              value={loginForm.email}
              onChange={(e) =>
                setLoginForm({ ...loginForm, email: e.target.value })
              }
            />

            <input
              style={styles.input}
              type="password"
              placeholder="Password / New password"
              value={loginForm.password}
              onChange={(e) =>
                setLoginForm({ ...loginForm, password: e.target.value })
              }
            />
          </div>

          {isResetMode && (
  <input
    style={styles.input}
    placeholder="Hotel room (or NIF for bars)"
    value={loginForm.resetCheck || ""}
    onChange={(e) =>
      setLoginForm({ ...loginForm, resetCheck: e.target.value })
    }
    />
  )}


          <button
  style={{ ...styles.primaryBtn, marginTop: "20px" }}
  onClick={isResetMode ? resetPassword : login}
>
  {isResetMode ? "Confirm reset" : "Login"}
</button>


          <p style={{ marginTop: "20px", fontSize: 14 }}>
            Need an account?{" "}
            <button
              type="button"
              onClick={() => setAuthMode("register")}
              style={{
                background: "none",
                border: "none",
                color: "#F97316",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Register here
            </button>
          </p>

          <button
  type="button"
  style={{ ...styles.secondaryBtn, marginTop: "10px" }}
  onClick={() => setIsResetMode(!isResetMode)}
>
  {isResetMode ? "Back to login" : "Forgot password?"}
</button>


  {/* ✅ THIS WILL NOW SHOW PROPERLY */}
  <p
    style={{
      marginTop: "8px",
      fontSize: "12px",
      color: "#6b7280",
      textAlign: "center",
    }}
  >
    Click this button if you have forgotten your password and want to reset it.
  </p>

  <p style={{ marginTop: 12, fontSize: 12, color: "#6b7280" }}>
    Staff demo login: <strong>staff@arthurs.test</strong> /{" "}
    <strong>demo123</strong>
  </p>
</>

      )}
    </section>
  );
}

const styles = {
  page: {
    background: "#F9FAFB",
    minHeight: "100vh",
    padding: "24px",
    fontFamily: "Arial, sans-serif",
    color: "#1f2937",
  },

  container: {
    maxWidth: "1360px",
    margin: "0 auto",
  },

header: {
  background: "#ffffff",
  borderRadius: "16px",
  padding: "20px",
  marginBottom: "20px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  borderTop: "6px solid #16A34A",
  boxShadow: "0 6px 16px rgba(0,0,0,0.05)",
},

 brandWrap: {
  display: "flex",
  alignItems: "center",
  gap: "16px",
  flex: 1,
},

  nav: {
    background: "#ffffff",
    borderRadius: "12px",
    padding: "12px 16px",
    marginBottom: "20px",
    display: "flex",
    justifyContent: "space-between",
    flexWrap: "wrap",
    border: "1px solid #e5e7eb",
  },

  navLinks: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },

  navLink: {
    color: "#ffffff",
    textDecoration: "none",
    fontWeight: "bold",
    padding: "8px 12px",
    borderRadius: "6px",
    background: "#16A34A",
  },

  navActions: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
  },

  // ✅ FIXED LOGOUT BUTTON
  secondaryBtn: {
    background: "#ffffff",
    color: "#111827", // ⚠️ THIS was missing visually
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: "bold",
  },

  primaryNavBtn: {
    background: "#F97316",
    color: "#ffffff",
    borderRadius: "6px",
    padding: "10px 14px",
    fontWeight: "bold",
    textDecoration: "none",
  },

  logo: {
    width: "240px",
  },

  kicker: {
    color: "#16A34A",
    margin: 0,
    fontWeight: "bold",
    fontSize: "14px",
  },

  h1: {
    margin: "4px 0",
    fontSize: "28px", // ✅ smaller, cleaner
    color: "#F97316",
  },

  sub: {
    fontSize: "14px",
    color: "#4b5563",
  },

  sectionTitle: {
    textAlign: "center",
    color: "#F97316",
    fontSize: "22px",
    marginBottom: "16px",
  },

  userBox: {
    background: "#DCFCE7",
    border: "1px solid #16A34A",
    borderRadius: "10px",
    padding: "10px 12px",
    fontSize: "13px",
  },

  card: {
    background: "#ffffff",
    borderRadius: "14px",
    padding: "18px",
    marginBottom: "20px",
    border: "1px solid #e5e7eb",
  },

  input: {
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #d1d5db",
    width: "100%",
  },

  primaryBtn: {
    background: "#F97316",
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
    padding: "8px 12px",
    cursor: "pointer",
    fontWeight: "bold",
  },

  productGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "14px",
  },

  productCard: {
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "14px",
    textAlign: "center",
    background: "#ffffff",
  },

  categoryTag: {
    color: "#16A34A",
    fontSize: "15px",
    fontWeight: "bold",
  },

  price: {
    fontWeight: "bold",
    fontSize: "18px",
  },

  smallText: {
    fontSize: "11px",
    color: "#6b7280",
  },

  paginationWrap: {
    display: "flex",
    justifyContent: "center",
    gap: "10px",
    marginTop: "20px",
  },

  paginationBtn: {
    padding: "6px 12px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    background: "#ffffff",
    cursor: "pointer",
  },

  pageNumber: {
    width: "32px",
    height: "32px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    background: "#ffffff",
    cursor: "pointer",
  },

  pageNumberActive: {
    width: "32px",
    height: "32px",
    borderRadius: "6px",
    border: "1px solid #F97316",
    background: "#F97316",
    color: "#ffffff",
    cursor: "pointer",
  },

  errorBox: {
    background: "#FEF2F2",
    color: "#991B1B",
    padding: "10px",
    borderRadius: "6px",
  },

  successBox: {
    background: "#ECFDF5",
    color: "#065F46",
    padding: "10px",
    borderRadius: "6px",
  },

  formMessage: {
    background: "#FEF3C7",
    color: "#92400E",
    padding: "10px",
    borderRadius: "6px",
  },

  
searchRow: {
  display: "flex",
  gap: "12px",
  alignItems: "center",
  marginBottom: "20px",
},

searchInput: {
  width: "100%",
  padding: "10px",
  height: "42px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  boxSizing: "border-box",
},

select: {
  width: "200px",
  padding: "10px",
  height: "42px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  boxSizing: "border-box",
},

};

