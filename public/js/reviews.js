// Retrieve reviews from your backend API and display them on the webpage.
async function loadAllReviews() {
  const container = document.getElementById('reviews-container');

  if (!container) {
    console.warn("Reviews container element not found.");
    return;
  }

  // GET /api/reviews — handled by routes/reviews.js
  try {
    const response = await fetch("/api/reviews");                                 

    if (!response.ok) {
      throw new Error(`Failed to fetch reviews (status ${response.status})`);
    }

    // [] is a fallback value that represents “there are zero reviews”
    const data = await response.json();
    const reviews = data.items || [];                                       

    if (reviews.length === 0) {
      container.textContent = 'No reviews found.';
      return;
    }

    // Clear existing content before displaying the reviews
    container.innerHTML = '';                                              

    reviews.forEach(function (review) {
      const reviewDiv = document.createElement('div');
      reviewDiv.className = 'review';

      const productName = review.product_name || "Unknown product name";
            
      // Convert the database timestamps into JavaScript Date objects
      const createdAt = review.created_at ? new Date(review.created_at) : null;
      const updatedAt = review.updated_at ? new Date(review.updated_at) : null;

      // Format the review's creation date for display
      const createdDate = createdAt ? createdAt.toLocaleDateString() : "Unknown date";

      // Only show an updated date if the review was actually modified
      const showUpdated = 
        updatedAt && 
        createdAt && 
        updatedAt.getTime() !== createdAt.getTime();

      // Format the updated date only when an update occurred
      const updatedDate = showUpdated ? updatedAt.toLocaleDateString() : null;

      // Product name
      const productHeading = document.createElement("h3");
      productHeading.textContent = `Product: ${productName}`;

      // Comments link
      const commentContainer = document.createElement("p");
      commentContainer.className = "comment-container";

      const commentLink = document.createElement("a");
      commentLink.href = `comments.html?reviewId=${review.review_id}`;
      commentLink.textContent = "💬 Comments";

      commentContainer.appendChild(commentLink);

      // Review author
      const authorParagraph = document.createElement("p");
      authorParagraph.textContent = `By: ${review.user_name || "Anonymous"}`;

      // Rating
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

      // Review text
      const reviewParagraph = document.createElement("p");
      reviewParagraph.className = "review-body";
      reviewParagraph.textContent = review.review || "No review provided";

      // Created date
      const createdParagraph = document.createElement("p");
      createdParagraph.textContent = `Created: ${createdDate}`;

      reviewDiv.appendChild(productHeading);
      reviewDiv.appendChild(commentContainer);
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

      container.appendChild(reviewDiv);
    });

  } catch (err) {
    console.error("Error loading reviews:", err);
    container.innerHTML = '<p class="error">Error loading reviews. Please try again later.</p>';
  }
}

// Submit a new review to the backend API
async function submitReview(event) {
  event.preventDefault();

  // Get the review form fields
  const productSelect = document.getElementById("product-select");
  const ratingInput = document.getElementById("rating");
  const reviewInput = document.getElementById("review");

  // Stop if any required review form fields are missing
  if (!productSelect || !ratingInput || !reviewInput) {
    console.error("One or more review form fields were not found.");
    return;
  }

   // Get and normalize the values entered in the review form
  const product_id = Number(productSelect.value);
  const rating = Number(ratingInput.value);
  const review = reviewInput.value.trim();

  // Retrieve the logged-in user's authentication token
  const token = getToken();

  // Require the user to be logged in before submitting a review
  if (!token) {
    alert("You must be logged in to submit a review.");
    window.location.href = "account-login.html";
    return;
  }

  try {
    // POST /api/reviews — handled by routes/reviews.js
    const response = await fetch("/api/reviews", {                                
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        product_id,
        rating,
        review
      })
    });
  
    // Safely parse the API response as JSON
    const data = await safeJson(response);

    if (!response.ok) {
      // Show the API error message, or use a fallback if none was returned
      const message = data?.error || "Failed to submit review.";
      alert(message);
      return;
    }

    alert("Review submitted successfully.");

     // Clear the form fields after a successful submission
    document.getElementById("reviewForm").reset();                    

  } catch (err) {
    console.error("Review submission failed:", err);
    alert("Network error. Please try again");
  }
}

// Update an existing review's rating, review text, or both
async function updateReview(reviewId, rating, review) {
  const id = Number(reviewId);

  // Reject invalid review IDs that are not positive whole numbers
  if (!Number.isInteger(id) || id <= 0) {
    alert("Invalid review id");
    return;
  }

  // Build the PATCH request body with only the fields being updated
  const body = {};

  // Add the rating to the request body only if a rating was provided
  if (rating !== undefined && rating !== "") {
    const numericRating = Number(rating);

    if (
      !Number.isInteger(numericRating) ||
      numericRating < 1 ||
      numericRating > 5
    ) {
      alert("Rating must be a whole number between 1 and 5.");
      return;
    }

    body.rating = numericRating;
  }

  // Validate and add the review text only if it was provided
  if (typeof review === "string") {
    const trimmedReview = review.trim();

    if (trimmedReview.length === 0) {
      alert("Review cannot be empty.");
      return;
    }

    body.review = trimmedReview;
  }

  // Stop if there are no fields to update
  if (body.rating === undefined && body.review === undefined) {
    alert("No changes to update");
    return;
  }

  try {
    // PATCH /api/reviews/:id — handled by routes/reviews.js
    const response = await fetch(`/api/reviews/${id}`, {                              
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(body)
    });

    // Safely parse the API response as JSON
    const data = await safeJson(response);

    if (!response.ok) {
      alert(data?.error || "Failed to update review");
      return;
    }

    alert("Review updated successfully");

    // Refresh the displayed reviews if they are shown on this page
    await loadAllReviews();

  } catch (err) {
    console.error("Update failed:", err);
    alert("Network error. Please try again.");
  }
}

// Delete an existing review by its review ID
async function deleteReview(reviewId) {
  const id = Number(reviewId);

  // Reject review IDs that are not positive whole numbers
  if (!Number.isInteger(id) || id <= 0) {
    alert("Invalid review id.");
    return;
  }

  // Ask the user to confirm before permanently deleting the review
  if (!confirm("Are you sure you want to delete this review?")) {            
    return;
  }

  try {
    // DELETE /api/reviews/:id — handled by routes/reviews.js
    const response = await fetch(`/api/reviews/${id}`, {                             
      method: "DELETE",
      headers: getAuthHeaders(),
    });
  
    // Safely parse the API response as JSON
    const data = await safeJson(response);

    // Show the API error message, or use a fallback if none was returned
    if (!response.ok) {
      alert(data?.error || "Failed to delete review");
      return;
    }

    alert("Review deleted successfully.");

    // Refresh the reviews list so the deleted review disappears from the page
    await loadAllReviews();

  } catch (err) {
    console.error("Delete failed:", err);
    alert("Network error. Please try again.");
  }
}

// Run submitReview() when the review form is submitted
const reviewForm = document.getElementById("reviewForm");

if (reviewForm) {
  reviewForm.addEventListener("submit", submitReview);
}

// Load and display reviews only if this page contains the reviews container
const reviewContainer = document.getElementById("reviews-container");

if (reviewContainer) {
  loadAllReviews();
}
