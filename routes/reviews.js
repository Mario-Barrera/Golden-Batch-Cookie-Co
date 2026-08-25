const express = require('express');
const db = require('../db/client');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// -------------------- HELPER --------------------

// creates a standardized 400 error
function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

// creates a 404 Not Found error.
function notFound(message = 'Review not found') {                   
  const error = new Error(message);
  error.status = 404;
  return error;
}

// creates a 403 Forbidden error.
function forbidden(message = 'Forbidden') {
  const error = new Error(message);
  error.status = 403;
  return error;
}

// Validate that the rating is a whole number between 1 and 5.
function isValidRating(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 5;
}

// Check that the review is a nonempty string between 1 and 1000 characters.
function isValidReview(value) {
  if (typeof value !== "string") return false;
  const trimmedReview = value.trim();
  return trimmedReview.length > 0 && trimmedReview.length <= 1000;
}

// -------------------- ROUTES --------------------

// GET /api/reviews - all reviews on Customer Reviews Page
router.get('/', async function listReviews(req, res, next) {
  try {
    // Get product_id from request query
    const { product_id } = req.query;                         

    // Stores values for SQL query parameters
    const params = [];           
    // Stores optional review filter conditions.                             
    const where = [];                                         

    if (product_id !== undefined) {
      const productid = Number(product_id);
      if (!Number.isInteger(productid) || productid <= 0) {
        throw badRequest("Invalid product_id");
      }
      params.push(productid);
      where.push(`r.product_id = $${params.length}`);
    }

    // builds the SQL query string that your Node/Express route will send to PostgreSQL
    const sql = 
    `
      SELECT
        r.review_id,                              -- r is an alias for reviews table
        r.user_id,
        u.name AS user_name,                      -- u is an alias for users table, AS creates a column alias, which makes the returned object is clear and easier to read
        r.product_id,
        p.name AS product_name,                   -- products table, AS creates a column alias, which makes the returned object is clear and easier to read
        r.rating,
        r.review,
        r.created_at
      FROM reviews r
      JOIN users u ON u.user_id = r.user_id                   -- Join users table to reviews using matching user_id
      JOIN products p ON p.product_id = r.product_id            -- 'p.product_id = r.product_id' is how to match rows between the two tables.
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}             -- is JavaScript inside your SQL template string, It decides whether a WHERE clause needs to be added
      ORDER BY r.created_at DESC;
    `;

    const { rows } = await db.query(sql, params);                       // executes the SQL query and extracts the returned rows from the database result
    return res.json({ items: rows });

  } catch (err) {
    return next(err);
  }
});

// GET /api/reviews/me - fetch reviews and comments for individual users logged-in
router.get("/me", requireAuth, async function (req, res, next) {
  try {
    const userId = req.user.user_id;

    const { rows } = await db.query(
    `
      SELECT
        r.review_id,
        r.user_id,
        u.name AS user_name,
        r.product_id,
        p.name AS product_name,
        r.rating,
        r.review,
        r.created_at
      FROM reviews r
      JOIN users u ON u.user_id = r.user_id
      JOIN products p ON p.product_id = r.product_id
      WHERE r.user_id = $1
      ORDER BY r.created_at DESC
    `,
    [userId]
    );

    return res.json({ items: rows });

  } catch (err) {
    return next(err);
  }
});

// POST /api/reviews
// authenticates the user, validates the submitted data, inserts the review, and handles duplicate-review errors.
router.post('/', requireAuth, async function createReview(req, res, next) {
  try {
    const userId = req.user.user_id;
    const {
      product_id,
      rating,
      review
    } = req.body;

    const productid = Number(product_id);
    if (!Number.isInteger(productid) || productid <= 0) {
      throw badRequest("Product ID is required");
    }

    if (!isValidRating(rating)) {
      throw badRequest("Rating must be an integer 1 to 5");
    }

    if (!isValidReview(review)) {
      throw badRequest("Review is required (1 - 1000 characters)");
    }

    // Insert a new row into the reviews table.
    const sql = `
      INSERT INTO reviews (user_id, product_id, rating, review)
      VALUES ($1, $2, $3, $4)
      RETURNING review_id, user_id, product_id, rating, review, created_at; 
    `;

    // creates an array that holds the values that will be inserted into the SQL placeholders
    const params = [userId, productid, Number(rating), review.trim()];                      

    try {
      const { rows } = await db.query(sql, params);                                         
      return res.status(201).json({ review: rows[0] });

      // 23505 is Unique constraint violation
      // specifically for database errors from the INSERT query
    } catch (dbError) {
      if (dbError.code === '23505') {                                                         
        throw badRequest("You already reviewed this product");
      }
      throw dbError;
    }

    // handles any error from the whole route and forwards it to your centralized Express error handler.
  } catch (err) {
    return next(err);
  }
});

