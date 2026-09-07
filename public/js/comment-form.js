// ---------------- DOM ELEMENTS ------------------

const commentForm = document.getElementById("comment-form");
const commentInput = document.getElementById("comment");
const submitCommentBtn = document.getElementById("submit-comment-btn");


// ---------------- REVIEW ID ------------------

// Get the selected review ID from the URL.
const urlParams = new URLSearchParams(window.location.search);
const reviewId = Number(urlParams.get("reviewId"));


// ---------------- SUBMIT COMMENT ------------------

// Submit a new comment to the backend API.
async function submitComment(event) {
  event.preventDefault();

  // Require the user to be logged in.
  const token = getToken();

  if (!token) {
    alert("You must be logged in to leave a comment.");
    window.location.href = "account-login.html";
    return;
  }

  // Make sure the selected review ID is valid.
  if (!Number.isInteger(reviewId) || reviewId <= 0) {
    alert("Invalid review id.");
    return;
  }

  // Get and normalize the comment entered by the user.
  const comment = commentInput
    ? commentInput.value.trim()
    : "";

  if (!comment) {
    alert("Comment cannot be empty.");
    return;
  }

  if (comment.length > 1000) {
    alert("Comment must be 1000 characters or less.");
    return;
  }

  // Prevent multiple submissions while the request is processing.
  submitCommentBtn.disabled = true;

  try {
    // POST /api/comments — handled by routes/comments.js
    const response = await fetch("/api/comments", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        review_id: reviewId,
        comment: comment
      })
    });

    // Safely parse the backend response.
    const data = await safeJson(response);

    if (!response.ok) {
      const message =
        data?.error ||
        "Failed to submit comment.";

      alert(message);

      submitCommentBtn.disabled = false;
      return;
    }

    alert("Comment submitted successfully.");

    // After a successful comment, display the comments
    // associated with the selected review.
    window.location.href =
      `comments.html?reviewId=${reviewId}`;

  } catch (err) {
    console.error("Comment submission failed:", err);

    alert("Network error. Please try again.");

    submitCommentBtn.disabled = false;
  }
}


// ---------------- PAGE INITIALIZATION ------------------

// Only logged-in users should use this page.
if (!getToken()) {
  window.location.href = "account-login.html";

} else if (!Number.isInteger(reviewId) || reviewId <= 0) {
  alert("Invalid review id.");
  window.location.href = "select-review.html";

} else if (commentForm) {
  commentForm.addEventListener("submit", submitComment);
}