// ---------------- Fetch user's order history --------------- 
async function fetchOrderHistory() {
  const container = document.getElementById("profile-orderHistory");

  if (!container) {
    return;
  }

  try {
    const token = localStorage.getItem("token");

    if (!token) {
        throw new Error("User not authenticated.");
    }

    const response = await fetch("/api/orders/my-orders", {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error("Failed to fetch order history.");
    }

    const data = await response.json();

    renderOrderHistory(data.orders || []);

  } catch (err) {
    console.error("Order history error:", err);
    container.innerHTML = "<p>Unable to load order history.</p>"
  }
}

// --------------- Render order history ----------------

function renderOrderHistory(orders) {
    const container = document.getElementById("profile-orderHistory");

    if (!container) {
        return;
    }

    if (!orders.length) {
        container.innerHTML = "<p>No orders found.</p>";
        return;
    }

    container.innerHTML = "";

    orders.forEach(function (order) {
        const orderCard = document.createElement("div");
        orderCard.className = "order-card";

        const createdAt = order.created_at
            ? new Date(order.created_at)
            : null;

        const formattedDate =
         createdAt && !Number.isNaN(createdAt.getTime())
            ? createdAt.toLocaleDateString()
            : "Unknown Date";

        const itemsHTML = order.items.map(function (item) {
            return `
                <li>${item.product_name}, Qty: ${item.quantity} - $${Number(item.price_at_purchase).toFixed(2)}
                </li>
            `;
        }).join("");

        orderCard.innerHTML = `
            <h3>Order #${order.order_id}</h3>
            <p><strong>Date:</strong> ${formattedDate}</p>
            <p><strong>Status:</strong> ${order.status}</p>
            <p><strong>Total:</strong> $${Number(order.total_amount).toFixed(2)}</p>

            <ul class="order-items">
                ${itemsHTML}
            </ul>
        `;

        container.appendChild(orderCard);
    });
}

document.addEventListener("DOMContentLoaded", function () {
    fetchOrderHistory();
});