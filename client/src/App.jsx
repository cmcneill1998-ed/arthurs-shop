import { useEffect, useMemo, useState } from "react";
import { Routes, Route, Link, Navigate, useNavigate } from "react-router-dom";
import logo from "./image.png";
import Orders from "./Orders";
import LegalNoticePage from "./pages/LegalNoticePage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import CookiePolicyPage from "./pages/CookiePolicyPage";
import TermsPage from "./pages/TermsPage";
import AlcoholPolicyPage from "./pages/AlcoholPolicyPage";
import DeliveryPage from "./pages/DeliveryPage";


const API_BASE = "https://arthurs-shop.onrender.com";

const PRODUCTS_PER_PAGE = 12;

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

    {
      id: 2,
      role: "bar",
      fullName: "Charlotte",
      email: "mcneill1992spam@hotmail.com",
      password: "123",
      CompanyName: "123",
      address: "123",
      nif: "123", 
      
    },

    {
      id: 3,
      role: "customer",
      fullName: "Charlotte",
      email: "s2328389@students.ncl-coll.ac.uk",
      password: "123",
      hotelRoom: "123",
      hotelAddress: "123",
      
    }
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
  const [orderNote, setOrderNote] = useState("");

  const [message, setMessage] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  const [search, setSearch] = useState("");
  const [isResetMode, setIsResetMode] = useState(false);
  const [category, setCategory] = useState("All");
  const [sortBy, setSortBy] = useState("default");
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
  productGroup: "",
  variant: "",
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
      category: p.category || "",
      description: p.description || "",
      image: p.image || "",
      productgroup: p.productgroup || p.productGroup || "",
      variant: p.variant || "",
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

const normalizeCategory = (cat) => {
  const value = String(cat || "").trim().toLowerCase();

  if (["spirit", "spirits"].includes(value))
    return "Spirits";

  if (["liquor", "liquors", "liqueurs"].includes(value))
    return "Liqueurs";

  if (["miniature", "miniatures"].includes(value))
    return "Miniatures";

  if (["beer", "beers"].includes(value))
    return "Beer";

  if (["soft drink", "soft drinks"].includes(value))
    return "Soft Drinks";

  if (["plastic litre", "plastic litres"].includes(value))
    return "Plastic Litres";

  return value
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};


const categories = [
  "All",
  ...new Set(
    products.flatMap((p) =>
      String(p.category || "")
        .split(",")
        .map((c) => normalizeCategory(c))
        .filter(
          (c) =>
            c &&
            c.toLowerCase() !== "uncategorised" &&
            c.toLowerCase() !== "spiritss"
        )
    )
  ),
];

function getPrice(product) {
  const price = isBar
    ? product.barPrice ?? product.barprice
    : product.retailPrice ?? product.retailprice;

  return Number(price || 0);
}

  const filteredProducts = useMemo(() => {
  let results = products.filter((p) => {
    const q = search.toLowerCase();

    const matchesSearch =
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q);

   
   
      

const productCategories = String(p.category || "")
  .split(",")
  .map((c) => normalizeCategory(c));

const selectedCategory = normalizeCategory(category);

const matchesCategory =
  category === "All" ||
  productCategories.includes(selectedCategory);

    return matchesSearch && matchesCategory;
  });

  if (sortBy === "priceLow") {
    results.sort((a, b) => getPrice(a) - getPrice(b));
  }

  if (sortBy === "priceHigh") {
    results.sort((a, b) => getPrice(b) - getPrice(a));
  }

  return results;
}, [products, search, category, sortBy]);

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

    fetch(`${API_BASE}/register`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(registerForm),
})
  .then(async (res) => {
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Register failed");
    }

    setCurrentUser(data);

    localStorage.setItem(
      "arthurs_currentUser",
      JSON.stringify(data)
    );

    setMessage(
      registerForm.role === "bar"
        ? "Bar account created."
        : "Customer account created."
    );

    navigate("/");
  })
  .catch((err) => {
    setMessage(err.message);
  });
  }

 function login() {
  resetMessages();

  fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: loginForm.email,
      password: loginForm.password,
    }),
  })
    .then(async (res) => {
      const data = await res.json();

      if (!res.ok) {
        throw new Error("Login details not recognised.");
      }

      setCurrentUser(data);

      localStorage.setItem(
        "arthurs_currentUser",
        JSON.stringify(data)
      );

      setMessage(
        data.role === "bar"
          ? "Logged in as Bar Customer."
          : data.role === "staff"
          ? "Logged in as Staff."
          : "Logged in as Retail Customer."
      );

      navigate("/");
    })
    .catch((err) => {
      setMessage(err.message);
    });
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

  fetch(`${API_BASE}/users/update`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: currentUser.email,
      ...profileForm,
    }),
  })
    .then((res) => {
      if (!res.ok) throw new Error();
      return res.json();
    })
    .then(() => {
      const updatedUser = {
        ...currentUser,
        ...profileForm,
      };

      setCurrentUser(updatedUser);

      localStorage.setItem(
        "arthurs_currentUser",
        JSON.stringify(updatedUser)
      );

      setMessage("Your details were updated.");
    })
    .catch(() => {
      setMessage("Failed to save details.");
    });
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

  const DELIVERY_THRESHOLD = 20;
const DELIVERY_FEE = 5;

const subtotal = cart.reduce(
  (sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0),
  0
);

const delivery = cart.length > 0 && subtotal < DELIVERY_THRESHOLD ? DELIVERY_FEE : 0;

