// ------------ HELPER FUNCTION ------------

// Retrieve the logged-in user's ID from localStorage.
function getCurrentUserId() {
  const storedUser = localStorage.getItem("user");

  if (!storedUser) {
    return null;
  }

  try {
    const user = JSON.parse(storedUser);
    const userId = Number(user.user_id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return null;
    }

    return userId;
  } catch (err) {
    console.error("Unable to read stored user:", err);
    return null;
  }
}

// Retrieve existing customer reviews from the backend API
// and display them so the logged-in user can select one to comment on.
async function loadAllReviews() {
  const container = document.getElementById("reviews-container");

  if (!container) {
    console.warn("Reviews container element not found.");
    return;
  }

  try {
    // GET /api/reviews — handled by routes/reviews.js
    const response = await fetch("/api/reviews");

    if (!response.ok) {
      throw new Error(`Failed to fetch reviews (status ${response.status})`);
    }

    // [] is a fallback value that represents zero reviews.
    const data = await response.json();
    const reviews = data.items || [];
    const currentUserId = getCurrentUserId();

    if (reviews.length === 0) {
      container.textContent = "No reviews found.";
      return;
    }

    // Clear existing content before displaying the reviews.
    container.textContent = "";

    reviews.forEach(function (review) {
      const reviewDiv = document.createElement("div");
      reviewDiv.className = "review";

      const productName = review.product_name || "Unknown product name";

      // Convert database timestamps into JavaScript Date objects.
      const createdAt = review.created_at ? new Date(review.created_at) : null;

      const updatedAt = review.updated_at ? new Date(review.updated_at) : null;

      // Format the review's creation date for display.
      const createdDate = createdAt
        ? createdAt.toLocaleDateString()
        : "Unknown date";

      // Only show an updated date if the review was actually modified.
      const showUpdated =
        updatedAt && createdAt && updatedAt.getTime() !== createdAt.getTime();

      const updatedDate = showUpdated ? updatedAt.toLocaleDateString() : null;

      // ---------------- PRODUCT NAME ------------------

      const productHeading = document.createElement("h3");
      productHeading.textContent = `Product: ${productName}`;

      // ---------------- REVIEW AUTHOR ------------------

      const authorParagraph = document.createElement("p");

      authorParagraph.textContent = `By: ${review.user_name || "Anonymous"}`;

      // ---------------- RATING ------------------

      const ratingParagraph = document.createElement("p");
      ratingParagraph.className = "rating";

      const filledStars = document.createElement("span");
      filledStars.className = "filled-stars";

      filledStars.textContent = "★".repeat(review.rating || 0);

      const emptyStars = document.createElement("span");
      emptyStars.className = "empty-stars";

      emptyStars.textContent = "☆".repeat(5 - (review.rating || 0));

      ratingParagraph.appendChild(filledStars);
      ratingParagraph.appendChild(emptyStars);

      // ---------------- REVIEW TEXT ------------------

      const reviewParagraph = document.createElement("p");
      reviewParagraph.className = "review-body";

      reviewParagraph.textContent = review.review || "No review provided";

      // ---------------- CREATED DATE ------------------

      const createdParagraph = document.createElement("p");

      createdParagraph.textContent = `Created: ${createdDate}`;

      // ---------------- COMMENT ACTION ------------------

      const commentActionContainer = document.createElement("p");

      commentActionContainer.className = "comment-action-container";

      const reviewUserId = Number(review.user_id);

      // Do not allow the logged-in user to comment on their own review.
      if (reviewUserId === currentUserId) {
        const ownReviewText = document.createElement("span");

        ownReviewText.className = "own-review-label";
        ownReviewText.textContent = "Your Review";

        commentActionContainer.appendChild(ownReviewText);
      } else {
        const writeCommentLink = document.createElement("a");

        writeCommentLink.className = "write-comment-link";

        writeCommentLink.href = `comment-form.html?reviewId=${review.review_id}`;

        writeCommentLink.textContent = "Write a Comment";

        commentActionContainer.appendChild(writeCommentLink);
      }

      // ---------------- BUILD REVIEW CARD ------------------

      reviewDiv.appendChild(productHeading);
      reviewDiv.appendChild(authorParagraph);
      reviewDiv.appendChild(ratingParagraph);
      reviewDiv.appendChild(reviewParagraph);
      reviewDiv.appendChild(createdParagraph);

      // Updated date
      if (updatedDate) {
        const updatedParagraph = document.createElement("p");

        updatedParagraph.textContent = `Updated: ${updatedDate}`;

        reviewDiv.appendChild(updatedParagraph);
      }

      reviewDiv.appendChild(commentActionContainer);

      container.appendChild(reviewDiv);
    });
  } catch (err) {
    console.error("Error loading reviews:", err);

    container.textContent = "Error loading reviews. Please try again later.";
  }
}

// ---------------- PAGE INITIALIZATION ------------------

// This page is only for logged-in users.
if (!getToken()) {
  window.location.href = "account-login.html";
} else {
  const reviewContainer = document.getElementById("reviews-container");

  if (reviewContainer) {
    loadAllReviews();
  }
}
