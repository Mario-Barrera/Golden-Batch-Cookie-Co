const transporter = require("./mailer");

// Send a welcome email after a customer successfully creates an account.
async function sendWelcomeEmail(user) {
  if (!process.env.MAIL_FROM) {
    throw new Error("MAIL_FROM is not configured.");
  }

  if (!process.env.APP_URL) {
    throw new Error("APP_URL is not configured.");
  }

  // Remove any trailing slash from APP_URL.
  const appUrl = process.env.APP_URL.replace(/\/+$/, "");

  // Build the URL for the customer login page.
  const loginUrl = `${appUrl}/account-login.html`;

  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to: user.email,
    subject: "Welcome to Golden Batch Cookie Co.",

    // Plain-text version for email clients that do not display HTML.
    text:
      `Hello ${user.name},\n\n` +
      `Welcome to Golden Batch Cookie Co.! Your customer account has been successfully created.\n\n` +
      `You can now place online orders, manage your account, and share reviews and comments on our website.\n\n` +
      `Log in to your account here:\n${loginUrl}\n\n` +
      `Thank you for creating an account with us. We look forward to serving you!\n\n` +
      `Golden Batch Cookie Co.`,

    // HTML version for email clients that support HTML.
    html:
      `<p>Hello ${user.name},</p>` +
      `<p>Welcome to <strong>Golden Batch Cookie Co.</strong>!</p>` +
      `<p>Your customer account has been successfully created.</p>` +
      `<p>You can now place online orders, manage your account, and share reviews and comments on our website.</p>` +
      `<p><a href="${loginUrl}">Log in to your Golden Batch account</a></p>` +
      `<p>Thank you for creating an account with us. We look forward to serving you!</p>` +
      `<p><strong>Golden Batch Cookie Co.</strong></p>`,
  });
}

module.exports = sendWelcomeEmail;