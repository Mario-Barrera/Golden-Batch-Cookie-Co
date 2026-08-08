const express = require('express');
const db = require('../db/client');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// -------------------- HELPER --------------------

function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

function notFound(message = "Comment not found") {
  const err = new Error(message);
  err.status = 404;
  return err;
}

function forbidden(message = "Forbidden") {
  const err = new Error(message);
  err.status = 403;
  return err;
}

function isValidComment(value) {
  if (typeof value !== "string") {
    return false;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= 1000;
}

// -------------------- ROUTES --------------------

// GET /api/comments - returns all comments
router.get('/', async function listComments(req, res, next) {
  try {
    const { review_id } = req.query;

    const params = [];
    const where = [];

    if (review_id !== undefined) {
      const reviewid = Number(review_id);

      if (!Number.isInteger(reviewid) || reviewid <= 0) {
        throw badRequest("Invalid review id");
      }

      params.push(reviewid);
      where.push(`c.review_id = $${params.length}`);
    }

    const sql = 
    `
      SELECT
        c.comment_id,
        c.review_id,
        c.user_id,
        u.name AS user_name,
        c.comment,
        c.created_at
      FROM comments c
      JOIN users u ON u.user_id = c.user_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY c.created_at DESC;
    `;

    const { rows } = await db.query(sql, params);
    return res.json({ items: rows });

  } catch (err) {
    return next(err);
  }
});

// GET /api/comments/me - fetch comments for logged-in user
router.get("/me", requireAuth, async function (req, res, next) {
  try {
    const userId = req.user.user_id;

    const { rows } = await db.query(
    `
      SELECT
        c.comment_id,
        c.review_id,
        c.user_id,
        u.name AS user_name,
        c.comment,
        c.created_at,
        r.review AS review_text,
        p.name AS product_name
      FROM comments c
      JOIN users u ON u.user_id = c.user_id
      JOIN reviews r ON r.review_id = c.review_id
      JOIN products p ON p.product_id = r.product_id
      WHERE c.user_id = $1
      ORDER BY c.created_at DESC;
    `,
    [userId]
  );

  return res.json({ items: rows });

  } catch (err) {
    return next(err);
  }
});

// POST /api/comments - create a comment
router.post("/", requireAuth, async function (req, res, next) {
  try {
    const userId = req.user.user_id;
    const { review_id, comment } = req.body;

    const reviewId = Number(review_id);

    // Validate the review id.
    if (!Number.isInteger(reviewId) || reviewId <= 0) {
      throw badRequest("Invalid review id");
    }

    // Validate the comment.
    if (!isValidComment(comment)) {
      throw badRequest("Comment must be 1 - 1000 characters");
    }

    // Make sure the review exists.
    const reviewResult = await db.query(
      `
        SELECT review_id
        FROM reviews
        WHERE review_id = $1;
      `,
      [reviewId],
    );

    if (reviewResult.rows.length === 0) {
      throw notFound("Review not found");
    }

    // Prevent the user from commenting twice on the same review.
    const existing = await db.query(
      `
        SELECT comment_id
        FROM comments
        WHERE user_id = $1
          AND review_id = $2;
      `,
      [userId, reviewId],
    );

    if (existing.rows.length > 0) {
      throw badRequest("You already commented on this review");
    }

    // Create the comment.
    const { rows } = await db.query(
      `
        INSERT INTO comments (review_id, user_id, comment)
        VALUES ($1, $2, $3)
        RETURNING
          comment_id,
          review_id,
          user_id,
          comment,
          created_at;
      `,
      [reviewId, userId, comment.trim()],
    );

    return res.status(201).json({ item: rows[0] });

  } catch (err) {
    return next(err);
  }
});

// PATCH /api/comments/:id - edit your own comment
router.patch("/:id", requireAuth, async function (req, res, next) {
  try {
    const userId = req.user.user_id;
    const commentId = Number(req.params.id);
    const { comment } = req.body;

    // Validate the comment id.
    if (!Number.isInteger(commentId) || commentId <= 0) {
      throw badRequest("Invalid comment id");
    }

    // Validate the new comment.
    if (!isValidComment(comment)) {
      throw badRequest("Comment must be 1 - 1000 characters");
    }

    // Find the comment and its owner.
    const existing = await db.query(
      `
        SELECT comment_id, user_id
        FROM comments
        WHERE comment_id = $1;
      `,
      [commentId],
    );

    if (existing.rows.length === 0) {
      throw notFound();
    }

    // Only the comment owner can edit it.
    if (existing.rows[0].user_id !== userId) {
      throw forbidden("You cannot edit another user's comment");
    }

    // Update the comment.
    const { rows } = await db.query(
      `
        UPDATE comments
        SET comment = $1
        WHERE comment_id = $2
        RETURNING
          comment_id,
          review_id,
          user_id,
          comment,
          created_at;
      `,
      [comment.trim(), commentId],
    );

    return res.json({ item: rows[0] });

  } catch (err) {
    return next(err);
  }
});

// DELETE /api/comments/:id - delete your own comment
router.delete("/:id", requireAuth, async function (req, res, next) {
  try {
    const userId = req.user.user_id;
    const commentId = Number(req.params.id);

    // Validate the comment id.
    if (!Number.isInteger(commentId) || commentId <= 0) {
      throw badRequest("Invalid comment id");
    }

    // Find the comment and its owner.
    const existing = await db.query(
      `
        SELECT comment_id, user_id
        FROM comments
        WHERE comment_id = $1;
      `,
      [commentId],
    );

    if (existing.rows.length === 0) {
      throw notFound();
    }

    // Only the comment owner can delete it.
    if (existing.rows[0].user_id !== userId) {
      throw forbidden("You cannot delete another user's comment");
    }

    // Delete the comment.
    await db.query(
      `
        DELETE FROM comments
        WHERE comment_id = $1;
      `,
      [commentId],
    );

    return res.json({ message: "Comment deleted successfully" });
    
  } catch (err) {
    return next(err);
  }
});

module.exports = router;