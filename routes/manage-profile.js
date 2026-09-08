const express = require("express");
const bcrypt = require("bcrypt");

const db = require("../db/client");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const validatePassword = require("../utils/passwordValidator");

const router = express.Router();

// -------------------- HELPER --------------------

// Validate and format a U.S. phone number
function formatPhoneNumber(phone) {
  if (typeof phone !== "string") {
    return null;
  }

  const digits = phone.replace(/\D/g, "");

  if (digits.length !== 10) {
    return null;
  }

  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

// Validate a user ID supplied through the URL
function isValidUserId(userId) {
  return Number.isInteger(userId) && userId > 0;
}


// Update a user's profile
// This helper is shared by the regular-user route and the admin route
async function updateUserProfile(userId, updateData) {
  const {
    name,
    email,
    phone,
    password
  } = updateData;


  // Make sure the required profile fields were provided
  if (
    !name?.trim() ||
    !email?.trim() ||
    !phone?.trim()
  ) {
    const err = new Error(
      "Name, email, and phone are required."
    );

    err.status = 400;
    throw err;
  }

  // Validate and standardize the user's phone number.
  const formattedPhone = formatPhoneNumber(phone);

  if (!formattedPhone) {
    const err = new Error(
     "Please enter a valid 10-digit phone number."
    );

    err.status = 400;
    throw err;
  }


  // Match the VARCHAR(100) restriction in the users table
  if (name.trim().length > 100) {
    const err = new Error(
      "Name cannot be more than 100 characters."
    );

    err.status = 400;
    throw err;
  }


  // Match the VARCHAR(150) restriction in the users table
  if (email.trim().length > 150) {
    const err = new Error(
      "Email cannot be more than 150 characters."
    );

    err.status = 400;
    throw err;
  }


  // Check whether another user already has this email address
  const emailCheck = await db.query(
    `
      SELECT user_id
      FROM users
      WHERE LOWER(email) = LOWER($1)
        AND user_id <> $2
      LIMIT 1;
    `,
    [
      email.trim(),
      userId
    ],
  );


  if (emailCheck.rows.length > 0) {
    const err = new Error(
      "An account with this email already exists."
    );

    err.status = 409;
    throw err;
  }


  // If a new password was entered, validate and hash it
  let hashedPassword = null;

  if (password) {
    const passwordError = validatePassword(password);

    if (passwordError) {
      const err = new Error(passwordError);

      err.status = 400;
      throw err;
    }

    hashedPassword = await bcrypt.hash(password, 12);
  }


  // Update the user's profile.
  // COALESCE keeps the existing password when no new password was provided.
  const { rows } = await db.query(
    `
      UPDATE users
      SET
        name = $1,
        email = $2,
        phone = $3,
        password = COALESCE($4, password)
      WHERE user_id = $5
      RETURNING
        user_id,
        name,
        email,
        phone,
        role,
        is_active,
        created_at;
    `,
    [
      name.trim(),
      email.trim(),
      formattedPhone,
      hashedPassword,
      userId
    ],
  );


  const updatedUser = rows[0];


  if (!updatedUser) {
    const err = new Error("User not found.");

    err.status = 404;
    throw err;
  }


  return updatedUser;
}

// -------------------- ROUTES --------------------

// PATCH /api/users/me
// Allow the currently logged-in user to update their own profile
router.patch("/me", requireAuth, async function (req, res, next) {
    try {
      const userId = req.user.user_id;

      const updatedUser = await updateUserProfile(
        userId,
        req.body
      );

      return res.status(200).json({
        message: "Profile updated successfully.",
        user: updatedUser
      });

    } catch (err) {
      return next(err);
    }
});

// GET /api/users/me
// Allow the currently logged-in user to retrieve their own profile.
router.get("/me", requireAuth, async function (req, res, next) {
  try {
    const userId = req.user.user_id;

    const { rows } = await db.query(
      `
        SELECT
          user_id,
          name,
          email,
          phone,
          role,
          is_active,
          created_at
        FROM users
        WHERE user_id = $1
        LIMIT 1;
      `,
      [userId],
    );

    const user = rows[0];

    if (!user) {
      const err = new Error("User not found.");
      err.status = 404;
      return next(err);
    }

    return res.status(200).json({
      user
    });

  } catch (err) {
    return next(err);
  }
});

// GET /api/users/:userId
// Allow an admin to retrieve another user's profile
router.get("/:userId", requireAuth, requireAdmin, async function (req, res, next) {
    try {
      const userId = Number(req.params.userId);


      if (!isValidUserId(userId)) {
        const err = new Error("Invalid user ID.");

        err.status = 400;
        return next(err);
      }


      const { rows } = await db.query(
        `
          SELECT
            user_id,
            name,
            email,
            phone,
            role,
            is_active,
            created_at
          FROM users
          WHERE user_id = $1
          LIMIT 1;
        `,
        [userId],
      );


      const user = rows[0];


      if (!user) {
        const err = new Error("User not found.");

        err.status = 404;
        return next(err);
      }


      return res.status(200).json({
        user
      });

    } catch (err) {
      return next(err);
    }
});


// PATCH /api/users/:userId
// Allow an admin to update another user's profile
router.patch("/:userId", requireAuth, requireAdmin, async function (req, res, next) {
    try {
      const userId = Number(req.params.userId);


      if (!isValidUserId(userId)) {
        const err = new Error("Invalid user ID.");

        err.status = 400;
        return next(err);
      }


      const updatedUser = await updateUserProfile(
        userId,
        req.body
      );


      return res.status(200).json(updatedUser);

    } catch (err) {
      return next(err);
    }
});

module.exports = router;