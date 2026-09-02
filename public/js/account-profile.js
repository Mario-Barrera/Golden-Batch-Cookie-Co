// passes the value of data.user into the function by using the parameter 'user'
function populateProfileDisplay(user) {
  if (!user) {
    return;
  }

  const profileName = document.getElementById("profile-name");
  const profileEmail = document.getElementById("profile-email");
  const profilePhone = document.getElementById("profile-phone");
  
  // empty string "" is used as a fallback value so the page does not display undefined, null, 
  // or another unwanted value if user.name is missing.
  if (profileName) {
    profileName.textContent = user.name || "";
  }

  if (profileEmail) {
    profileEmail.textContent = user.email || "";
  }

  if (profilePhone) {
    profilePhone.textContent = user.phone || "";
  }
}

function populateProfileForm(user) {
  if (!user) {
    return;
  }

  const manageForm = document.getElementById("manageProfileForm");

  if (!manageForm) {
    return;
  }

  // firstName is first element
  // ...rest is the remaining elements
  // rest operator collects all remaining elements from an array into a new array
  const [firstName, ...rest] = (user.name || "").trim().split(" ");
  const lastName = rest.join(" ");

  const firstNameInput = document.getElementById("first-name");
  const lastNameInput = document.getElementById("last-name");
  const emailInput = document.getElementById("email");
  const phoneInput = document.getElementById("phone");

  if (firstNameInput) {
    firstNameInput.value = firstName || "";
  }

  if (lastNameInput) {
    lastNameInput.value = lastName || "";
  }

  if (emailInput) {
    emailInput.value = user.email || "";
  }

  if (phoneInput) {
    phoneInput.value = user.phone || "";
  }
}

async function loadUserProfile() {
  const token = getToken();

  if (!token) {
    console.error("No token found. User is not logged in.");
    window.location.href = "login.html";
    return;
  }

  try {
    const response = await fetch("/api/auth/me", {                        // associated code: routes/auth.js  lines 122 - 135
      method: "GET",
      headers: getAuthHeaders()
    });

    const data = await safeJson(response);

    if (!response.ok) {
      const message = data?.error || `Failed to load profile (status ${response.status}).`;
      console.error("Profile load failed:", message, data);

      if (response.status === 401) {                                              // 401 — Unauthorized
        alert("Your session has expired. Please log in again.");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "login.html";
        return;
      }

      alert(message);
      return;
    }

    const user = data?.user;

    if (!user) {
      console.error("Profile response missing user object:", data);
      alert("Unexpected user response. Please try again.");
      return;
    }

    populateProfileDisplay(user);
    populateProfileForm(user);

  } catch (err) {
    console.error("Failed to load user profile:", err);
    alert("Network error. Please try again.");
  }
}

async function loadUserReviews() {
  const container = document.getElementById("profile-reviews");
  const token = getToken();

  if (!container) {
    return;
  }

  if (!token) {
    container.textContent = "You must be logged in to view your reviews.";
    return;
  }

  try {
    const response = await fetch("/api/reviews/me", {
      method: "GET",
      headers: getAuthHeaders()
    });

    const data = await safeJson(response);
    const reviews = data?.items || [];

    if (!response.ok) {
      throw new Error(data?.error || "Failed to load your reviews.");
    }

    if (reviews.length === 0) {
      container.textContent = "You have not written any reviews yet.";
      return;
    }

    container.innerHTML = "";

    reviews.forEach(function (review) {
      const reviewDiv = document.createElement("div");
      reviewDiv.className = "review";

      // performing data sanitization and validation
      const rating = Number(review.rating) || 0;
      const safeRating = Math.max(0, Math.min(5, rating));

      const createdAt = review.created_at ? new Date(review.created_at) : null;
      const createdDate = 
        createdAt && !Number.isNaN(createdAt.getTime())                                   // check if createdAt is a valid data
          ? createdAt.toLocaleDateString()
          : "Unknown date";

      reviewDiv.innerHTML = `
        <h3>Product: ${review.product_name || "Unknown product"}</h3>
        <p>
          <span class="filled-stars">${"★".repeat(safeRating || 0)}</span>
          <span class="empty-stars">${"☆".repeat(5 - (safeRating || 0))}</span>
        </p>
        <p>${review.review || "No review provided."}</p>
        <p>Created: ${createdDate}</p>
        <p><a href="comments.html?reviewId=${review.review_id}">View Comments</a></p>
      `;

      container.appendChild(reviewDiv);
    });

  } catch(err) {
    console.error("Error loading user reviews:", err);
    container.innerHTML = `<p class="error">${err.message}</p>`;
  }
}

async function changePassword(event) {
  event.preventDefault();

  const currentPasswordInput = document.getElementById("current-password");
  const newPasswordInput = document.getElementById("new-password");

  const currentPassword = currentPasswordInput ? currentPasswordInput.value : "";
  const newPassword = newPasswordInput ? newPasswordInput.value : "";

  try {
    const response = await fetch("/api/users/me/password", {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        currentPassword,
        newPassword
      })
    });
    
    const data = await safeJson(response);
    
    if (!response.ok) {
      const message = data?.error || "Failed to update password";
      alert(message);
      return;
    }

    alert("Password updated successfully");

    if (currentPasswordInput) {
      currentPasswordInput.value = "";
    } 

    if (newPasswordInput) {
      newPasswordInput.value = "";
    }

  } catch (err) {
    console.error("Password update failed:", err);
    alert("Network error. Please try again.");
  }
}

// fetches the user data from the backend, this data is displayed on the account profile page
document.addEventListener("DOMContentLoaded", async function() {

  loadUserProfile();
  loadUserReviews();
  
  const changePasswordForm = document.getElementById("changePasswordForm");

  if (changePasswordForm) {
    changePasswordForm.addEventListener("submit", changePassword);
  }
});