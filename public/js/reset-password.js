const resetPasswordForm = document.getElementById("reset-password-form");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirm-password");
const passwordMessage = document.getElementById("password-message");

// Get the password reset token from the URL
// window.location.search is the query-string portion of the URL
const params = new URLSearchParams(window.location.search);
const resetToken = params.get("token");

// Validate the new password
function validatePassword(password) {
  if (password.length < 8) {
    return "Password must be at least 8 characters long.";
  }

  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter.";
  }

  if (!/[a-z]/.test(password)) {
    return "Password must contain at least one lowercase letter.";
  }

  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one number.";
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Password must contain at least one special character.";
  }

  return null;
}

// Make sure the reset-password page contains the required form elements
if (resetPasswordForm && passwordInput && confirmPasswordInput && passwordMessage) {

  // Do not allow a password reset if the URL does not contain a token
  if (!resetToken) {
    passwordMessage.textContent =
      "This password reset link is invalid or missing a reset token.";

    passwordMessage.style.color = "red";

    passwordInput.disabled = true;
    confirmPasswordInput.disabled = true;

    const submitButton = resetPasswordForm.querySelector('button[type="submit"]');

    if (submitButton) {
      submitButton.disabled = true;
    }
  }

  // Give the user live feedback while entering a new password
  passwordInput.addEventListener("input", function () {
    const password = passwordInput.value;

    if (!password) {
      passwordMessage.textContent = "";
      return;
    }

    const passwordError = validatePassword(password);

    if (passwordError) {
      passwordMessage.textContent = passwordError;
      passwordMessage.style.color = "red";
    } else {
      passwordMessage.textContent = "Password looks good.";
      passwordMessage.style.color = "green";
    }
  });

  resetPasswordForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    // Make sure the reset token exists
    if (!resetToken) {
      alert("This password reset link is invalid.");
      return;
    }

    // Make sure both password fields were completed
    if (!password || !confirmPassword) {
      alert("Please enter and confirm your new password.");
      return;
    }

    // Validate the new password requirements
    const passwordError = validatePassword(password);

    if (passwordError) {
      passwordMessage.textContent = passwordError;
      passwordMessage.style.color = "red";
      return;
    }

    // Make sure both passwords match
    if (password !== confirmPassword) {
      passwordMessage.textContent = "The passwords do not match.";
      passwordMessage.style.color = "red";
      return;
    }

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: resetToken,
          password,
        }),
      });

      const data = await safeJson(response);

      if (!response.ok) {
        if (response.status >= 500) {
          alert("Something went wrong. Please try again.");
        } else {
          alert(data?.error || "Unable to reset your password.");
        }

        console.error(
          "Reset password request failed:",
          response.status,
          data
        );

        return;
      }

      alert(
        "Your password has been reset successfully. You can now log in with your new password."
      );

      resetPasswordForm.reset();

      // Send the user back to the login page
      window.location.href = "account-login.html";

    } catch (err) {
      console.error("Reset password network error:", err);

      alert("Network error. Please try again.");
    }
  });
}