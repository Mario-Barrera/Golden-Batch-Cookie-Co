// Get the elements used to display the logged-in customer's reviews.
const myReviewsContainer = document.getElementById("my-reviews-container");
const noReviewsMessage = document.getElementById("no-reviews-message");

// ---------------- HELPER FUNCTIONS ------------------

// Convert a numeric rating into filled and empty stars.
function createRatingStars(rating) {
  const ratingParagraph = document.createElement("p");
  ratingParagraph.className = "rating";

  const numericRating = Number(rating) || 0;

  const filledStars = document.createElement("span");
  filledStars.className = "filled-stars";
  filledStars.textContent = "★".repeat(numericRating);

  const emptyStars = document.createElement("span");
  emptyStars.className = "empty-stars";
  emptyStars.textContent = "☆".repeat(5 - numericRating);

  ratingParagraph.appendChild(filledStars);
  ratingParagraph.appendChild(emptyStars);

  return ratingParagraph;
}

// Create one review card for the logged-in customer's review.
function createReviewCard(review) {
  const reviewCard = document.createElement("article");
  reviewCard.className = "my-review-card";

  // Store the review ID on the review card so it can be used later when editing or deleting this specific review.
  reviewCard.dataset.reviewId = review.review_id;

  // Product name
  const productHeading = document.createElement("h2");
  productHeading.className = "my-review-product";
  productHeading.textContent = review.product_name || "Unknown product";

  // Rating
  const ratingParagraph = createRatingStars(review.rating);

  // Review text
  const reviewParagraph = document.createElement("p");
  reviewParagraph.className = "my-review-body";
  reviewParagraph.textContent = review.review || "No review provided.";

  // Created date
  const createdParagraph = document.createElement("p");
  createdParagraph.className = "my-review-date";

  const createdAt = review.created_at ? new Date(review.created_at) : null;

  const createdDate =
    createdAt && !Number.isNaN(createdAt.getTime())
      ? createdAt.toLocaleDateString()
      : "Unknown date";

  createdParagraph.textContent = `Created: ${createdDate}`;

  // Container for the Edit and Delete buttons.
  const actionsContainer = document.createElement("div");
  actionsContainer.className = "review-actions";

  // Edit button
  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "edit-review-btn";
  editButton.dataset.reviewId = review.review_id;
  editButton.textContent = "Edit";

  // Open the review form in edit mode for this specific review.
  editButton.addEventListener("click", function () {
    window.location.href = `review-form.html?reviewId=${review.review_id}`;
  });

  // Delete button
  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "delete-review-btn";
  deleteButton.dataset.reviewId = review.review_id;
  deleteButton.textContent = "Delete";

  deleteButton.addEventListener("click", function () {
    deleteReview(review.review_id);
  });

  actionsContainer.appendChild(editButton);
  actionsContainer.appendChild(deleteButton);

  reviewCard.appendChild(productHeading);
  reviewCard.appendChild(ratingParagraph);
  reviewCard.appendChild(reviewParagraph);
  reviewCard.appendChild(createdParagraph);
  reviewCard.appendChild(actionsContainer);

  return reviewCard;
}

// Display all reviews belonging to the logged-in customer.
function displayMyReviews(reviews) {
  if (!myReviewsContainer || !noReviewsMessage) {
    return;
  }

  // Clear any previously displayed reviews.
  myReviewsContainer.innerHTML = "";

  // Show the empty-state message when the customer has no reviews.
  if (!Array.isArray(reviews) || reviews.length === 0) {
    noReviewsMessage.hidden = false;
    return;
  }

  // Hide the empty-state message when reviews exist.
  noReviewsMessage.hidden = true;

  reviews.forEach(function (review) {
    const reviewCard = createReviewCard(review);

    myReviewsContainer.appendChild(reviewCard);
  });
}

// ---------------- REVIEW LOADING ------------------

// Retrieve only the reviews belonging to the currently logged-in customer.
async function loadMyReviews() {
  if (!myReviewsContainer || !noReviewsMessage) {
    console.warn("My Reviews page elements were not found.");
    return;
  }

  // Require the customer to be logged in before viewing this page.
  const token = getToken();

  if (!token) {
    window.location.href = "account-login.html";
    return;
  }

  try {
    // GET /api/reviews/me — handled by routes/reviews.js
    const response = await fetch("/api/reviews/me", {
      method: "GET",
      headers: getAuthHeaders(),
    });

    // Redirect to login if the authentication token is invalid or expired.
    if (response.status === 401) {
      window.location.href = "account-login.html";
      return;
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch reviews (status ${response.status})`);
    }

    const data = await response.json();

    // The backend returns: { items: [...] }
    const reviews = data.items || [];

    displayMyReviews(reviews);
  } catch (err) {
    console.error("Error loading customer's reviews:", err);

    myReviewsContainer.innerHTML =
      '<p class="error">Unable to load your reviews. Please try again later.</p>';

    noReviewsMessage.hidden = true;
  }
}

// ---------------- REVIEW DELETION ------------------

// Delete one of the logged-in customer's reviews.
async function deleteReview(reviewId) {
  const id = Number(reviewId);

  // Make sure the review ID is valid.
  if (!Number.isInteger(id) || id <= 0) {
    alert("Invalid review ID.");
    return;
  }

  // Ask the customer to confirm before permanently deleting the review.
  const confirmed = confirm("Are you sure you want to delete this review?");

  if (!confirmed) {
    return;
  }

  try {
    // DELETE /api/reviews/:id - handled by routes/reviews.js
    const response = await fetch(`/api/reviews/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });

    // Redirect to login if the authentication token expired.
    if (response.status === 401) {
      window.location.href = "account-login.html";
      return;
    }

    const data = await response.json();

    if (!response.ok) {
      alert(data.error || data.message || "Unable to delete review.");
      return;
    }

    // Reload the customer's reviews so the deleted review disappears.
    await loadMyReviews();
  } catch (err) {
    console.error("Error deleting review:", err);

    alert("Unable to delete the review. Please try again.");
  }
}

// Load the logged-in customer's reviews when the page opens.
loadMyReviews();
