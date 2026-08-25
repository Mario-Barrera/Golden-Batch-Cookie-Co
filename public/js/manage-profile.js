// Password validation function
function validatePassword(password) {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecialChar = /[\W_]/.test(password); // non-word character or underscore

  if (password.length < minLength) {
    return `Password must be at least ${minLength} characters long.`;
  }

  if (!hasUpperCase) {
    return 'Password must contain at least one uppercase letter.';
  }

  if (!hasLowerCase) {
    return 'Password must contain at least one lowercase letter.';
  }

  if (!hasDigit) {
    return 'Password must contain at least one digit.';
  }
  
  if (!hasSpecialChar) {
    return 'Password must contain at least one special character.';
  }

  return null; // valid password
}

document.addEventListener("DOMContentLoaded", async function () {
  const form = document.getElementById("manageProfileForm");
  const cancelBtn = document.getElementById("cancelButton");
  const token = localStorage.getItem("token");

  const firstNameInput = document.getElementById("first-name");
  const lastNameInput = document.getElementById("last-name");
  const emailInput = document.getElementById("email");
  const phoneInput = document.getElementById("phone");
  const addressInput = document.getElementById("address");
  const passwordInput = document.getElementById("password");
  const passwordMessageDiv = document.getElementById("password-requirements");

  // Stop the script if the manage profile form cannot be found on the page
  if (!form) {
    console.error("Manage profile form not found.");
    return;
  }

  // Redirect the user to the login page if no authentication token is found
  if (!token) {
    alert("You must be logged in to manage your profile.");
    window.location.href = "account-login.html";
    return;
  }

  // Initially set to null; the user's profile data will be stored here after it is retrieved
  let originalUser = null;

  // Splits the user's full name into separate first-name and last-name values
  function splitName(fullName) {
    if (fullName === undefined || fullName === null) {
      fullName = "";
    }

    const parts = fullName.split(" ");
    return {
      firstName: parts[0] || "",
      lastName: parts.slice(1).join(" ")
    };
  }

  // Fills the manage profile form with the user's existing profile information
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

    if (addressInput) {
      addressInput.value = user.address || "";
    }

    if (passwordInput) {
      passwordInput.value = "";
    }
   
    // Clear any password validation message displayed in the manage-profile.html form
    if (passwordMessageDiv) {                                   
      passwordMessageDiv.textContent = "";
    }
  }

  // Validate the new password as the user types and display a red error message or green success message
  if (passwordInput && passwordMessageDiv) {
    passwordInput.addEventListener("input", function () {
      const password = passwordInput.value;

      if (!password) {
        passwordMessageDiv.textContent = "";
        passwordMessageDiv.style.color = "red";
        return;
      }

      const errorMessage = validatePassword(password);

      if (errorMessage) {
        passwordMessageDiv.textContent = errorMessage;
        passwordMessageDiv.style.color = "red";
      } else {
        passwordMessageDiv.textContent = "Password looks good.";
        passwordMessageDiv.style.color = "green";
      }
    });
  }

  // Retrieve the logged-in user's profile data from the server and populate the manage profile form
  try {
    // sends the JWT in the Authorization header
    const response = await fetch("/api/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`                                     
      }
    });

    // Convert the server's JSON response into a JavaScript object
    const data = await response.json();

    // If the request failed, throw an error using the server's message or a default message
    if (!response.ok) {
      throw new Error(data?.error || "Failed to load profile");
    }

    // Store the original user data for later comparison, then use it to populate the profile form
    originalUser = data.user;
    fillForm(data.user);
    
  } catch (err) {
    console.error("Error loading profile:", err);
    alert(err.message || "Failed to load profile.");
    return;
  }

  // Handle profile form submission, prevent the default page reload, and collect the user's updated input values
  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const firstName = firstNameInput.value.trim();
    const lastName = lastNameInput.value.trim();
    const name = `${firstName} ${lastName}`.trim();
    const email = emailInput.value.trim();
    const phone = phoneInput.value.trim();
    const address = addressInput.value.trim();
    const password = passwordInput.value;

    // Only validate the password if the user entered a new one
    if (password) {
      const passwordError = validatePassword(password);

      if (passwordError) {
        passwordMessageDiv.textContent = passwordError;
        passwordMessageDiv.style.color = "red";
        return;
      }
    }

    // Split the original user's full name into separate first-name and last-name values for comparison
    const originalName = splitName(originalUser.name);

    // Check whether the user changed any profile field or entered a new password
    const hasChanges = 
      firstName !== originalName.firstName ||
      lastName !== originalName.lastName ||
      email !== (originalUser.email || "") ||
      phone !== (originalUser.phone || "") ||
      address !== (originalUser.address || "") ||
      password !== "";

    if (!hasChanges) {
      alert("No changes made. Unable to update profile.");
      return;
    }

    // Create an object containing the profile information that will be sent to the server for updating
    const updateData = {
      name,
      email,
      phone,
      address
    };

     // adds the password field to the updateData object only if the user actually entered a password
    if (password) {                                          
      updateData.password = password;
    }

    try {
      // Send the updated profile data to the server using a PATCH request
      const response = await fetch("/api/users/me", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(updateData)
      });

      // Convert the server's updated user response from JSON into a JavaScript object
      const updatedUser = await response.json();

      if (!response.ok) {
        throw new Error(updatedUser?.error || "Failed to update profile.");
      }

      // user is a string there is because localStorage only stores strings
      const storedUser = localStorage.getItem("user");                                

      // Update the user data stored in localStorage with the latest profile information from the server
      // updateData is the outgoing data
      // updatedUser is the incoming updated data
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          parsedUser.name = updatedUser.name || updateData.name;
          parsedUser.email = updatedUser.email || updateData.email;
          parsedUser.phone = updatedUser.phone || updateData.phone;
          parsedUser.address = updatedUser.address || updateData.address;
          localStorage.setItem("user", JSON.stringify(parsedUser));  // converts a JavaScript object into a JSON string

        } catch (err) {
          console.warn("Could not update localStorage user:", err);
        }
      }

      alert("Profile updated successfully");
      window.location.href = "account-profile.html";
    
    } catch (err) {
      console.error("Error updating profile:", err);
      alert(err.message || "Failed to update profile. Please try again.");  
    }
  });

  // Redirect the user back to the account profile page when the Cancel button is clicked
  if (cancelBtn) {
    cancelBtn.addEventListener("click", function () {
      window.location.href = "account-profile.html";
    });
  }
});