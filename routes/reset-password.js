const express = require("express");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

const db = require("../db/client");
const validatePassword = require("../utils/passwordValidator");

const router = express.Router();

// POST /api/auth/reset-password
// Public route: resets a user's password using a valid password reset token
router.post("/", async function (req, res, next) {
  let client;

  try {
    // Get the reset token and new password from the request body
    const { token, password } = req.body;

    // Make sure the reset token was provided
    if (typeof token !== "string" || !token.trim()) {
      const err = new Error("Password reset token is required.");
      err.status = 400;
      return next(err);
    }

    // Make sure the new password was provided
    if (typeof password !== "string" || !password) {
      const err = new Error("New password is required.");
      err.status = 400;
      return next(err);
    }

    // Make sure the reset token has the expected format
    // Regular expression used to validate the reset token format
    if (!/^[a-f0-9]{64}$/i.test(token)) {
      const err = new Error("This password reset link is invalid or expired.");
      err.status = 400;
      return next(err);
    }

    // Validate the new password requirements
    const passwordError = validatePassword(password);

    if (passwordError) {
      const err = new Error(passwordError);
      err.status = 400;
      return next(err);
    }

    // Hash the submitted reset token so it can be compared
    // with the token hash stored in the database
    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // Get one dedicated database connection for the transaction
    client = await db.connect();

    // Start a database transaction
    // Starts a PostgreSQL transaction on that same dedicated connection
    await client.query("BEGIN");

    // Find a matching reset token that has not expired
    // prt is an alias for the password_reset_tokens table, and u is an alias for the users table
    const { rows } = await client.query(
      `
        SELECT
          prt.reset_token_id,
          prt.user_id
        FROM password_reset_tokens AS prt
        JOIN users AS u
          ON u.user_id = prt.user_id
        WHERE prt.token_hash = $1
          AND prt.expires_at > CURRENT_TIMESTAMP
          AND u.is_active = true
        LIMIT 1
        FOR UPDATE OF prt;
      `,
      [tokenHash]
    );

    // Get the matching password reset record
    const resetRecord = rows[0];

    // Reject an invalid, expired, or already-used reset token
    // ROLLBACK cancels the current database transaction and undoes any changes made during it
    if (!resetRecord) {
      await client.query("ROLLBACK");

      const err = new Error(
        "This password reset link is invalid or expired."
      );

      err.status = 400;
      return next(err);
    }

    // Hash the user's new password before storing it
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update the user's stored password
    // resetRecord.user_id identifies which user owns the valid reset token
    const updateResult = await client.query(
      `
        UPDATE users
        SET password = $1
        WHERE user_id = $2
          AND is_active = true
        RETURNING user_id;
      `,
      [hashedPassword, resetRecord.user_id]
    );

    // Make sure the user still exists and is active
    // rows.length === 0 means PostgreSQL did not update any matching active user
    if (updateResult.rows.length === 0) {
      await client.query("ROLLBACK");

      const err = new Error(
        "This password reset link is invalid or expired."
      );

      err.status = 400;
      return next(err);
    }

    // Remove all password reset tokens belonging to this user
    // so the reset link cannot be used again
    await client.query(
      `
        DELETE FROM password_reset_tokens
        WHERE user_id = $1;
      `,
      [resetRecord.user_id]
    );

    // Save the password change and token deletion
    // COMMIT permanently saves all changes made during the current database transaction
    await client.query("COMMIT");

    return res.status(200).json({
      message: "Password reset successfully.",
    });

  } catch (err) {
    // Undo database changes if an unexpected error occurs
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Password reset rollback failed:", rollbackError);
      }
    }

    return next(err);

    // The finally block runs after try/catch finishes, whether an error occurred or not
  } finally {
    // Return the dedicated database connection to the pool
    if (client) {
      client.release();
    }
  }
});

module.exports = router;