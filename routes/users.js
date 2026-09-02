const express = require("express");
const bcrypt = require("bcrypt");
const db = require("../db/client");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const validatePassword = require("../utils/passwordValidator");

const router = express.Router();

/**
 * PATCH /api/users/me
 * Update the logged-in user's profile.
 */
// requireAuth is authentication middleware that protects the route
router.patch("/me", requireAuth, async function (req, res, next) {
  try {
    const userId = req.user.user_id;
    const { name, email, phone } = req.body;

    // values array stores the actual data submitted by the user:
    const updates = [];
    const values = [];

    // Add only the fields provided by the user.
    if (name !== undefined) {
      if (
        typeof name !== "string" ||
        !name.trim() ||
        name.trim().length > 100
      ) {
        const err = new Error("Name must be between 1 and 100 characters.");
        err.status = 400;
        return next(err);
      }

      values.push(name.trim());

      // PostgreSQL parameter placeholder that points to the first item in values
      updates.push(`name = $${values.length}`);
    }

    if (email !== undefined) {
      if (
        typeof email !== "string" ||
        !email.trim() ||
        email.trim().length > 150
      ) {
        const err = new Error("Email must be between 1 and 150 characters.");

        err.status = 400;
        return next(err);
      }

      // Standardize the email before checking or storing it.
      const normalizedEmail = email.trim().toLowerCase();

      // Make sure another user does not already have this email address.
      const emailCheck = await db.query(
        `
          SELECT user_id
          FROM users
          WHERE LOWER(email) = LOWER($1)
            AND user_id <> $2
          LIMIT 1;
        `,
        [normalizedEmail, userId],
      );

      if (emailCheck.rows.length > 0) {
        const err = new Error("An account with this email already exists.");

        err.status = 409;
        return next(err);
      }

      values.push(normalizedEmail);

      // PostgreSQL parameter placeholder for the email value.
      updates.push(`email = $${values.length}`);
    }

    if (phone !== undefined) {
      if (typeof phone !== "string" || !phone.trim()) {
        const err = new Error("Phone must be a nonempty string.");
        err.status = 400;
        return next(err);
      }

      values.push(phone.trim());

      // PostgreSQL parameter placeholder that points to the first item in values
      updates.push(`phone = $${values.length}`);
    }

    // Require at least one profile field.
    if (updates.length === 0) {
      const err = new Error("Provide at least one field: name, email, or phone.");
      err.status = 400;
      return next(err);
    }

    // Add the user ID as the final SQL parameter.
    values.push(userId);

    // this actually sends and executes the SQL query against your PostgreSQL database
    // Extract only the returned rows from the query result.
    // SET specifies which columns should change and their new values; the clause is built dynamically.
    const { rows } = await db.query(
      `
        UPDATE users
        SET ${updates.join(", ")}
        WHERE user_id = $${values.length}
        RETURNING
          user_id,
          name,
          email,
          phone,
          role,
          created_at;
      `,
      values,
    );

    const user = rows[0];

    if (!user) {
      const err = new Error("User not found.");
      err.status = 404;
      return next(err);
    }

    return res.status(200).json({
      message: "Profile updated successfully.",
      user,
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * PATCH /api/users/me/password
 * Change the logged-in user's password.
 */
// requireAuth is authentication middleware that protects the route
router.patch("/me/password", requireAuth, async function (req, res, next) {
  try {
    const userId = req.user.user_id;
    const { currentPassword, newPassword } = req.body;

    // Validate required password fields.
    if (
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string" ||
      !currentPassword ||
      !newPassword
    ) {
      const err = new Error("Current password and new password are required.");
      err.status = 400;
      return next(err);
    }

    // Validate the strength of the new password.
    // newPassword is an argument.
    const passwordError = validatePassword(newPassword);

    if (passwordError) {
      const err = new Error(passwordError);
      err.status = 400;
      return next(err);
    }

    // Retrieve the user's stored password hash.
    // Extract only the returned rows from the query result.
    const { rows } = await db.query(
      `
        SELECT user_id, password
        FROM users
        WHERE user_id = $1
        LIMIT 1;
      `,
      [userId],
    );

    const userRow = rows[0];

    if (!userRow) {
      const err = new Error("User not found.");
      err.status = 404;
      return next(err);
    }

    // Verify the user's current password.
    const currentPasswordMatches = await bcrypt.compare(
      currentPassword,
      userRow.password,
    );

    if (!currentPasswordMatches) {
      const err = new Error("Current password is incorrect.");
      err.status = 401;
      return next(err);
    }

    // Prevent the user from reusing the current password.
    // .compare() is a method provided by bcrypty
    const samePassword = await bcrypt.compare(newPassword, userRow.password);

    if (samePassword) {
      const err = new Error(
        "New password must be different from the current password.",
      );
      err.status = 400;
      return next(err);
    }

    // Hash and save the new password.
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update the password; no returned rows are needed, so no variable is required.
    // SET specifies which column should change and what its new value should be.
    // Change the password column to the value represented by $1
    await db.query(
      `
        UPDATE users
        SET password = $1
        WHERE user_id = $2;
      `,
      [hashedPassword, userId],
    );

    return res.status(200).json({
      message: "Password updated successfully.",
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/users/me
 * Get the logged-in user's profile.
 */
// requireAuth is authentication middleware that protects the route
router.get("/me", requireAuth, async function (req, res, next) {
  try {
    const userId = req.user.user_id;

    // Extract only the returned rows from the query result.
    const { rows } = await db.query(
      `
        SELECT
          user_id,
          name,
          email,
          phone,
          role,
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

    // uses { user } to send the user’s data back to the client as JSON.
    return res.status(200).json({ user });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/users
 * Get all users. Admin only.
 */
// Authentication and admin-authorization middleware protect this route.
router.get("/", requireAuth, requireAdmin, async function (req, res, next) {
  try {
    // Extract only the returned rows from the query result.
    const { rows } = await db.query(`
        SELECT
          user_id,
          name,
          email,
          phone,
          role,
          is_active,
          created_at
        FROM users
        ORDER BY created_at DESC;
      `);

    return res.status(200).json({
      users: rows,
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/users/:id
 * Get one user by ID. Admin only.
 */
// Authentication and admin-authorization middleware protect this route.
// ":id" is a dynamic route parameter containing the user's ID.
router.get("/:id", requireAuth, requireAdmin, async function (req, res, next) {
  try {
    const id = Number(req.params.id);

    // Validate the route parameter.
    if (!Number.isInteger(id) || id <= 0) {
      const err = new Error("Invalid user ID.");
      err.status = 400;
      return next(err);
    }

    // Extract only the returned rows from the query result.
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
      [id],
    );

    const user = rows[0];

    if (!user) {
      const err = new Error("User not found.");
      err.status = 404;
      return next(err);
    }

    return res.status(200).json({ user });
  } catch (err) {
    return next(err);
  }
});

/**
 * PATCH /api/users/:id/role
 * Change a user's role. Admin only.
 */
// Authentication and admin-authorization middleware protect this route.
router.patch(
  "/:id/role",
  requireAuth,
  requireAdmin,
  async function (req, res, next) {
    try {
      const id = Number(req.params.id);
      const { role } = req.body;

      // Validate the route parameter.
      if (!Number.isInteger(id) || id <= 0) {
        const err = new Error("Invalid user ID.");
        err.status = 400;
        return next(err);
      }

      // Allow only supported roles.
      // .includes(role) method checks whether the role value exists inside that array
      if (!["customer", "admin"].includes(role)) {
        const err = new Error('Role must be either "customer" or "admin".');
        err.status = 400;
        return next(err);
      }

      // Extract only the returned rows from the query result.
      // SET specifies which column should change and what its new value should be.
      const { rows } = await db.query(
        `
          UPDATE users
          SET role = $1
          WHERE user_id = $2
          RETURNING
            user_id,
            name,
            email,
            role,
            is_active;
        `,
        [role, id],
      );

      const user = rows[0];

      if (!user) {
        const err = new Error("User not found.");
        err.status = 404;
        return next(err);
      }

      return res.status(200).json({
        message: "User role updated successfully.",
        user,
      });
    } catch (err) {
      return next(err);
    }
  },
);

/**
 * DELETE /api/users/:id
 * Soft-delete a user by deactivating the account. Admin only.
 */
// Authentication and admin-authorization middleware protect this route.
router.delete(
  "/:id",
  requireAuth,
  requireAdmin,
  async function (req, res, next) {
    try {
      const id = Number(req.params.id);

      // Validate the route parameter.
      if (!Number.isInteger(id) || id <= 0) {
        const err = new Error("Invalid user ID.");
        err.status = 400;
        return next(err);
      }

      // Extract only the returned rows from the query result.
      // SET specifies which column should change and what its new value should be.
      const { rows } = await db.query(
        `
          UPDATE users
          SET is_active = false
          WHERE user_id = $1
          RETURNING user_id, name, email, role, is_active;
        `,
        [id],
      );

      const user = rows[0];

      if (!user) {
        const err = new Error("User not found.");
        err.status = 404;
        return next(err);
      }

      return res.status(200).json({
        message: "User deactivated successfully.",
        user,
      });
    } catch (err) {
      return next(err);
    }
  },
);

module.exports = router;