const total = subtotal + delivery;


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
  delivery: delivery > 0 ? `€${Number(delivery).toFixed(2)}` : "Free",
  total: Number(total).toFixed(2),
  items: cart,
  note: orderNote,
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
  note: orderNote,
}),
    });

    console.log("✅ ORDER SAVED");
    setOrderNote("");
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
  if (
  !newProduct.name ||
  !newProduct.category ||
  isNaN(newProduct.retailPrice) ||
  isNaN(newProduct.barPrice) ||
  Number(newProduct.retailPrice) <= 0 ||
  Number(newProduct.barPrice) <= 0
) {
  setMessage("Enter valid numeric prices (e.g. 0.80)");
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
  productGroup: newProduct.productGroup || "",
  variant: newProduct.variant || "",
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
  productGroup: "",
  variant: "",
});
      return fetch(`${API_BASE}/products`);
    })
    .then((res) => res.json())
    .then((data) => {
      const cleanProducts = Array.isArray(data)
        ? data.map((p, index) => ({
            id: p.id ?? index + 1,
            name: p.name || "Unnamed product",
            category: p.category || "",
            description: p.description || "",
            image: p.image || "",
            productgroup: p.productgroup || p.productGroup || "",
            variant: p.variant || "",
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

  function reorderOrder(orderId) {
  fetch(`${API_BASE}/order-items/${orderId}`)
    .then((res) => {
      if (!res.ok) throw new Error("Could not load previous order");
      return res.json();
    })
    .then((items) => {
      if (!Array.isArray(items) || items.length === 0) {
        alert("No items found for this order");
        return;
      }

      setCart((prevCart) => {
        const updatedCart = [...prevCart];

        items.forEach((item) => {
          const matchedProduct = products.find(
            (p) => p.name.toLowerCase() === String(item.productName || "").toLowerCase()
          );

          const cartItem = {
            id: matchedProduct?.id || `${item.productName}-${Date.now()}`,
            name: item.productName,
            price: Number(item.price || matchedProduct?.retailPrice || 0),
            qty: Number(item.quantity || 1),
          };

          const existing = updatedCart.find(
            (cartProduct) =>
              cartProduct.name.toLowerCase() === cartItem.name.toLowerCase()
          );

          if (existing) {
            existing.qty += cartItem.qty;
          } else {
            updatedCart.push(cartItem);
          }
        });

        return updatedCart;
      });

      alert("Previous order added to basket");
      navigate("/cart");
    })
    .catch(() => {
      alert("Could not reorder this order");
    });
}

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div style={styles.brandWrap}>
            <Link to="/">
  <img
    src={logo}
    alt="Arthurs Off Licence logo"
    style={{
      ...styles.logo,
      cursor: "pointer",
    }}
  />
</Link>
            <div style={{
  textAlign: "center",
  flex: 1,
}}>
  <p style={{ ...styles.sub, textAlign: "center", maxWidth: "500px", margin: "0 auto" }}>
    Premium drinks delivery for both businesses and everyday shoppers. 
  </p>
</div>

          </div>

          <div style={styles.userBox}>
  <strong>User type:</strong>{" "}
  {isStaff ? "Staff" : isBar ? "Bar Customer" : currentUser ? "Standard Customer" : "Guest"}
</div>
        </header>

        <nav style={styles.nav}>
          <div style={styles.navLinks}>
            <Link style={styles.navLink} to="/products">Products</Link>
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
  element={<LandingPage />}
/>

<Route
  path="/products"
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
  sortBy={sortBy}
  setSortBy={setSortBy}
/>
  }
/>

          <Route
            path="/cart"
            element={
              <CartPage
  cart={cart}
  subtotal={subtotal}
  delivery={delivery}
  total={total}
                decreaseQty={decreaseQty}
                increaseQty={increaseQty}
                removeItem={removeItem}
                orderNote={orderNote}
setOrderNote={setOrderNote}

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
  setAuthMode={setAuthMode}
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
  reorderOrder={reorderOrder}
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

           <Route path="/legal-notice" element={<LegalNoticePage />} />
<Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
<Route path="/cookie-policy" element={<CookiePolicyPage />} />
<Route path="/terms" element={<TermsPage />} />
<Route path="/alcohol-policy" element={<AlcoholPolicyPage />} />
<Route path="/delivery" element={<DeliveryPage />} />
        </Routes>

       

        <footer style={styles.footer}>
  <div style={{ maxWidth: "1000px", margin: "0 auto", textAlign: "center" }}>
    
    <p style={{ fontWeight: "bold", marginBottom: "8px" }}>
      Santa Ponsa drinks delivery service for customers and businesses.
      Trade prices available – buy single items or full cases.
    </p>

    <p style={styles.footerText}>
      📞 +34 685572263 <br />
      📧 arthursofflicence@gmail.com <br />
      📍 Carrer Ramon de Montcada 23, 07180 Calvià (Santa Ponsa)
    </p>

    <p style={{ ...styles.footerText, marginTop: "10px" }}>
      Opening hours: Mon–Sat 10:00–20:00 | Sun 10:00–16:00
    </p>

    <div
  style={{
    display: "flex",
    justifyContent: "center",
    gap: "12px",
    flexWrap: "wrap",
    marginTop: "20px",
  }}
>
  <Link style={{ color: "#fff" }} to="/legal-notice">Legal Notice</Link>
  <Link style={{ color: "#fff" }} to="/privacy-policy">Privacy Policy</Link>
  <Link style={{ color: "#fff" }} to="/cookie-policy">Cookie Policy</Link>
  <Link style={{ color: "#fff" }} to="/terms">Terms & Conditions</Link>
  <Link style={{ color: "#fff" }} to="/alcohol-policy">Alcohol Policy</Link>
  <Link style={{ color: "#fff" }} to="/delivery">Delivery & Returns</Link>
</div>

    <p style={{ fontSize: "12px", marginTop: "12px", color: "#6b7280" }}>
      © 2026 Arthurs Off Licence. All rights reserved.
    </p>
  </div>
</footer>

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
  sortBy,
  setSortBy,
}) {
  const [editingProduct, setEditingProduct] = useState(null);

  const [editProduct, setEditProduct] = useState({
    name: "",
    category: "",
    description: "",
    retailPrice: "",
    barPrice: "",
    productGroup: "",
    variant: "",
  });

const [showSuggestions, setShowSuggestions] = useState(true);

const editableCategories = [
  "Beer",
  "Wine & Cava",
  "Spirits",
  "Liqueurs",
  "Soft Drinks",
  "Miniatures",
  "Ciders",
  "Alco-pop",
  "Plastic Litres",
  "Frozen Food",
  "Dried Food",
  "Sweets",
];

const [viewProduct, setViewProduct] = useState(null);
const [selectedVariant, setSelectedVariant] = useState(null);

const getProductKey = (product) => {
  if (product.productgroup && product.productgroup.trim() !== "") {
    return product.productgroup.trim().toLowerCase();
  }

  return product.name.trim().toLowerCase();
};

const groupedProducts = Object.values(
  filteredProducts.reduce((acc, product) => {
    const key = getProductKey(product);

    if (!acc[key]) {
      acc[key] = {
        ...product,
        variants: [],
      };
    }

    acc[key].variants.push(product);

    return acc;
  }, {})
);

const totalPages = Math.max(1, Math.ceil(groupedProducts.length / PRODUCTS_PER_PAGE));
const startIndex = (page - 1) * PRODUCTS_PER_PAGE;
const currentProducts = groupedProducts.slice(startIndex, startIndex + PRODUCTS_PER_PAGE);

const visiblePages = [];

if (totalPages <= 3) {
  for (let i = 1; i <= totalPages; i++) {
    visiblePages.push(i);
  }
} else {
  let start = Math.max(1, page - 1);

  if (start + 2 > totalPages) {
    start = totalPages - 2;
  }

  for (let i = start; i < start + 3; i++) {
    visiblePages.push(i);
  }
}

const getVariantPrice = (product) => {
  const price = isStaff || isBar
    ? product.barPrice || product.barprice || product.retailPrice || product.retailprice || 0
    : product.retailPrice || product.retailprice || 0;

  return Number(price || 0);
};

const getCheapestVariant = (product) => {
  const variants = product.variants && product.variants.length > 0
    ? product.variants
    : [product];

  return variants.reduce((cheapest, current) => {
    return getVariantPrice(current) < getVariantPrice(cheapest)
      ? current
      : cheapest;
  }, variants[0]);
};

const getDisplayPrice = (product) => {
  return getVariantPrice(getCheapestVariant(product));
};


  return (
    <section style={styles.card}>
      <h2 style={styles.sectionTitle}>Browse Products</h2>

      <div
  style={{
    background: "#DCFCE7",
    border: "1px solid #16A34A",
    color: "#166534",
    padding: "12px",
    borderRadius: "10px",
    marginBottom: "20px",
    textAlign: "center",
    fontWeight: "bold",
    fontSize: "13px",
  }}
>
  🚚 Same-day delivery before 12pm • Orders under €20 incur a €5 delivery charge
</div>

      <div style={styles.searchRow}>

<div style={{ position: "relative", flexGrow: 1 }}>
  <div style={{ display: "flex", gap: "8px" }}>
    <input
  style={styles.searchInput}
  placeholder="Search products"
  value={search}
  onChange={(e) => {
    setSearch(e.target.value);
    setShowSuggestions(true);
  }}
/>

   <button
  style={{
    ...styles.primaryBtn,
    height: "42px",
    minWidth: "90px",
  }}
  onClick={() => {
    setPage(1);
    setShowSuggestions(false);
  }}
>
  Search
</button>

  </div>

  {showSuggestions &&
  search.trim() &&
  searchSuggestions.length > 0 && (
    <div style={styles.suggestionBox}>
      {searchSuggestions.map((item) => (
        <button
          key={item.id}
          type="button"
          style={styles.suggestionItem}
          onClick={() => {
  setSearch(item.name);
  setPage(1);
  setShowSuggestions(false);
}}

        >
          <strong>{item.name}</strong>
          <span style={{ fontSize: "12px", color: "#6b7280" }}>
            {item.description || item.category}
          </span>
          <span style={{ fontWeight: "bold", color: "#F97316" }}>
            €{Number(getPrice(item)).toFixed(2)}
          </span>
        </button>
      ))}
    </div>
  )}
  </div>
</div>



  {/* DROPDOWN */}
    <div
  style={{
    display: "flex",
    gap: "10px",
    width: "100%",
  }}
>
  <select
    style={{
      width: "50%",
      height: "42px",
      borderRadius: "8px",
      border: "1px solid #d1d5db",
      padding: "10px",
    }}
    value={category}
    onChange={(e) => setCategory(e.target.value)}
  >
    {categories.map((c) => (
      <option key={c}>{c}</option>
    ))}
  </select>

  <select
    style={{
      width: "50%",
      height: "42px",
      borderRadius: "8px",
      border: "1px solid #d1d5db",
      padding: "10px",
    }}
    value={sortBy}
    onChange={(e) => setSortBy(e.target.value)}
  >
    <option value="default">Sort Products</option>
    <option value="priceLow">Price Low → High</option>
    <option value="priceHigh">Price High → Low</option>
  </select>
</div>

      <div style={styles.resultsInfo}>
  Showing {currentProducts.length} of {groupedProducts.length} products
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
        width: "340px",
        boxSizing: "border-box",
        maxWidth: "90%",
        boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
      }}
    >
      <h3 style={{ marginTop: 0, color: "#F97316" }}>
        Edit Product
      </h3>

      <p style={{ fontSize: "13px", marginBottom: "4px" }}>
        Product name
      </p>
      <input
        style={styles.input}
        value={editProduct.name}
        onChange={(e) =>
          setEditProduct({
            ...editProduct,
            name: e.target.value,
          })
        }
      />

      <p style={{ fontSize: "13px", marginBottom: "4px" }}>
  Categories
</p>

<div
  style={{
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "6px",
    marginBottom: "10px",
  }}
>
  {editableCategories.map((cat) => {
    const selectedCategories = String(editProduct.category || "")
  .split(",")
  .map((c) => {
    const v = c.trim().toLowerCase();

    if (["liquor", "liquors", "liqueurs"].includes(v))
      return "liqueurs";

    if (["spirit", "spirits"].includes(v))
      return "spirits";

    if (["miniature", "miniatures"].includes(v))
      return "miniatures";

    return v;
  })
  .filter((c) => c && c !== "Uncategorised")

    const checked = selectedCategories.includes(
  cat.toLowerCase()
);


    return (
      <label
        key={cat}
        style={{
          fontSize: "13px",
          display: "flex",
          gap: "6px",
          alignItems: "center",
          background: "#f9fafb",
          padding: "6px",
          borderRadius: "6px",
          border: "1px solid #e5e7eb",
        }}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => {
            let updated = [...selectedCategories];

            if (e.target.checked) {
              updated.push(cat);
            } else {
              updated = updated.filter(
                (item) => item.toLowerCase() !== cat.toLowerCase()
              );
            }

            setEditProduct({
              ...editProduct,
              category: [...new Set(updated)].join(", "),
            });
          }}
        />
        {cat}
      </label>
    );
  })}
</div>

      <p style={{ fontSize: "13px", marginBottom: "4px" }}>
        Description
      </p>
      <textarea
        style={{
          ...styles.input,
          minHeight: "70px",
          resize: "none",
        }}
        value={editProduct.description}
        onChange={(e) =>
          setEditProduct({
            ...editProduct,
            description: e.target.value,
          })
        }
      />

      <p style={{ fontSize: "13px", marginBottom: "4px" }}>
  Product Group
</p>
<input
  style={styles.input}
  value={editProduct.productGroup || ""}
  onChange={(e) =>
    setEditProduct({
      ...editProduct,
      productGroup: e.target.value,
    })
  }
/>

<p style={{ fontSize: "13px", marginBottom: "4px" }}>
  Variant / Size
</p>
<input
  style={styles.input}
  value={editProduct.variant || ""}
  onChange={(e) =>
    setEditProduct({
      ...editProduct,
      variant: e.target.value,
    })
  }
/>

      <p style={{ fontSize: "13px", marginBottom: "4px" }}>
        Retail price
      </p>
      <input
        style={styles.input}
        value={editProduct.retailPrice}
        onChange={(e) =>
          setEditProduct({
            ...editProduct,
            retailPrice: e.target.value,
          })
        }
      />

      <p style={{ fontSize: "13px", marginBottom: "4px" }}>
        Bar price
      </p>
      <input
        style={styles.input}
        value={editProduct.barPrice}
        onChange={(e) =>
          setEditProduct({
            ...editProduct,
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
  name: editProduct.name,
  category: editProduct.category,
  description: editProduct.description,
  retailPrice: Number(editProduct.retailPrice),
  barPrice: Number(editProduct.barPrice),
  productGroup: editProduct.productGroup,
  variant: editProduct.variant,
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
            setEditProduct({
  name: "",
  category: "",
  description: "",
  retailPrice: "",
  barPrice: "",
  productGroup: "",
  variant: "",
});
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}

{viewProduct && (
  <div
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,0,0,0.45)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
      padding: "15px",
    }}
  >
    <div
  style={{
    position: "relative",
    background: "#fff",
    borderRadius: "14px",
    padding: "20px",
    maxWidth: "420px",
    width: "100%",
    boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
  }}
>
      <button
        onClick={() => {
          setViewProduct(null);
          setSelectedVariant(null);
        }}
        style={{
  position: "absolute",
  top: "10px",
  right: "10px",
  width: "35px",
  height: "35px",
  borderRadius: "999px",
  border: "1px solid #d1d5db",
  background: "#ffffff",
  color: "#111827",
  fontSize: "22px",
  fontWeight: "bold",
  cursor: "pointer",
}}
      >
        ×
      </button>

      <h2 style={{ color: "#F97316", marginTop: 0 }}>
        {viewProduct.name}
      </h2>

      <img
        src={getProductImage(viewProduct)}
        onError={(e) => {
          e.target.src = "/products/placeholder.png";
        }}
        alt={viewProduct.name}
        style={{
          width: "100%",
          height: "220px",
          objectFit: "contain",
          marginBottom: "12px",
        }}
      />

     {viewProduct.description && (
  <p style={{ color: "#4b5563", fontSize: "12px", lineHeight: "1.4" }}>
    {viewProduct.description}
  </p>
)}


      {viewProduct.variants && viewProduct.variants.length > 1 && (
        <>
          <p style={{ fontWeight: "bold", marginBottom: "6px" }}>
            Choose option
          </p>

          <select
            style={{
              ...styles.input,
              marginBottom: "12px",
            }}
            value={selectedVariant?.id || ""}
            onChange={(e) => {
              const picked = viewProduct.variants.find(
                (v) => String(v.id) === String(e.target.value)
              );
              setSelectedVariant(picked);
            }}
          >
            {viewProduct.variants.map((variant) => (
  <option key={variant.id} value={variant.id}>
    {variant.variant || variant.name} - €
    {Number(
      isStaff || isBar
        ? variant.barPrice || variant.barprice || variant.retailPrice || variant.retailprice
        : variant.retailPrice || variant.retailprice
    ).toFixed(2)}
  </option>
))}
          </select>
        </>
      )}

      <h3 style={{ marginTop: "8px" }}>
        €
        {Number(
  isStaff || isBar
    ? selectedVariant?.barPrice ||
        selectedVariant?.barprice ||
        selectedVariant?.retailPrice ||
        selectedVariant?.retailprice ||
        viewProduct.barPrice ||
        viewProduct.barprice ||
        viewProduct.retailPrice ||
        viewProduct.retailprice
    : selectedVariant?.retailPrice ||
        selectedVariant?.retailprice ||
        viewProduct.retailPrice ||
        viewProduct.retailprice
).toFixed(2)}
      </h3>

      <button
        style={{
          ...styles.primaryBtn,
          width: "100%",
          marginTop: "10px",
        }}
        onClick={() => {
  const itemToAdd = selectedVariant || viewProduct;

  addToCart({
    ...itemToAdd,
    name:
      itemToAdd.variant && itemToAdd.variant.trim() !== ""
        ? `${viewProduct.name} - ${itemToAdd.variant}`
        : itemToAdd.name,
  });

  setViewProduct(null);
  setSelectedVariant(null);
}}
      >
        Add to Basket
      </button>
    </div>
  </div>
)}

      <div style={styles.productGrid}>
  {currentProducts.map((p) => (
    <div key={p.id} style={styles.productCard}>
  {/* IMAGE */}
 
 
  <div style={{ ...styles.productImageWrap, position: "relative" }}>
  <img
    src={getProductImage(p)}
    onError={(e) => {
      e.target.src = "/products/placeholder.png";
    }}
    alt={p.name}
    style={{
      ...styles.productImage,
      cursor: "pointer",
    }}
    onClick={() => {
      setViewProduct(p);
      setSelectedVariant(p.variants?.[0] || p);
    }}
  />

  <button
    type="button"
    onClick={() => {
      setViewProduct(p);
      setSelectedVariant(p.variants?.[0] || p);
    }}
  
      style={{
  position: "absolute",
  top: "10px",
  right: "10px",
  zIndex: 100,
  border: "none",
  background: "#ffffff",
  borderRadius: "999px",
  padding: "6px 8px",
  cursor: "pointer",
  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
}}
  >
    🔍
  </button>
</div>



  {/* TEXT */}
  <div>
    <p style={styles.categoryTag}>{p.category}</p>
    
    <h3 style={styles.productTitle}>{p.name}</h3>
    <p style={styles.desc}>{p.description || " "}</p>
  </div>

  {/* PRICE */}
  <div>
    <p style={styles.price}>
  €{Number(getDisplayPrice(p)).toFixed(2)}
</p>
    {isBar && <p style={styles.smallText}>Bar discount applied</p>}
  </div>

  {/* BUTTONS */}
<div style={{ marginTop: "10px" }}>
  <button
    style={{ ...styles.primaryBtn, width: "100%" }}
    onClick={() => {
      setViewProduct(p);
      setSelectedVariant(p.variants?.[0] || p);
    }}
  >
    View Options
  </button>

    {isStaff && (
      <div style={{ marginTop: "6px" }}>
        {p.variants && p.variants.length > 1 ? (
  <>
    {p.variants.map((variant) => (
      <button
        key={variant.id}
        style={{
          ...styles.secondaryBtn,
          width: "100%",
          marginBottom: "6px",
        }}
        onClick={() => {
          setEditingProduct(variant);

          setEditProduct({
            name: variant.name || "",
            category: variant.category || "",
            description: variant.description || "",
            retailPrice: Number(
              variant.retailPrice || variant.retailprice || 0
            ).toFixed(2),
            barPrice: Number(
              variant.barPrice || variant.barprice || 0
            ).toFixed(2),
            productGroup:
              variant.productGroup ||
              variant.productgroup ||
              "",
            variant: variant.variant || "",
          });
        }}
      >
        Edit {variant.variant || variant.name}
      </button>
    ))}
  </>
) : (
  <button
    style={{
      ...styles.secondaryBtn,
      width: "100%",
      marginBottom: "6px",
    }}
    onClick={() => {
      setEditingProduct(p);

      setEditProduct({
        name: p.name || "",
        category: p.category || "",
        description: p.description || "",
        retailPrice: Number(
          p.retailPrice || p.retailprice || 0
        ).toFixed(2),
        barPrice: Number(
          p.barPrice || p.barprice || 0
        ).toFixed(2),
        productGroup:
          p.productGroup || p.productgroup || "",
        variant: p.variant || "",
      });
    }}
  >
    Edit Product
  </button>
)}

        <button
          style={{ ...styles.removeBtn, width: "100%" }}
          onClick={() => {
            if (!window.confirm(`Delete ${p.name}?`)) return;

            fetch(`${API_BASE}/products/delete`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
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
      </div>
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
      
       <button
  style={{
    ...styles.primaryBtn,
    margin: "20px auto",
    display: "block",
  }}
  onClick={() =>
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })
  }
>
  ↑ Back to Top
</button>
</div>
    </section>
  );
}

function CartPage({ cart, subtotal, delivery, total, orderNote, setOrderNote, decreaseQty, increaseQty, removeItem }) {
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
  <p>
  <strong>Delivery:</strong>{" "}
  {delivery > 0 ? `€${Number(delivery).toFixed(2)}` : "Free"}
</p>

{delivery > 0 && (
  <p style={{ fontSize: "12px", color: "#6b7280", fontStyle: "italic" }}>
    €5 delivery charge applies to orders under €20.
  </p>
)}

  <p style={styles.total}>
    <strong>Total:</strong> €{Number(total).toFixed(2)}
  </p>

  <textarea
  placeholder="Special requests (e.g. leave at reception, call on arrival)"
  value={orderNote}
  onChange={(e) => setOrderNote(e.target.value)}
  style={{
    width: "100%",
    marginTop: "12px",
    padding: "10px",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    minHeight: "80px",
    fontSize: "14px",
    resize: "none",
  }}
/>

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
  setAuthMode,
}) {
  return (
    <section style={styles.card}>
      <h2 style={styles.sectionTitle}>Checkout</h2>

      {!currentUser && (
        <div style={styles.errorBox}>
  You must log in before checking out.

  <div style={{ marginTop: "8px" }}>
    Don’t have an account?{" "}
    <span
      style={{ color: "#F97316", cursor: "pointer", fontWeight: "bold" }}
      onClick={() => {
  setAuthMode("register");
  window.location.href = "/login";
}}
    >
      Register here
    </span>
  </div>
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
  reorderOrder,
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

<p>
  <strong>Status:</strong> {order.status || "Pending"}
</p>

{order.customerNote && (
  <p style={{ marginTop: "6px", fontStyle: "italic", color: "#374151" }}>
    📝 <strong>Customer note:</strong> {order.customerNote}
  </p>
)}

            <div
  style={{
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginTop: "12px",
    justifyContent: "center",   // ✅ centers buttons
  }}
>
  <button
    style={styles.secondaryBtn}
    onClick={() => {
      if (openOrders[order.id]) {
        setOpenOrders((prev) => ({ ...prev, [order.id]: false }));
      } else {
        loadItems(order.id);
        setOpenOrders((prev) => ({ ...prev, [order.id]: true }));
      }
    }}
  >
    {openOrders[order.id] ? "Hide Items" : "View Items"}
  </button>

  {!isStaff && (
    <button
      style={styles.primaryBtn}
      onClick={() => reorderOrder(order.id)}
    >
      Reorder
    </button>
  )}
</div>

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

      <div style={styles.formGridBox}>

        <div style={styles.formRow}>
          <input
            style={styles.inputClean}
            placeholder="Product name"
            value={newProduct.name}
            onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
          />
        </div>

        <div style={styles.formRow}>
          <select
  style={{
    ...styles.selectClean,
    color: newProduct.category ? "#111827" : "#6b7280",
  }}
  value={newProduct.category}
  onChange={(e) =>
    setNewProduct({ ...newProduct, category: e.target.value })
  }
>
  <option value="" disabled hidden>Select category</option>
<option value="Beer">Beer</option>
<option value="Wine & Cava">Wine & Cava</option>
<option value="Spirits">Spirits</option>
<option value="Liqueurs">Liqueurs</option>
<option value="Soft Drinks">Soft Drinks</option>
<option value="Miniatures">Miniatures</option>
<option value="Ciders">Ciders</option>
<option value="Alco-pop">Alco-pop</option>
<option value="Plastic Litres">Plastic Litres</option>
<option value="Frozen Food">Frozen Food</option>
<option value="Dried Food">Dried Food</option>
<option value="Sweets">Sweets</option>
</select>
        </div>

        <div style={styles.formRow}>
          <input
            style={styles.inputClean}
            placeholder="Retail price"
            value={newProduct.retailPrice}
            onChange={(e) => setNewProduct({ ...newProduct, retailPrice: e.target.value })}
          />
        </div>

        <div style={styles.formRow}>
          <input
            style={styles.inputClean}
            placeholder="Bar price"
            value={newProduct.barPrice}
            onChange={(e) => setNewProduct({ ...newProduct, barPrice: e.target.value })}
          />
        </div>

        <div style={styles.formRow}>
          <input
            style={styles.inputClean}
            placeholder="Description"
            value={newProduct.description}
            onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
          />
        </div>

        <div style={styles.formRow}>
  <input
    style={styles.inputClean}
    placeholder="Product group e.g. miniature-bundle - OPTIONAL IF NOT BUNDLE"
    value={newProduct.productGroup}
    onChange={(e) =>
      setNewProduct({ ...newProduct, productGroup: e.target.value })
    }
  />
</div>

<div style={styles.formRow}>
  <input
    style={styles.inputClean}
    placeholder="Variant / Size e.g. 10 Miniatures - OPTIONAL IF NOT BUNDLE"
    value={newProduct.variant}
    onChange={(e) =>
      setNewProduct({ ...newProduct, variant: e.target.value })
    }
  />
</div>

      </div>

      <button style={{ ...styles.primaryBtn, marginTop: "16px", width: "100%" }} onClick={addProduct}>
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

      <div style={styles.formGridBox}>
        <div style={styles.formRow}>
          <input
            style={styles.inputClean}
            placeholder="Full name"
            value={profileForm.fullName}
            onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
          />
        </div>

        <div style={styles.formRow}>
          <input
            style={styles.inputClean}
            placeholder="Email"
            value={profileForm.email}
            onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
          />
        </div>

        {isBar ? (
          <>
            <div style={styles.formRow}>
              <input
                style={styles.inputClean}
                placeholder="Company name"
                value={profileForm.companyName}
                onChange={(e) => setProfileForm({ ...profileForm, companyName: e.target.value })}
              />
            </div>

            <div style={styles.formRow}>
              <input
                style={styles.inputClean}
                placeholder="Business address"
                value={profileForm.address}
                onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
              />
            </div>

            <div style={styles.formRow}>
              <input
                style={styles.inputClean}
                placeholder="NIF"
                value={profileForm.nif}
                onChange={(e) => setProfileForm({ ...profileForm, nif: e.target.value })}
              />
            </div>
          </>
        ) : !isStaff ? (
          <>
            <div style={styles.formRow}>
              <input
                style={styles.inputClean}
                placeholder="Hotel room"
                value={profileForm.hotelRoom}
                onChange={(e) => setProfileForm({ ...profileForm, hotelRoom: e.target.value })}
              />
            </div>

            <div style={styles.formRow}>
              <input
                style={styles.inputClean}
                placeholder="Hotel address"
                value={profileForm.hotelAddress}
                onChange={(e) => setProfileForm({ ...profileForm, hotelAddress: e.target.value })}
              />
            </div>
          </>
        ) : null}
      </div>

      <button
        style={{ ...styles.primaryBtn, marginTop: "16px", width: "100%" }}
        onClick={saveProfile}
      >
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

          <div style={styles.formGridBox}>
  <div style={styles.formRow}>
    <select
      style={styles.selectClean}
      value={registerForm.role}
      onChange={(e) =>
        setRegisterForm({ ...registerForm, role: e.target.value })
      }
    >
      <option value="customer">Standard Customer</option>
      <option value="bar">Bar Customer</option>
    </select>
  </div>

  <div style={styles.formRow}>
    <input
      style={styles.inputClean}
      placeholder="Full name"
      value={registerForm.fullName}
      onChange={(e) =>
        setRegisterForm({ ...registerForm, fullName: e.target.value })
      }
    />
  </div>

  <div style={styles.formRow}>
    <input
      style={styles.inputClean}
      placeholder="Email"
      value={registerForm.email}
      onChange={(e) =>
        setRegisterForm({ ...registerForm, email: e.target.value })
      }
    />
  </div>

  <div style={styles.formRow}>
    <input
      style={styles.inputClean}
      type="password"
      placeholder="Password"
      value={registerForm.password}
      onChange={(e) =>
        setRegisterForm({ ...registerForm, password: e.target.value })
      }
    />
  </div>

  {registerForm.role === "bar" ? (
    <>
      <div style={styles.formRow}>
        <input
          style={styles.inputClean}
          placeholder="Company name"
          value={registerForm.companyName}
          onChange={(e) =>
            setRegisterForm({ ...registerForm, companyName: e.target.value })
          }
        />
      </div>

      <div style={styles.formRow}>
        <input
          style={styles.inputClean}
          placeholder="Business address"
          value={registerForm.address}
          onChange={(e) =>
            setRegisterForm({ ...registerForm, address: e.target.value })
          }
        />
      </div>

      <div style={styles.formRow}>
        <input
          style={styles.inputClean}
          placeholder="NIF number"
          value={registerForm.nif}
          onChange={(e) =>
            setRegisterForm({ ...registerForm, nif: e.target.value })
          }
        />
      </div>
    </>
  ) : (
    <>
      <div style={styles.formRow}>
        <input
          style={styles.inputClean}
          placeholder="Hotel room"
          value={registerForm.hotelRoom}
          onChange={(e) =>
            setRegisterForm({ ...registerForm, hotelRoom: e.target.value })
          }
        />
      </div>

      <div style={styles.formRow}>
        <input
          style={styles.inputClean}
          placeholder="Hotel address"
          value={registerForm.hotelAddress}
          onChange={(e) =>
            setRegisterForm({ ...registerForm, hotelAddress: e.target.value })
          }
        />
      </div>
    </>
    
  )}

  <div
  style={{
    marginTop: "10px",
    padding: "12px",
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    fontSize: "13px",
    color: "#374151",
  }}
>
  {registerForm.role === "bar"
    ? "Please enter your company name, delivery address and NIF number to register and validate access to bar customer pricing."
    : "Please enter a hotel room number and hotel address so deliveries can be correctly located."}
</div>
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

  
</>

      )}
    </section>
  );
}


function LandingPage() {
  const navigate = useNavigate();

  return (
    <section
      style={{
        borderRadius: "24px",
        overflow: "hidden",
        position: "relative",
        minHeight: "500px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        color: "#fff",
        backgroundImage:
          "linear-gradient(rgba(0,0,0,.55), rgba(0,0,0,.55)), url('/hero.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        padding: "40px 15px",
      }}
    >
      <div>
        <h1
          style={{
            fontSize: "clamp(32px, 8vw, 56px)",
lineHeight: "1.1",
padding: "0 10px",
            fontWeight: "800",
            marginBottom: "15px",
          }}
        >
          Arthur's Off Licence
        </h1>

        <p
          style={{
            fontSize: "clamp(16px, 4vw, 22px)",
padding: "0 10px",
            maxWidth: "700px",
            margin: "0 auto 25px",
          }}
        >
          Premium beers, wines, spirits and snacks delivered across Mallorca.
        </p>

        <div
          style={{
            display: "flex",
            gap: "12px",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            style={styles.primaryBtn}
            onClick={() => navigate("/products")}
          >
            Shop Now
          </button>

          <button
            style={styles.secondaryBtn}
            onClick={() => navigate("/login")}
          >
            Login / Register
          </button>
        </div>

        <div
  style={{
    display: "flex",
    justifyContent: "center",
    gap: "8px",
    flexWrap: "wrap",
    marginTop: "25px",
    fontSize: "12px",
    fontWeight: "600",
  }}
>
  <div
    style={{
      background: "rgba(255,255,255,.15)",
      padding: "8px 10px",
      borderRadius: "999px",
    }}
  >
    🔒 Secure Payments
  </div>

  <div
    style={{
      background: "rgba(255,255,255,.15)",
      padding: "8px 10px",
      borderRadius: "999px",
    }}
  >
    🚚 Fast Delivery
  </div>

  <div
    style={{
      background: "rgba(255,255,255,.15)",
      padding: "8px 10px",
      borderRadius: "999px",
    }}
  >
    🍺 Beer • Wine • Spirits
  </div>

  <div
    style={{
      background: "rgba(255,255,255,.15)",
      padding: "8px 10px",
      borderRadius: "999px",
    }}
  >
    ⭐ Trusted Retailer
  </div>
</div>
      </div>
    </section>
  );
}

function getProductImage(product) {
  if (product.image) return product.image;

  const cleanName = String(product.name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .trim()
    .replace(/\s+/g, "-");

  return `/products/${cleanName}.jpg`;
}


const styles = {
  page: {
  background: "#DDE1E6",
    minHeight: "100vh",
    padding: "24px",
    fontFamily: "Arial, sans-serif",
    color: "#1f2937",
  },

  container: {
  maxWidth: "1500px",
  margin: "0 auto",
},

header: {
  background: "#ffffff",
  borderRadius: "16px",
  padding: "20px",
  marginBottom: "20px",
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "center",
  alignItems: "center",
  gap: "20px",
  borderTop: "6px solid #16A34A",
  boxShadow: "0 6px 16px rgba(0,0,0,0.05)",
},

 brandWrap: {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textAlign: "center",
  width: "100%",
},

nav: {
  background: "#ffffff",
  borderRadius: "12px",
  padding: "8px 12px",
  marginBottom: "20px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  border: "1px solid #e5e7eb",
},

 navLinks: {
  display: "flex",
  gap: "6px",
  alignItems: "center",
},

  navLink: {
  color: "#ffffff",
  textDecoration: "none",
  fontWeight: "600",
  fontSize: "12px",
  padding: "5px 8px",
  borderRadius: "6px",
  background: "#16A34A",
  display: "inline-block",
  whiteSpace: "nowrap",
},

  navActions: {
  marginLeft: "auto",
  display: "flex",
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
    whiteSpace: "nowrap",
  },

primaryNavBtn: {
  background: "#F97316",
  color: "#ffffff",
  borderRadius: "6px",
  padding: "5px 8px",
  fontWeight: "600",
  fontSize: "12px",
  textDecoration: "none",
  display: "inline-block",
  whiteSpace: "nowrap",
},

 logo: {
  width: "100%",
  maxWidth: "240px",
  height: "auto",
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
  textAlign: "center",
  width: "100%",
  maxWidth: "300px",
  margin: "0 auto",
},

  card: {
    background: "#ffffff",
    borderRadius: "14px",
    padding: "18px",
    marginBottom: "20px",
    border: "1px solid #e5e7eb",
  },

  input: {
  width: "100%",
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  fontSize: "14px",
  background: "#ffffff",
  color: "#111827",
  outline: "none",
  boxSizing: "border-box",   // ✅ fixes width mismatch
  display: "block",
},


  primaryBtn: {
    background: "#F97316",
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
  padding: "10px 16px",
  whiteSpace: "nowrap",
    cursor: "pointer",
    fontWeight: "bold",
  },

 
  productGrid: {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "70px 14px",
  paddingTop: "40px",
},

productCard: {
  position: "relative",
  border: "none",
  borderRadius: "20px",
  padding: "75px 16px 16px",
  textAlign: "center",
  background: "#ffffff",
  overflow: "visible",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  minHeight: "360px",
  boxShadow: "0 10px 25px rgba(0,0,0,.08)",
},


categoryTag: {
  color: "#16A34A",
  fontSize: "14px",
  fontWeight: "bold",
  marginBottom: "6px",
},

price: {
  fontWeight: "700",
  fontSize: "16px",
  color: "#F97316",
  marginTop: "8px",
  marginBottom: "6px",
},

  smallText: {
    fontSize: "11px",
    color: "#6b7280",
  },

  

  paginationBtn: {
  padding: "8px 14px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  background: "#ffffff",
  color: "#111827",   // ✅ ADD THIS
  cursor: "pointer",
  fontWeight: "bold",
},

  pageNumber: {
  width: "36px",
  height: "36px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  background: "#ffffff",
  color: "#111827",   // ✅ ADD THIS
  cursor: "pointer",
  fontWeight: "bold",
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
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "12px",
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

formGridBox: {
  maxWidth: "420px",
  width: "100%",
  margin: "0 auto",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
},

formRow: {
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: "10px",
  padding: "10px",
  boxSizing: "border-box",
  width: "100%",
},

inputClean: {
  width: "100%",
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  fontSize: "14px",
  background: "#ffffff",
  color: "#111827",
  outline: "none",
  boxSizing: "border-box",
  display: "block",
},

selectClean: {
  width: "100%",
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  fontSize: "14px",
  background: "#ffffff",
  color: "#111827",
  outline: "none",
  boxSizing: "border-box",
  display: "block",
},

footer: {
  marginTop: "30px",
  background: "#111827",
  color: "#ffffff",
  padding: "30px 20px",
  borderRadius: "12px",
},

footerText: {
  fontSize: "14px",
  color: "#e5e7eb",
},

suggestionBox: {
  position: "absolute",
  top: "48px",
  left: 0,
  right: 0,
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "10px",
  boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
  zIndex: 1000,
  overflow: "hidden",
  maxHeight: "220px",
  overflowY: "auto",
},


suggestionItem: {
  width: "100%",
  padding: "10px 12px",
  border: "none",
  borderBottom: "1px solid #f3f4f6",
  background: "#ffffff",
  cursor: "pointer",
  textAlign: "left",
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: "4px 12px",
  color: "#111827",
},

productImageWrap: {
  position: "absolute",
  top: "-55px",
  left: "50%",
  transform: "translateX(-50%)",
  width: "150px",
  height: "150px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
},

productImage: {
  maxHeight: "145px",
  maxWidth: "100%",
  objectFit: "contain",
},

orderCard: {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "20px",
  marginBottom: "20px",
  textAlign: "center",
  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
},

desc: {
  minHeight: "54px",
  textAlign: "center",
  fontSize: "12px",
  color: "#6b7280",
  lineHeight: "1.35",
  padding: "0 12px",
},


productTitle: {
  minHeight: "56px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  fontSize: "17px",
  fontWeight: "700",
  color: "#111827",
  lineHeight: "1.25",
  margin: "8px 0",
  padding: "0 4px",
},

paginationWrap: {
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "center",
  alignItems: "center",
  gap: "10px",
  marginTop: "20px",
},

categoryTag: {
  display: "inline-block",
  background: "#DCFCE7",
  color: "#15803d",
  padding: "4px 10px",
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: "700",
  marginBottom: "8px",
},



};

