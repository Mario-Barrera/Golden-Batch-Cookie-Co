// Retrieve comments for a specific review and display them on the webpage
async function loadComments() {
  const container = document.getElementById("comment-container");

  if (!container) {
    console.warn("Comment container not found.");
    return;
  }

  try {
    // Get the review ID from the URL query parameter
    const params = new URLSearchParams(window.location.search);                              
    const reviewId = Number(params.get("reviewId"));                                            

    // Reject review IDs that are not positive whole numbers
    if (!Number.isInteger(reviewId) || reviewId <= 0) {
      container.textContent = "Invalid review.";
      return;
    }

     // Display the name of the user who wrote the original review
    await loadReviewHeading(reviewId);

     // GET /api/comments?review_id=:id — handled by routes/comments.js
    const response = await fetch(`/api/comments?review_id=${reviewId}`);                    

    if (!response.ok) {
      throw new Error("Failed to fetch comments");
    }

    // [] is a fallback value that represents “there are zero comments”
    const data = await response.json();
    const comments = data.items || [];

    if (comments.length === 0) {
      container.textContent = "No comments yet";
      return;
    }

    // Remove any existing comments before displaying the current comments
    container.replaceChildren();

    comments.forEach(function (comment) {
      const div = document.createElement("div");
      div.className = "comment";

      // Convert the database timestamp into a JavaScript Date object
      const createdAt = comment.created_at ? new Date(comment.created_at) : null;

      // Format the comment's creation date for display
      const createdDate = createdAt ? createdAt.toLocaleDateString() : "Unknown date";

      // Create the comment author's name
      const name = document.createElement("p");
      name.className = "comment-auth";
      name.textContent = `By: ${comment.user_name || "Anonymous"}`;

      // Create the comment body
      const body = document.createElement("p");
      body.className = "comment-body";
      body.textContent = comment.comment || "No comment provided";

      // Create the comment date
      const date = document.createElement("p");
      date.className = "comment-date";
      date.textContent = `Created: ${createdDate}`;

      // Add the comment elements to the comment container
      div.append(name, body, date);

      // Add the completed comment to the webpage
      container.appendChild(div);
    });

  } catch (err) {
    console.error("Failed to load comments:", err);
    container.textContent = "Error loading comments.";
  }
}

// Retrieve the original review and display the review author's name in the heading
async function loadReviewHeading(reviewId) {
  const heading = document.getElementById("comments-heading");

  if (!heading) {
    return;
  }

  // Reject review IDs that are not positive whole numbers
  const id = Number(reviewId);

  if (!Number.isInteger(id) || id <= 0) {
    return;
  }

  try {
    // GET /api/reviews/:id — handled by routes/reviews.js
    const response = await fetch(`/api/reviews/${id}`);

    if (!response.ok) {
      throw new Error("Failed to fetch review");
    }

    const review = await response.json();

    // Use a fallback name if the review author is unavailable
    const userName = review.user_name || "Anonymous";

    heading.textContent = `Comments on ${userName}'s Review`;

  } catch (err) {
    console.error("Failed to load review heading:", err);
  }
}

// Submit a new comment to the backend API
async function submitComment(event) {
  event.preventDefault();

  // Retrieve the logged-in user's authentication token
  const token = getToken();

  // Require the user to be logged in before submitting a comment
  if (!token) {
    alert("You must be logged in to leave a comment.");
    window.location.href = "account-login.html";
    return;
  }

  // Get the review ID from the URL query parameter
  const params = new URLSearchParams(window.location.search);
  const reviewId = Number(params.get("reviewId"));

  // Reject review IDs that are not positive whole numbers
  if (!Number.isInteger(reviewId) || reviewId <= 0) {
    alert("Invalid review id.");
    return;
  }
  
  // Get and normalize the comment entered by the user
  const commentInput = document.getElementById("comment");
  const comment = commentInput ? commentInput.value.trim() : "";

  if (!comment) {
    alert("Comment cannot be empty.");
    return;
  }

  try {
    // POST /api/comments — handled by routes/comments.js
    const response = await fetch("/api/comments", {                                  
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        review_id: reviewId,
        comment
      })
    });

    // Safely parse the API response as JSON
    const data = await safeJson(response);

    if (!response.ok) {
      const message = data?.error || "Failed to submit comment.";
      alert(message);
      return;
    }

    alert("Comment submitted successfully.");

    // Clear the form after a successful submission
    const commentForm = document.getElementById("commentForm");

    if (commentForm) {
      commentForm.reset();
    }

    // Refresh the displayed comments
    await loadComments();

  } catch (err) {
    console.error("Comment submission failed:", err);
    alert("Network error. Please try again.");
  }
}

// Update an existing comment
async function updateComment(commentId, commentText) {
  const id = Number(commentId);

  // Reject comment IDs that are not positive whole numbers
  if (!Number.isInteger(id) || id <= 0) {
    alert("Invalid comment id");
    return;
  }

  // Make sure the supplied comment is a string before using trim()
  if (typeof commentText !== "string") {
    alert("Invalid comment.");
    return;
  }

  // Remove unnecessary whitespace from the beginning and end
  const comment = commentText.trim();

  if (!comment) {
    alert("Comment cannot be empty.");
    return;
  }

  try {
    // PATCH /api/comments/:id — handled by routes/comments.js
    const response = await fetch(`/api/comments/${id}`, {                                 
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        comment
      })
    });

    // Safely parse the API response as JSON
    const data = await safeJson(response);

    if (!response.ok) {
      const message = data?.error || "Failed to update comment";
      alert(message);
      return;
    }

    alert("Comment updated successfully.");

    // Refresh the displayed comments
    await loadComments();
    
  } catch (err) {
    console.error("Comment update failed:", err);
    alert("Network error. Please try again.");
  }
}

// Delete an existing comment by its comment ID
async function deleteComment(commentId) {
  const id = Number(commentId);

  // Reject comment IDs that are not positive whole numbers
  if (!Number.isInteger(id) || id <= 0) {
    alert("Invalid comment ID.");
    return;
  }

  // Ask the user to confirm before permanently deleting the comment
  if (!confirm("Are you sure you want to delete this comment?")) {
    return;
  }

  try {
    // DELETE /api/comments/:id — handled by routes/comments.js
    const response = await fetch(`/api/comments/${id}`, {                               
      method: "DELETE",               
      headers: getAuthHeaders()
    });

    // Safely parse the API response as JSON
    const data = await safeJson(response);

    if (!response.ok) {
      const message = data?.error || "Failed to delete comment.";
      alert(message);
      return;
    }

    alert("Comment deleted successfully.");

    // Refresh the displayed comments so the deleted comment disappears
    await loadComments();

  } catch (err) {
    console.error("Comment delete failed:", err);
    alert("Network error. Please try again.");
  }
}

// Run submitComment() when the comment form is submitted
const commentForm = document.getElementById("commentForm");

if (commentForm) {
  commentForm.addEventListener("submit", submitComment);
}

// Load and display comments only if this page contains the comment container
const commentContainer = document.getElementById("comment-container");

if (commentContainer) {
  loadComments();
}