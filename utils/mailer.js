// Nodemailer is a Node.js library used to send emails from server-side JavaScript,
// such as confirmation emails, password resets, contact forms, and catering requests.

const nodemailer = require("nodemailer");

// ---------------- EMAIL CONFIGURATION ------------------

// Create one shared Nodemailer transporter for all outgoing emails.
// SMTP stands for Simple Mail Transfer Protocol.
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

module.exports = transporter;