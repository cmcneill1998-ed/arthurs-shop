import { useEffect } from "react";

export default function Orders() {
  // ✅ get data from localStorage (your cart)
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  // ✅ get user details (adjust if your keys differ)
  const customerName = localStorage.getItem("customerName") || "Customer";
  const email = localStorage.getItem("email") || "";

  useEffect(() => {
    // ✅ send order to backend
    fetch("https://your-backend-url.onrender.com/order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customerName,
        email,
        items: cart,
        total,
      }),
    });

    // ✅ clear cart AFTER order
    localStorage.removeItem("cart");
  }, []);

  return (
    <div style={{ padding: "30px", maxWidth: "600px", margin: "auto" }}>
      <h1>✅ Payment Successful</h1>

      <p>
        Thanks for your order, <strong>{customerName}</strong>.
      </p>

      <p>
        You will receive an <strong>email confirmation shortly</strong>.
      </p>

      <hr />

      <h2>Order Summary</h2>

      <ul>
        {cart.map((item, index) => (
          <li key={index}>
            {item.name} x{item.qty} — €{(item.price * item.qty).toFixed(2)}
          </li>
        ))}
      </ul>

      <h3>Total: €{total.toFixed(2)}</h3>

      <hr />

      <h2>Delivery Information</h2>

      <p>
        Orders placed <strong>after 12:00 PM</strong> will be delivered the next working day.
      </p>

      <p>
        Orders placed over the <strong>weekend</strong> will be delivered on <strong>Monday</strong>.
      </p>

      <p>
        If you have any questions, please contact Arthurs.
      </p>
    </div>
  );
}