// PATCH /api/reviews/:id - (Owner only or Admin)
router.patch('/:id', requireAuth, async function updateReview(req, res, next) {
  try { 
    // Convert the review ID from the URL parameter into a number.
    const id = Number(req.params.id);

    // ensures the review ID is a positive whole number
    if (!Number.isInteger(id) || id <= 0) {
      throw badRequest("Invalid review id");
    }

    // Rename the returned rows property to foundRows during destructuring.
    const { rows: foundRows } = await db.query(
      `SELECT review_id, user_id
      FROM reviews
      WHERE review_id = $1`,
      [id]
    );

    // Get the first review returned by the query.
    const existing = foundRows[0];

    // Throw a 404 error if the review was not found.
    if (!existing) {
      throw notFound();
    }

    // Check whether the logged-in user created this review.
    const isOwner = existing.user_id === req.user.user_id;  
    
    // Check whether the logged-in user is an admin.
    const isAdmin = req.user.role === 'admin';
    
    // Deny access if the logged-in user is neither the review owner nor an admin.
    if (!isOwner && !isAdmin) {
      throw forbidden();
    }

    // Get the rating and review fields from the request body.
    const { rating, review } = req.body;

    // Store the SQL SET clauses for fields being updated.
    // set stores the SQL instructions that point to those values
    const set = [];

    // Store the SQL parameter values for the update query.
    // params stores the actual values,
    const params = [];

    // If a rating was provided, validate it.
    if (rating !== undefined) {
      // If the rating is not a whole number between 1 and 5, throw an error.
      if (!isValidRating(rating)) {
        throw badRequest("Rating must be an integer 1 to 5");
      }
      // Add the rating value and its SQL SET clause to the update query.
      params.push(Number(rating));

      // dynamically building part of your SQL SET clause
      set.push(`rating = $${params.length}`);
    }

    if (review !== undefined) {
      if (!isValidReview(review)) {
        throw badRequest("Review must be 1 - 1000 characters");
      }
      params.push(review.trim());
      set.push(`review = $${params.length}`);
    }

    // Reject the request if no valid fields were provided to update.
    if (set.length === 0) {
      throw badRequest("No valid fields to update");
    }

    // Add the review ID as the final SQL parameter for the WHERE clause.
    params.push(id);                                                      

    // Build the SQL UPDATE query using the SET clauses and parameter placeholders.
    const sql = `
      UPDATE reviews
      SET ${set.join(", ")}
      WHERE review_id = $${params.length}
      RETURNING review_id, user_id, product_id, rating, review, created_at;
    `;

    // Execute the UPDATE query and extract the returned rows.
    const { rows } = await db.query(sql, params);

    // Return the updated review to the client.
    return res.json({ review: rows[0] });

  } catch (err) {
    return next(err);
  }
});

// GET /api/reviews/:reviewId
// Returns one review along with the name of the user who wrote it
router.get("/:reviewId", async function getReviewById(req, res, next) {
  try {
    const reviewId = Number(req.params.reviewId);

     // Confirm that reviewId is a valid positive integer.
    if (!Number.isInteger(reviewId) || reviewId <= 0) {
      throw badRequest("Invalid review ID.");
    }

    const { rows } = await db.query(
      `
        SELECT
          r.review_id,
          r.user_id,
          u.name AS user_name,
          r.product_id,
          r.rating,
          r.review,
          r.created_at
        FROM reviews AS r
        JOIN users AS u
          ON r.user_id = u.user_id
        WHERE r.review_id = $1;
      `,
      [reviewId],
    );

    // Throw a 404 error if the review was not found.
    if (rows.length === 0) {
      throw notFound();
    }

    return res.json(rows[0]);

  } catch (err) {
    return next(err);
  }
});

// DELETE /api/reviews/:id - (Owner only or Admin)
router.delete('/:id', requireAuth, async function deleteReview(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw badRequest("Invalid review id");
    }

    const { rows: foundRows } = await db.query(
      `SELECT review_id, user_id
      FROM reviews
      WHERE review_id = $1`,
      [id]
    );

    const existing = foundRows[0];
    if (!existing) {
      throw notFound();
    }

    const isOwner = existing.user_id === req.user.user_id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      throw forbidden();
    }

    await db.query(
      `
        DELETE 
        FROM reviews 
        WHERE review_id = $1
      `, 
      [id]
    );

    return res.json({ 
      deleted: true, 
      review_id: id 
    });
    
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
