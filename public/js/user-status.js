document.addEventListener("DOMContentLoaded", function () {
  const accountLink = document.getElementById("account-login-link");
  const logoutBtn = document.getElementById("logout");

  const loginMessage = document.getElementById("login-message");
  const reviewGuidance = document.getElementById("review-guidance");

  initializeUserStatus(); // this runs the setup function

  // Function to update link based on login status
  async function initializeUserStatus() {
    await updateAccountLink();
    updateReviewMessages();

    if (logoutBtn) {
      logoutBtn.addEventListener("click", handleLogout); // handleLogout is the event handler function that runs when the logout button is clicked
    }
  }

  async function updateAccountLink() {
    if (!accountLink) return;

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        accountLink.href = "account-login.html";
        accountLink.innerHTML = '<i class="fa-solid fa-circle-user"></i> Login';
        return;
      }

      const response = await fetch("/api/user-status", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch user status: ${response.status}`);
      }

      const data = await response.json();

      if (data.loggedIn) {
        accountLink.href = "account-profile.html";
        accountLink.innerHTML =
          '<i class="fa-solid fa-circle-user"></i> My Profile';
      } else {
        accountLink.href = "account-login.html";
        accountLink.innerHTML = '<i class="fa-solid fa-circle-user"></i> Login';
      }
    } catch (err) {
      console.error("Error checking login status:", err);
      accountLink.href = "account-login.html";
      accountLink.innerHTML = `<i class="fa-solid fa-circle-user"></i> Login`;
    }
  }

  function updateReviewMessages() {
    const token = getToken();

    if (token) {
      // Logged-in users do not need the login/register message
      if (loginMessage) {
        loginMessage.style.display = "none";
      }

      // Logged-in users can manage reviews from their Profile page
      if (reviewGuidance) {
        reviewGuidance.style.display = "block";
      }
    } else {
      // Logged-out users need the login/register instructions
      if (loginMessage) {
        loginMessage.style.display = "block";
      }

      // Hide Profile instructions until the user is logged in
      if (reviewGuidance) {
        reviewGuidance.style.display = "none";
      }
    }
  }

  async function handleLogout(event) {
    event.preventDefault();

    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/";
  }
});
