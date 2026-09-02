// ---------------- HELPER FUNCTIONS ------------------

// Validate and format a U.S. phone number as: (512) 784-2287
function formatPhoneNumber(phone) {
  if (typeof phone !== "string") {
    return null;
  }

  const digits = phone.replace(/\D/g, "");

  if (digits.length !== 10) {
    return null;
  }

  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}


// ---------------- PAGE INITIALIZATION ------------------

document.addEventListener("DOMContentLoaded", async function () {
  const form = document.getElementById("manageProfileForm");
  const cancelBtn = document.getElementById("cancelButton");
  const changePasswordButton = document.getElementById("changePasswordButton");
  const token = localStorage.getItem("token");

  const firstNameInput = document.getElementById("first-name");
  const lastNameInput = document.getElementById("last-name");
  const emailInput = document.getElementById("email");
  const phoneInput = document.getElementById("phone");

  // Stop the script if the manage profile form cannot be found.
  if (!form) {
    console.error("Manage profile form not found.");
    return;
  }

  // Redirect the user if no authentication token exists.
  if (!token) {
    alert("You must be logged in to manage your profile.");
    window.location.href = "account-login.html";
    return;
  }

  // Store the original profile so we can determine what changed.
  let originalUser = null;


  // Split the user's full name into first-name and last-name values.
  function splitName(fullName) {
    if (fullName === undefined || fullName === null) {
      fullName = "";
    }

    const parts = fullName.trim().split(/\s+/);

    return {
      firstName: parts[0] || "",
      lastName: parts.slice(1).join(" ")
    };
  }


  // Fill the form with the customer's existing profile information.
  function fillForm(user) {
    const { firstName, lastName } = splitName(user.name);

    if (firstNameInput) {
      firstNameInput.value = firstName;
    }

    if (lastNameInput) {
      lastNameInput.value = lastName;
    }

    if (emailInput) {
      emailInput.value = user.email || "";
    }

    if (phoneInput) {
      phoneInput.value = user.phone || "";
    }
  }


  // ---------------- LOAD USER PROFILE ------------------

  try {
    const response = await fetch("/api/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.error || "Failed to load profile."
      );
    }

    originalUser = data.user;

    fillForm(data.user);

  } catch (err) {
    console.error("Error loading profile:", err);
    alert(err.message || "Failed to load profile.");
    return;
  }


  // ---------------- UPDATE PROFILE ------------------

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const firstName = firstNameInput.value.trim();
    const lastName = lastNameInput.value.trim();

    const name = `${firstName} ${lastName}`.trim();

    // Normalize the email before comparing or sending it.
    const email = emailInput.value.trim().toLowerCase();

    // Validate and standardize the phone number.
    const phone = formatPhoneNumber(phoneInput.value);


    // Validate required profile fields.
    if (!firstName || !lastName || !email) {
      alert("First name, last name, and email are required.");
      return;
    }


    // Validate the phone number.
    if (!phone) {
      alert("Please enter a valid 10-digit phone number.");
      return;
    }


    // Split the original full name for comparison.
    const originalName = splitName(originalUser.name);

    const originalEmail = (originalUser.email || "")
      .trim()
      .toLowerCase();

    const originalPhone =
      formatPhoneNumber(originalUser.phone) ||
      originalUser.phone ||
      "";


    // Determine whether any profile information changed.
    const hasProfileChanges =
      firstName !== originalName.firstName ||
      lastName !== originalName.lastName ||
      email !== originalEmail ||
      phone !== originalPhone;


    // Stop if nothing was changed.
    if (!hasProfileChanges) {
      alert("No changes made. Unable to update profile.");
      return;
    }


    try {
      const updateData = {
        name,
        email,
        phone
      };

      // Send the updated profile information to the backend.
      const response = await fetch("/api/users/me", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(updateData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to update profile."
        );
      }

      // routes/users.js returns the updated customer
      // inside the response's user property.
      const updatedUser = data.user;


      // Update localStorage with the latest profile information.
      const storedUser = localStorage.getItem("user");

      if (storedUser && updatedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);

          parsedUser.name = updatedUser.name;
          parsedUser.email = updatedUser.email;
          parsedUser.phone = updatedUser.phone;

          localStorage.setItem(
            "user",
            JSON.stringify(parsedUser)
          );

        } catch (err) {
          console.warn(
            "Could not update localStorage user:",
            err
          );
        }
      }


      alert("Profile updated successfully.");

      window.location.href = "account-profile.html";

    } catch (err) {
      console.error("Error updating profile:", err);

      alert(
        err.message ||
        "Failed to update profile. Please try again."
      );
    }
  });


  // ---------------- NAVIGATION BUTTONS ------------------

  // Redirect the user to the change password page.
  if (changePasswordButton) {
    changePasswordButton.addEventListener("click", function () {
      window.location.href = "change-password.html";
    });
  }

  // Redirect the user back to the account profile page.
  if (cancelBtn) {
    cancelBtn.addEventListener("click", function () {
      window.location.href = "account-profile.html";
    });
  }
});