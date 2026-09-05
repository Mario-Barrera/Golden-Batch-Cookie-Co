const express = require("express");
const Stripe = require("stripe");

const db = require("../db/client");

const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Send the Stripe publishable key to the frontend.
router.get("/config", function (req, res) {
  res.json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  });
});

// Create a Stripe PaymentIntent for the customer's order.
router.post("/create-payment-intent", requireAuth, async function (req, res) {
  try {
    const items = req.body.items;

    // Make sure the customer sent an order.
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "Your order is empty.",
      });
    }

    // Validate the product IDs and quantities sent from the frontend.
    for (const item of items) {
      const productId = Number(item.product_id);
      const quantity = Number(item.quantity);

      if (
        !Number.isInteger(productId) ||
        productId <= 0 ||
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {
        return res.status(400).json({
          message: "Invalid order item.",
        });
      }
    }

    // Get all product IDs from the customer's order.
    const productIds = items.map(function (item) {
      return Number(item.product_id);
    });

    // Get the real product prices from the database.
    // ANY($1::int[]) means: Match product_id against any value inside the integer array passed in as parameter $1.
    const result = await db.query(
      `
          SELECT product_id, name, price
          FROM products
          WHERE product_id = ANY($1::int[])
        `,
      [productIds],
    );

    // Make sure every requested product exists in the database.
    if (result.rows.length !== new Set(productIds).size) {
      return res.status(400).json({
        message: "One or more products could not be found.",
      });
    }

    // Create a quick lookup table for the database products.
    const productsById = new Map();

    result.rows.forEach(function (product) {
      productsById.set(product.product_id, product);
    });

    // Calculate the real order total using database prices.
    // 0 is the starting value of the running total.
    let amountInCents = 0;

    items.forEach(function (item) {
      const productId = Number(item.product_id);
      const quantity = Number(item.quantity);

      const product = productsById.get(productId);

      // Convert the product price from dollars to cents.
      // Stripe requires payment amounts as whole numbers in the smallest currency unit, so U.S. dollar amounts must be converted to cents.
      const priceInCents = Math.round(Number(product.price) * 100);

      amountInCents += priceInCents * quantity;
    });

    // Create the payment with Stripe.
    // usd means: U.S. dollars
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: "usd",

      automatic_payment_methods: {
        enabled: true,
      },

      metadata: {
        user_id: String(req.user.user_id),
      },
    });

    // Send the client secret back to payment.js.
    res.status(201).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: amountInCents,
    });
  } catch (err) {
    console.error("Error creating Stripe PaymentIntent:", err);

    res.status(500).json({
      message: "Unable to start payment.",
    });
  }
});

// Verify the completed Stripe payment and create the order in PostgreSQL.
router.post("/verify-payment", requireAuth, async function (req, res) {
  let client;

  try {
    const userId = req.user.user_id;
    const { paymentIntentId, items } = req.body;

    // Make sure a PaymentIntent ID was provided.
    if (typeof paymentIntentId !== "string" || !paymentIntentId.trim()) {
      return res.status(400).json({
        message: "PaymentIntent ID is required.",
      });
    }

    // Make sure the customer sent order items.
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "Your order is empty.",
      });
    }

    // Retrieve the PaymentIntent directly from Stripe.
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Make sure Stripe confirms the payment succeeded.
    if (paymentIntent.status !== "succeeded") {
      return res.status(400).json({
        message: "Payment has not been completed.",
      });
    }

    // Make sure the Stripe payment belongs to
    // the currently logged-in customer.
    if (paymentIntent.metadata.user_id !== String(userId)) {
      return res.status(403).json({
        message: "This payment does not belong to this customer.",
      });
    }

    // Validate the product IDs and quantities.
    for (const item of items) {
      const productId = Number(item.product_id);
      const quantity = Number(item.quantity);

      if (
        !Number.isInteger(productId) ||
        productId <= 0 ||
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {
        return res.status(400).json({
          message: "Invalid order item.",
        });
      }
    }

    const productIds = items.map(function (item) {
      return Number(item.product_id);
    });

    // Get a dedicated PostgreSQL connection so all
    // order records can be saved in one transaction.
    client = await db.connect();

    await client.query("BEGIN");

    // Prevent the same Stripe payment from creating another order if this route is called twice.
    const existingPaymentResult = await client.query(
      `
        SELECT payment_id, order_id
        FROM payments
        WHERE transaction_id = $1
        LIMIT 1
      `,
      [paymentIntent.id],
    );

    if (existingPaymentResult.rows.length > 0) {
      await client.query("ROLLBACK");

      return res.status(200).json({
        message: "Order has already been created.",
        orderId: existingPaymentResult.rows[0].order_id,
      });
    }

    // Get the real product prices from PostgreSQL.
    const productResult = await client.query(
      `
        SELECT product_id, name, price
        FROM products
        WHERE product_id = ANY($1::int[])
      `,
      [productIds],
    );

    // Make sure every requested product exists.
    if (productResult.rows.length !== new Set(productIds).size) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message: "One or more products could not be found.",
      });
    }

    // Build a lookup table for the products.
    const productsById = new Map();

    productResult.rows.forEach(function (product) {
      productsById.set(product.product_id, product);
    });

    // Calculate the order total using PostgreSQL prices.
    let amountInCents = 0;

    items.forEach(function (item) {
      const productId = Number(item.product_id);
      const quantity = Number(item.quantity);

      const product = productsById.get(productId);

      const priceInCents = Math.round(Number(product.price) * 100);

      amountInCents += priceInCents * quantity;
    });

    // Make sure the amount paid to Stripe matches
    // the real PostgreSQL order total.
    if (amountInCents !== paymentIntent.amount) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message: "Payment amount does not match the order total.",
      });
    }

    const totalAmount = (amountInCents / 100).toFixed(2);

    // Create the main order.
    // CURRENT_TIMESTAMP is temporary until
    // customer pickup scheduling is added.
    const orderResult = await client.query(
      `
        INSERT INTO orders (
          user_id,
          status,
          total_amount,
          pickup_time
        )
        VALUES (
          $1,
          $2,
          $3,
          CURRENT_TIMESTAMP
        )
        RETURNING
          order_id,
          user_id,
          status,
          total_amount,
          pickup_time,
          created_at
      `,
      [userId, "Pending", totalAmount],
    );

    const order = orderResult.rows[0];

    // Save every product belonging to the order.
    for (const item of items) {
      const productId = Number(item.product_id);
      const quantity = Number(item.quantity);

      const product = productsById.get(productId);

      await client.query(
        `
          INSERT INTO order_items (
            order_id,
            product_id,
            quantity,
            price_at_purchase
          )
          VALUES ($1, $2, $3, $4)
        `,
        [order.order_id, productId, quantity, product.price],
      );
    }

    // Record the successful Stripe payment.
    await client.query(
      `
        INSERT INTO payments (
          order_id,
          transaction_id,
          amount,
          status,
          method
        )
        VALUES ($1, $2, $3, $4, $5)
      `,
      [order.order_id, paymentIntent.id, totalAmount, "Completed", "Stripe"],
    );

    // Save all three parts of the order together.
    await client.query("COMMIT");

    return res.status(201).json({
      message: "Payment verified and order created successfully.",
      order: order,
    });

  } catch (err) {
    if (client) {
      await client.query("ROLLBACK");
    }

    console.error("Error verifying payment and creating order:", err);

    return res.status(500).json({
      message: "Unable to complete your order.",
    });

  } finally {
    if (client) {
      client.release();
    }
  }
});

module.exports = router;
