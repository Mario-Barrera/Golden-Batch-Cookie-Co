// Show live password requirement feedback
function setupPasswordRequirements() {
  const passwordInput = document.getElementById("password");
  const messageDiv = document.getElementById("password-requirements");

  if (!passwordInput || !messageDiv) return;

  passwordInput.addEventListener("input", function () {
    const password = passwordInput.value;

    const failedMessages = [];

    if (password.length < 10) {
      failedMessages.push("Password must be at least 10 characters long.");
    }

    if (!/[A-Z]/.test(password)) {
      failedMessages.push("Password must contain at least one capital letter.");
    }

    if (!/[0-9]/.test(password)) {
      failedMessages.push("Password must contain at least one number.");
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
      failedMessages.push("Password must contain at least one special character.");
    }

    if (password.length === 0) {
      messageDiv.innerHTML = "";
    } else if (failedMessages.length > 0) {
      messageDiv.innerHTML = failedMessages
        .map(function (msg) {
          return `<div>• ${msg}</div>`;
        })
        .join("");
      } else {
        messageDiv.innerHTML =
        '<div style="color: green;">Password meets all requirements.</div>';
      }
  });
}

const registerForm = document.getElementById("register-form");

if (registerForm) {
  setupPasswordRequirements();

  // Listen for the form's submit event and run this function when the form is submitted
  registerForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const firstNameInput = document.getElementById("first-name");
    const lastNameInput = document.getElementById("last-name");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const confirmPasswordInput = document.getElementById("confirm-password");
    const addressInput = document.getElementById("address");
    const phoneInput = document.getElementById("phone");

    const firstName = firstNameInput?.value.trim();
    const lastName = lastNameInput?.value.trim();
    const email = emailInput?.value.trim();
    const password = passwordInput?.value;
    const confirmPassword = confirmPasswordInput?.value;
    const address = addressInput?.value.trim();
    const phone = phoneInput?.value.trim();

    // Make sure all required fields were completed
    if (
      !firstName ||
      !lastName ||
      !email ||
      !password ||
      !confirmPassword ||
      !address ||
      !phone
    ) {
      alert("Please fill out all required fields.");
      return;
    }

    // Make sure both password fields match
    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    // Combine the first and last name for the backend's name field
    const name = `${firstName} ${lastName}`;

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({ 
          name, 
          email, 
          password, 
          address, 
          phone 
        }),
      });

      const data = await safeJson(response);

      if (!response.ok) {
        const message = data?.error || `Registration failed (status: ${response.status}).`;

        alert(message);
        console.error("Registration failed:", message, data);
        return;
      }

      if (!data?.token || !data?.user) {
        alert("Unexpected server response. Please try again");
        console.error("Invalid register response:", data);
        return;
      }

      // Save token + user in browser storage
      saveAuth({ 
        token: data.token, 
        user: data.user 
      });

      // Redirect after successful registration
      window.location.href = "index.html";

    } catch (err) {
      console.error("Network/unexpected register error:", err);
      alert("Network error, please try again.");
    }
  });
}