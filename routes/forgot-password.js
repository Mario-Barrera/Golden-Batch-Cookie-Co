const express = require("express");
const crypto = require("crypto");

const db = require("../db/client");
const transporter = require("../utils/mailer");

const router = express.Router();

// ---------------- ROUTES -----------------

// POST /api/auth/forgot-password
// Public route: sends a password reset link if the email belongs to an active user
router.post("/", async function (req, res, next) {
  try {
    // Get the submitted email address
    const { email } = req.body;

    // Make sure an email address was provided
    if (typeof email !== "string" || !email.trim()) {
      const err = new Error("Email is required.");
      err.status = 400;
      return next(err);
    }

    // Make sure the application's public URL is configured
    if (!process.env.APP_URL) {
      const err = new Error("APP_URL is not configured.");
      err.status = 500;
      return next(err);
    }

    // Make sure the email sender is configured
    if (!process.env.MAIL_FROM) {
      const err = new Error("MAIL_FROM is not configured.");
      err.status = 500;
      return next(err);
    }

    // Make sure the required SMTP settings are configured
    if (
      !process.env.SMTP_HOST ||
      !process.env.SMTP_PORT ||
      !process.env.EMAIL_USER ||
      !process.env.EMAIL_PASSWORD
    ) {
      const err = new Error("SMTP email settings are not configured.");
      err.status = 500;
      return next(err);
    }

    // Standardize the email before searching the database
    const normalizedEmail = email.trim().toLowerCase();

    // Use the same response whether or not the account exists
    const genericMessage =
      "If an account exists with that email address, a password reset link has been sent.";

    // Look for an active user with the submitted email address
    const { rows } = await db.query(
      `
        SELECT
          user_id,
          name,
          email
        FROM users
        WHERE email = $1
          AND is_active = true
        LIMIT 1;
      `,
      [normalizedEmail],
    );

    // Get the first user returned by the database query
    const user = rows[0];

    // Do not reveal whether the email address exists in the database
    if (!user) {
      return res.status(200).json({
        message: genericMessage,
      });
    }

    // Generate a secure random password reset token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Hash the reset token before storing it in the database
    const tokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Remove any previous password reset token belonging to this user
    await db.query(
      `
        DELETE FROM password_reset_tokens
        WHERE user_id = $1;
      `,
      [user.user_id],
    );

    // Store the hashed reset token and make it expire one hour from now
    await db.query(
      `
        INSERT INTO password_reset_tokens (
          user_id,
          token_hash,
          expires_at
        )
        VALUES (
          $1,
          $2,
          CURRENT_TIMESTAMP + INTERVAL '1 hour'
        );
      `,
      [user.user_id, tokenHash],
    );

    const appUrl = process.env.APP_URL.replace(/\/+$/, "");

    // Build the password reset URL using the original unhashed token
    const resetUrl = `${appUrl}/reset-password.html?token=${resetToken}`;

    try {
      await transporter.sendMail({
        from: process.env.MAIL_FROM,
        to: user.email,
        subject: "Golden Batch Cookie Co. Password Reset",

        // Plain-text version of the email.
        // This is used as a fallback for email clients that do not display HTML.
        text:
          `Hello ${user.name},\n\n` +
          `We received a request to reset your Golden Batch Cookie Co. password.\n\n` +
          `Use the following link to reset your password:\n\n` +
          `${resetUrl}\n\n` +
          `This link will expire in 1 hour.`,

        // HTML version of the email.
        // This allows the reset link to appear as a clickable link in supported email clients.
        html:
          `<p>Hello ${user.name},</p>` +
          `<p>We received a request to reset your Golden Batch Cookie Co. password.</p>` +
          `<p><a href="${resetUrl}">Reset your password</a></p>` +
          `<p>This link will expire in 1 hour.</p>`,
      });

    } catch (emailError) {
      console.error("Email error:", emailError);

      // Remove the reset token if the email could not be sent
      await db.query(
        `
      DELETE FROM password_reset_tokens
      WHERE token_hash = $1;
    `,
        [tokenHash],
      );

      // Send the email error to the centralized error handler
      return next(emailError);
    }
    // Return the same response used when an account does not exist
    return res.status(200).json({
      message: genericMessage,
    });
  } catch (err) {
    // Forward unexpected errors to the centralized error handler
    return next(err);
  }
});

module.exports = router;
