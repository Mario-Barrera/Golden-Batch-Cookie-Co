const express = require("express");
const transporter = require("../utils/mailer");
const logger = require("../utils/logger");

const router = express.Router();

// POST /api/catering - receive catering form data and send the request by email
router.post("/", async function (req, res, next) {
  try {
    logger.info("Catering request received");

    const { eventType, cookieFlavor, guestCount, eventDate, customerInfo } =
      req.body;

    // Send a confirmation email to the customer
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: customerInfo.email,
      subject: "Golden Batch Cookie Co. Catering Request",
      text: `
Hello ${customerInfo.firstName},

Thank you for submitting your catering request.

Event: ${eventType}
Cookie Flavors: ${cookieFlavor.join(", ")}
Guest Count: ${guestCount}
Event Date: ${eventDate}

We'll be in touch soon.

Golden Batch Cookie Co.
            `,
    });

    // Log successful email delivery without logging the customer's email address.
    logger.info(`Catering email sent. Message ID: ${info.messageId}`);

    res.status(200).json({
      message: "Catering request submitted successfully.",
    });

  } catch (err) {
    next(err);
  }
});

module.exports = router;
