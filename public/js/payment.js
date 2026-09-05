// Initialize and manage the Stripe payment process.
async function initializePayment() {
  const stripePaymentForm = document.getElementById("payment-form");
  const paymentElementContainer = document.getElementById("payment-element");
  const paymentMessage = document.getElementById("payment-message");
  const payNowBtn = document.getElementById("pay-now-btn");
  const checkoutOrderForm = document.getElementById("order-form");

  let stripe;
  let elements;
  let mountedPaymentElement;

  // ---------------- HELPER FUNCTIONS ------------------

  // Get the Stripe publishable key from the backend.
  async function loadStripeConfig() {
    const response = await fetch("/api/checkout/config");

    if (!response.ok) {
      throw new Error("Unable to load Stripe configuration.");
    }

    const data = await response.json();

    stripe = Stripe(data.publishableKey);
  }

  // Ask the backend to create a PaymentIntent for the current cart.
  async function createPaymentIntent() {
    const items = cart.map(function (item) {
      return {
        product_id: item.product_id,
        quantity: item.quantity,
      };
    });

    const response = await fetch("/api/checkout/create-payment-intent", {
      method: "POST",

      headers: getAuthHeaders(),

      body: JSON.stringify({
        items: items,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to start payment.");
    }

    return data.clientSecret;
  }

  // Ask the backend to independently verify the Stripe payment.
  async function verifyPayment(paymentIntentId) {
    const items = cart.map(function (item) {
      return {
        product_id: item.product_id,
        quantity: item.quantity,
      };
    });

    const response = await fetch("/api/checkout/verify-payment", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        paymentIntentId: paymentIntentId,
        items: items,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to verify payment.");
    }

    return data;
  }

  // ---------------- EVENT LISTENERS ------------------

  // Build the Stripe payment fields when the customer
  // continues from the order panel to the payment panel.
  checkoutOrderForm.addEventListener("submit", async function () {
    try {
      paymentMessage.textContent = "";
      payNowBtn.disabled = true;

      if (!stripe) {
        await loadStripeConfig();
      }

      const clientSecret = await createPaymentIntent();

      // Remove an older Payment Element if the customer
      // went back and changed the order.
      if (mountedPaymentElement) {
        mountedPaymentElement.unmount();
      }

      elements = stripe.elements({
        clientSecret: clientSecret,
      });

      mountedPaymentElement = elements.create("payment");

      mountedPaymentElement.mount(paymentElementContainer);

      payNowBtn.disabled = false;
    } catch (err) {
      console.error("Error loading payment form:", err);

      paymentMessage.textContent =
        err.message || "Unable to load the payment form.";
    }
  });

  // Submit the customer's payment information to Stripe.
  stripePaymentForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    payNowBtn.disabled = true;
    paymentMessage.textContent = "";

    const result = await stripe.confirmPayment({
      elements: elements,

      confirmParams: {
        return_url: `${window.location.origin}/order-confirmation.html`,
      },

      redirect: "if_required",
    });

    if (result.error) {
      paymentMessage.textContent = result.error.message;

      payNowBtn.disabled = false;

      return;
    }

    if (result.paymentIntent && result.paymentIntent.status === "succeeded") {
      try {
        await verifyPayment(result.paymentIntent.id);

        // Clear the purchased items from the in-memory cart.
        cart.length = 0;

        // Remove the saved cart from localStorage.
        saveCart();

        window.location.href = "/order-confirmation.html";
        
      } catch (err) {
        console.error("Payment verification failed:", err);

        paymentMessage.textContent =
          err.message || "Unable to verify your payment.";

        payNowBtn.disabled = false;
      }
    }
  });
}

initializePayment();
