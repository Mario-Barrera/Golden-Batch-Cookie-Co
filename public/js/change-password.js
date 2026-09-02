// ---------------- HELPER FUNCTIONS ------------------

// Validate the new password before sending it to the backend.
function validatePassword(password) {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecialChar = /[\W_]/.test(password);

  if (password.length < minLength) {
    return `Password must be at least ${minLength} characters long.`;
  }

  if (!hasUpperCase) {
    return "Password must contain at least one uppercase letter.";
  }

  if (!hasLowerCase) {
    return "Password must contain at least one lowercase letter.";
  }

  if (!hasDigit) {
    return "Password must contain at least one digit.";
  }

  if (!hasSpecialChar) {
    return "Password must contain at least one special character.";
  }

  return null;
}


// ---------------- PAGE INITIALIZATION ------------------

document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("changePasswordForm");
  const currentPasswordInput = document.getElementById("current-password");
  const newPasswordInput = document.getElementById("new-password");
  const confirmPasswordInput = document.getElementById("confirm-password");
  const passwordMessageDiv = document.getElementById("password-requirements");
  const cancelBtn = document.getElementById("cancelButton");

  const token = getToken();


  // Stop the script if the change password form cannot be found.
  if (!form) {
    console.error("Change password form not found.");
    return;
  }


  // Redirect the user to the login page if they are not logged in.
  if (!token) {
    alert("You must be logged in to change your password.");
    window.location.href = "account-login.html";
    return;
  }


  // ---------------- LIVE PASSWORD VALIDATION ------------------

  // Validate the new password as the user types.
  if (newPasswordInput && passwordMessageDiv) {
    newPasswordInput.addEventListener("input", function () {
      const newPassword = newPasswordInput.value;

      if (!newPassword) {
        passwordMessageDiv.textContent = "";
        passwordMessageDiv.classList.remove("error", "success");
        return;
      }

      const passwordError = validatePassword(newPassword);

      if (passwordError) {
        passwordMessageDiv.textContent = passwordError;
        passwordMessageDiv.classList.remove("success");
        passwordMessageDiv.classList.add("error");
      } else {
        passwordMessageDiv.textContent = "Password looks good.";
        passwordMessageDiv.classList.remove("error");
        passwordMessageDiv.classList.add("success");
      }
    });
  }


  // ---------------- CHANGE PASSWORD ------------------

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const currentPassword = currentPasswordInput.value;
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;


    // Make sure all password fields were completed.
    if (!currentPassword || !newPassword || !confirmPassword) {
      alert("Please complete all password fields.");
      return;
    }


    // Validate the strength of the new password.
    const passwordError = validatePassword(newPassword);

    if (passwordError) {
      if (passwordMessageDiv) {
        passwordMessageDiv.textContent = passwordError;
        passwordMessageDiv.classList.remove("success");
        passwordMessageDiv.classList.add("error");
      }

      return;
    }


    // Make sure the customer entered the new password correctly twice.
    if (newPassword !== confirmPassword) {
      alert("New password and confirm password do not match.");
      return;
    }


    try {
      // Send the current and new password to the dedicated password route.
      const response = await fetch("/api/users/me/password", {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      const data = await safeJson(response);


      // Handle an unsuccessful password update.
      if (!response.ok) {
        const message =
          data?.error ||
          "Failed to update password.";

        // Redirect the customer if their login session expired.
        if (response.status === 401) {
          alert("Your session has expired. Please log in again.");

          localStorage.removeItem("token");
          localStorage.removeItem("user");

          window.location.href = "account-login.html";
          return;
        }

        alert(message);
        return;
      }


      // Clear all password fields after a successful update.
      currentPasswordInput.value = "";
      newPasswordInput.value = "";
      confirmPasswordInput.value = "";

      if (passwordMessageDiv) {
        passwordMessageDiv.textContent = "";
        passwordMessageDiv.classList.remove("error", "success");
      }


      alert("Password updated successfully.");

      window.location.href = "account-profile.html";

    } catch (err) {
      console.error("Password update failed:", err);

      alert(
        "Network error. Unable to update password. Please try again."
      );
    }
  });


  // ---------------- NAVIGATION BUTTON ------------------

  // Return to the manage profile page without changing the password.
  if (cancelBtn) {
    cancelBtn.addEventListener("click", function () {
      window.location.href = "manage-profile.html";
    });
  }
});