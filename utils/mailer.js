// Nodemailer is a Node.js library used to send emails from server-side JavaScript,
// such as confirmation emails, password resets, contact forms, and catering requests.

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "Yahoo",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    },
});

module.exports = transporter;