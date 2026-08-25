const forgotPasswordForm = document.getElementById("forgot-password-form");

if (forgotPasswordForm) {
  forgotPasswordForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const emailInput = document.getElementById("email");

    // Make sure the email input exists
    if (!emailInput) {
      console.error("Email input was not found.");
      alert("Something went wrong. Please try again.");
      return;
    }

    const email = emailInput.value.trim();

    // Make sure an email address was entered
    if (!email) {
      alert("Please enter your email address.");
      return;
    }

    // Make sure the email is in a valid email format
    if (!emailInput.validity.valid) {
      alert("Please enter a valid email address.");
      return;
    }

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await safeJson(response);

      if (!response.ok) {
        // Do not expose internal server error details to the user
        if (response.status >= 500) {
          alert("Something went wrong. Please try again.");
        } else {
          alert(data?.error || `Password reset request failed (status: ${response.status}).`);
        }

        console.error("Forgot password request failed:", response.status, data);

        return;
      }

      // Show the same message whether or not the email exists in the database
      alert("If an account exists with that email address, a password reset link has been sent.");

      // Clear the form after a successful request
      forgotPasswordForm.reset();

    } catch (err) {
      console.error("Forgot password network error:", err);

      alert("Network error. Please try again.");
    }
  });
}
