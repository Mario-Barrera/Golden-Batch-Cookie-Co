const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../db/client");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const validatePassword = require("../utils/passwordValidator");

const router = express.Router();

// POST /api/auth/register
// Public route: no JWT protection required (user does not have a token yet)
router.post("/register", async function (req, res, next) {
  try {
    // Get registration data from the request body.
    const { name, email, password, address, phone } = req.body;

    // Confirm that all required fields were provided.
    if (!name || !email || !password || !address || !phone) {
      const err = new Error(
        "Name, email, password, address, and phone are required.",
      );
      err.status = 400;
      return next(err);
    }

    // Validate the password requirements.
    const passwordError = validatePassword(password);

    if (passwordError) {
      const err = new Error(passwordError);
      err.status = 400;
      return next(err);
    }

    // Confirm that the JWT secret is configured.
    if (!process.env.JWT_SECRET) {
      const err = new Error("JWT_SECRET is not configured.");
      err.status = 500;
      return next(err);
    }

    // Standardize the email before searching or storing it.
    const normalizedEmail = email.trim().toLowerCase();

    // Check whether the email is already registered.
    const existing = await db.query(
      `
        SELECT user_id
        FROM users
        WHERE email = $1;
      `,
      [normalizedEmail],
    );

    if (existing.rows.length > 0) {
      const err = new Error("Email is already registered.");
      err.status = 409;
      return next(err);
    }

    // Hash the password before storing it.
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create the new customer and return safe user fields.
    const insertSQL = `
      INSERT INTO users (
        name,
        email,
        password,
        address,
        phone,
        role
      )
      VALUES ($1, $2, $3, $4, $5, 'customer')
      RETURNING
        user_id,
        name,
        email,
        address,
        phone,
        role,
        created_at;
    `;

    // Execute the INSERT query.
    const { rows } = await db.query(insertSQL, [
      name.trim(),
      normalizedEmail,
      hashedPassword,
      address.trim(),
      phone.trim(),
    ]);

    const user = rows[0];

    // Create a token for the newly registered user.
    const token = jwt.sign(
      {
        user_id: user.user_id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      },
    );

    // Send the new user and token to the frontend.
    return res.status(201).json({
      message: "Account created successfully.",
      user,
      token,
    });
  } catch (err) {
    // Forward unexpected errors to the error handler.
    return next(err);
  }
});

// POST /api/auth/login
// Public route: no JWT protection required (user does not have a token yet)
router.post("/login", async function (req, res, next) {
  try {
    // Get login credentials.
    const { email, password } = req.body;

    // Validate the required fields and their data types.
    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      const err = new Error("Email and password are required.");
      err.status = 400;
      return next(err);
    }

    // Confirm that the JWT signing secret exists.
    if (!process.env.JWT_SECRET) {
      const err = new Error("JWT_SECRET is not configured.");
      err.status = 500;
      return next(err);
    }

    // Match the email format used during registration.
    const normalizedEmail = email.trim().toLowerCase();

    // Retrieve the user and stored password hash.
    const { rows } = await db.query(
      `
        SELECT
          user_id,
          name,
          email,
          password,
          role,
          address,
          phone
        FROM users
        WHERE email = $1
          AND is_active = true
        LIMIT 1;
      `,
      [normalizedEmail],
    );

    // Get the first user returned by the database query.
    const userRow = rows[0];

    // Use the same message whether the email or password is incorrect.
    if (!userRow) {
      const err = new Error("Invalid email or password.");
      err.status = 401;
      return next(err);
    }

    // Compare the submitted password with the stored bcrypt hash.
    const passwordMatches = await bcrypt.compare(
      password, // plain-text password the user just entered in the login form
      userRow.password, // bcrypt password hash stored in the database
    );

    if (!passwordMatches) {
      const err = new Error("Invalid email or password.");
      err.status = 401;
      return next(err);
    }

    // Create a response object that excludes the password hash.
    const safeUser = {
      user_id: userRow.user_id,
      name: userRow.name,
      email: userRow.email,
      role: userRow.role,
      address: userRow.address,
      phone: userRow.phone,
    };

    // Create an authentication token.
    const token = jwt.sign(
      {
        user_id: safeUser.user_id,
        role: safeUser.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      },
    );

    // Return the authenticated user and token.
    return res.status(200).json({
      message: "Login successful.",
      user: safeUser,
      token,
    });
  } catch (err) {
    // Forward unexpected errors to the error handler.
    return next(err);
  }
});

// GET /api/auth/me  — current user's profile (admin or customer)
// JWT protection required
// requireAuth is authentication middleware that protects the route
router.get("/me", requireAuth, async function (req, res, next) {
  try {
    // Get the authenticated user's ID from the verified JWT.
    const userId = req.user.user_id;

    // Retrieve the currently logged-in user's safe account information.
    const { rows } = await db.query(
      `
        SELECT
          user_id,
          name,
          email,
          address,
          phone,
          role,
          created_at
        FROM users
        WHERE user_id = $1
          AND is_active = true
        LIMIT 1;
      `,
      [userId],
    );

    // Get the first user returned by the database query.
    const user = rows[0];

    // Handle a valid token that belongs to a deleted or missing user.
    if (!user) {
      const err = new Error("User not found.");
      err.status = 404;
      return next(err);
    }

    // Return the currently authenticated user.
    return res.status(200).json({ user });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
