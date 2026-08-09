const express = require("express");
const db = require("../db/client");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// Group multiple order-item rows into one order object
function groupOrders(rows) {
    // store orders by their order_id
  const orders = new Map();

  for (const row of rows) {
    // Create the order if this order_id has not been added yet
    if (!orders.has(row.order_id)) {
        // Add the new order to the Map
      orders.set(row.order_id, {
        order_id: row.order_id,
        status: row.status,
        total_amount: row.total_amount,
        pickup_time: row.pickup_time,
        created_at: row.created_at,
        // creates an empty array for one specific order.
        items: [],
      });
    }

    // Add each order item to the correct order
    if (row.order_item_id !== null) {
      orders.get(row.order_id).items.push({
        order_item_id: row.order_item_id,
        product_id: row.product_id,
        product_name: row.product_name,
        quantity: row.quantity,
        price_at_purchase: row.price_at_purchase,
      });
    }
  }

  // Convert the Map values into a normal JavaScript array
  return Array.from(orders.values());
}

// GET /api/orders/my-orders
router.get("/my-orders", requireAuth, async function (req, res, next) {
  try {
    const userId = req.user.user_id;

    // Table aliases used in the query:
    // o  = orders
    // oi = order_items
    // p  = products
    const { rows } = await db.query(
      `
        SELECT
          o.order_id,
          o.status,
          o.total_amount,
          o.pickup_time,
          o.created_at,
          oi.order_item_id,
          oi.product_id,
          oi.quantity,
          oi.price_at_purchase,
          p.name AS product_name
        FROM orders o
        LEFT JOIN order_items oi
          ON o.order_id = oi.order_id
        LEFT JOIN products p
          ON oi.product_id = p.product_id
        WHERE o.user_id = $1
        ORDER BY o.created_at DESC, o.order_id DESC, oi.order_item_id ASC;
      `,
      [userId],
    );

    return res.json({
      orders: groupOrders(rows),
    });

  } catch (err) {
    return next(err);
  }
});

// PATCH /api/orders/:id/cancel
router.patch("/:id/cancel", requireAuth, async function (req, res, next) {
  try {
    const orderId = Number(req.params.id);
    const userId = req.user.user_id;

    // Validate the order ID
    if (!Number.isInteger(orderId) || orderId <= 0) {
      const err = new Error("Invalid order ID");
      err.status = 400;
      throw err;
    }

    // Find the order and confirm it belongs to the logged-in user
    const { rows } = await db.query(
      `
        SELECT order_id, user_id, status
        FROM orders
        WHERE order_id = $1
          AND user_id = $2;
      `,
      [orderId, userId],
    );

    // Order does not exist or does not belong to this user
    if (rows.length === 0) {
      const err = new Error("Order not found");
      err.status = 404;
      throw err;
    }

    const order = rows[0];

    // Only Pending orders can be cancelled by the customer
    if (order.status !== "Pending") {
      const err = new Error("Only pending orders can be cancelled");
      err.status = 400;
      throw err;
    }

    // Cancel the order
    const result = await db.query(
      `
        UPDATE orders
        SET status = 'Cancelled'
        WHERE order_id = $1
          AND user_id = $2
        RETURNING
          order_id,
          status,
          total_amount,
          pickup_time,
          created_at;
      `,
      [orderId, userId],
    );

    return res.json({
      message: "Order cancelled successfully",
      order: result.rows[0],
    });
    
  } catch (err) {
    return next(err);
  }
});

module.exports = router;