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
        [productIds]
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
        const priceInCents = Math.round(
          Number(product.price) * 100
        );

        amountInCents += priceInCents * quantity;
      });

      // Create the payment with Stripe.
      // usd means: U.S. dollars
      const paymentIntent =
        await stripe.paymentIntents.create({
          amount: amountInCents,
          currency: "usd",

          automatic_payment_methods: {
            enabled: true,
          },
        });

      // Send the client secret back to payment.js.
      res.status(201).json({
        clientSecret: paymentIntent.client_secret,
        amount: amountInCents,
      });

    } catch (err) {
      console.error(
        "Error creating Stripe PaymentIntent:",
        err
      );

      res.status(500).json({
        message: "Unable to start payment.",
      });
    }
  }
);

module.exports = router;