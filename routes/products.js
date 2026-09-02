const express = require("express");
const db = require("../db/client");

const router = express.Router();

// GET /api/products
// Returns all products for the order page.
router.get("/", async function (req, res, next) {
  try {
    const { rows } = await db.query(`
      SELECT
        product_id,
        name,
        price,
        image_key,
        star_rating
      FROM products
      ORDER BY product_id ASC;
    `);

    return res.json({
      products: rows,
    });

  } catch (err) {
    return next(err);
  }
});


module.exports = router;