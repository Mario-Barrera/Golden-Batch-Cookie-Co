// Get the review form elements.
const reviewForm = document.getElementById("review-form");
const productSelect = document.getElementById("product-select");
const ratingSelect = document.getElementById("rating");
const reviewInput = document.getElementById("review");
const reviewFormMessage = document.getElementById("review-form-message");
const submitReviewBtn = document.getElementById("submit-review-btn");

const reviewFormTitle = document.getElementById("review-form-title");
const reviewFormDescription = document.getElementById(
  "review-form-description",
);

// Check whether the page was opened to edit an existing review.
const urlParams = new URLSearchParams(window.location.search);
const reviewIdParam = urlParams.get("reviewId");

const editReviewId = reviewIdParam ? Number(reviewIdParam) : null;

const isEditMode = Number.isInteger(editReviewId) && editReviewId > 0;

// ---------------- HELPER FUNCTIONS ------------------

// Display a message underneath the review form.
function showReviewFormMessage(message) {
  if (!reviewFormMessage) {
    return;
  }

  reviewFormMessage.textContent = message;
}

// ---------------- PRODUCT LOADING ------------------

// Retrieve the available cookie products from the backend.
async function loadProducts() {
  if (!productSelect) {
    console.warn("Product select element not found.");
    return;
  }

  try {
    // GET /api/products - retrieve products from PostgreSQL.
    const response = await fetch("/api/products");

    if (!response.ok) {
      throw new Error(`Failed to fetch products (status ${response.status})`);
    }

    const data = await response.json();

    // Support either:
    // { products: [...] }
    // or a direct array: [...]
    const products = data.products || data;

    if (!Array.isArray(products) || products.length === 0) {
      showReviewFormMessage("No products are currently available.");
      return;
    }

    products.forEach(function (product) {
      const option = document.createElement("option");

      option.value = product.product_id;
      option.textContent = product.name;

      productSelect.appendChild(option);
    });
  } catch (err) {
    console.error("Error loading products:", err);

    showReviewFormMessage("Unable to load products. Please try again later.");
  }
}

// ---------------- LOAD REVIEW FOR EDITING ------------------

// Retrieve an existing review and place its values into the form.
async function loadReviewForEditing(reviewId) {
  try {
    // GET /api/reviews/:reviewId - handled by routes/reviews.js.
    const response = await fetch(`/api/reviews/${reviewId}`);

    const data = await response.json();

    if (!response.ok) {
      showReviewFormMessage(
        data.error || data.message || "Unable to load this review.",
      );
      return;
    }

    // Change the page heading and button for Edit mode.
    if (reviewFormTitle) {
      reviewFormTitle.textContent = "Edit Review";
    }

    if (reviewFormDescription) {
      reviewFormDescription.textContent = "Update your rating or review below.";
    }

    if (submitReviewBtn) {
      submitReviewBtn.textContent = "Save Changes";
    }

    // Fill the form with the existing review information.
    productSelect.value = String(data.product_id);
    ratingSelect.value = String(data.rating);
    reviewInput.value = data.review || "";

    // Do not allow the product to be changed when editing.
    productSelect.disabled = true;
  } catch (err) {
    console.error("Error loading review:", err);

    showReviewFormMessage("Unable to load this review. Please try again.");
  }
}

// ---------------- REVIEW SUBMISSION ------------------

// Submit a new review to the backend.
async function submitReview(event) {
  event.preventDefault();

  // Make sure all required form elements exist.
  if (!productSelect || !ratingSelect || !reviewInput || !submitReviewBtn) {
    console.error("One or more review form elements were not found.");
    return;
  }

  // Get the customer's form values.
  const productId = Number(productSelect.value);
  const rating = Number(ratingSelect.value);
  const review = reviewInput.value.trim();

  // Validate the selected product.
  if (!Number.isInteger(productId) || productId <= 0) {
    showReviewFormMessage("Please select a product.");
    return;
  }

  // Validate the rating.
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    showReviewFormMessage("Please select a rating between 1 and 5.");
    return;
  }

  // Validate the review text.
  if (review.length === 0) {
    showReviewFormMessage("Please enter a review.");
    return;
  }

  if (review.length > 1000) {
    showReviewFormMessage("Your review cannot exceed 1000 characters.");
    return;
  }

  // Prevent multiple submissions while the request is processing.
  submitReviewBtn.disabled = true;

  showReviewFormMessage(isEditMode ? "Saving your changes..." : "Submitting your review...");

  try {
    let response;

    // Update an existing review.
    if (isEditMode) {
      response = await fetch(`/api/reviews/${editReviewId}`, {
        method: "PATCH",
        headers: getAuthHeaders(),

        body: JSON.stringify({
          rating: rating,
          review: review,
        }),
      });

      // Create a new review.
    } else {
      response = await fetch("/api/reviews", {
        method: "POST",
        headers: getAuthHeaders(),

        body: JSON.stringify({
          product_id: productId,
          rating: rating,
          review: review,
        }),
      });
    }

    const data = await response.json();

    // Redirect to login if the token is missing, invalid, or expired.
    if (response.status === 401) {
      window.location.href = "account-login.html";
      return;
    }

    // Show an error message if the review request was unsuccessful.
    if (!response.ok) {
      showReviewFormMessage(
        data.error ||
        data.message ||
        (
          isEditMode
            ? "Unable to update your review."
            : "Unable to submit your review."
        )
      );

      submitReviewBtn.disabled = false;
      return;
    }

    // Review was successfully saved in PostgreSQL.
    showReviewFormMessage("Review submitted successfully.");

    // Return the customer to their My Reviews page.
    window.location.href = "my-reviews.html";

    } catch (err) {
      console.error("Review submission failed:", err);

      showReviewFormMessage(
        "Unable to submit your review. Please try again."
      );

      submitReviewBtn.disabled = false;
    }
  }

// ---------------- PAGE INITIALIZATION ------------------

async function initializeReviewForm() {

  // Require the customer to be logged in before using this page.
  if (!getToken()) {
    window.location.href = "account-login.html";
    return;
  }

  // Load the available products into the Product dropdown.
  await loadProducts();

  // If the page was opened from an Edit button,
  // load the existing review into the form.
  if (isEditMode) {
    await loadReviewForEditing(editReviewId);
  }

  // Submit the review when the customer submits the form.
  if (reviewForm) {
    reviewForm.addEventListener("submit", submitReview);
  }
}

// Initialize the review form when the page loads.
initializeReviewForm();