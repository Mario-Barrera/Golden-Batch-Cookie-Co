async function renderReviewInstructions() {
  const reviewMessage = document.getElementById("review-message");
  const loginMessage = document.getElementById("login-message");
  const reviewGuidance = document.getElementById("review-guidance");

  if (!reviewMessage || !loginMessage || !reviewGuidance) {
    return;
  }

  try {
    const token = localStorage.getItem("token");

    if (!token) {
      throw new Error("No token found");
    }

    const response = await fetch("/api/user-status", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Unable to fetch user status");
    }

    const data = await response.json();

    if (!data.loggedIn) {
      throw new Error("User not logged in");
    }

    reviewMessage.textContent = "We value our customers’ feedback. Read what they have to say about our products and services.";

    loginMessage.style.display = "none";
    reviewGuidance.style.display = "none";

  } catch (err) {
    console.error("Render Review Instructions Error:", err);

    reviewMessage.textContent =
      "We value our customers’ feedback. Read what they have to say about our products and services. If you’re a registered user, feel free to share your own experience.";

    loginMessage.style.display = "block";
    reviewGuidance.style.display = "block";
  }
}

document.addEventListener("DOMContentLoaded", function () {
  renderReviewInstructions();
});