// ---------------- DOM ELEMENTS ------------------

const myCommentsContainer = document.getElementById("my-comments-container");

const noCommentsMessage = document.getElementById("no-comments-message");


// ---------------- LOAD MY COMMENTS ------------------

// Retrieve all comments submitted by the logged-in user.
async function loadMyComments() {

  if (!myCommentsContainer) {
    console.warn("My comments container not found.");
    return;
  }

  try {
    // GET /api/comments/me — handled by routes/comments.js
    const response = await fetch("/api/comments/me", {
      headers: getAuthHeaders()
    });

    // Redirect to login if the user is not authenticated.
    if (response.status === 401) {
      window.location.href = "account-login.html";
      return;
    }

    const data = await safeJson(response);

    if (!response.ok) {
      throw new Error(
        data?.error || "Failed to load comments."
      );
    }

    const comments = data.items || [];

    // Clear any existing comments before rendering.
    myCommentsContainer.replaceChildren();

    // Show the empty-state message if the user has no comments.
    if (comments.length === 0) {

      if (noCommentsMessage) {
        noCommentsMessage.hidden = false;
      }

      return;
    }

    // Hide the empty-state message when comments exist.
    if (noCommentsMessage) {
      noCommentsMessage.hidden = true;
    }

    comments.forEach(function (comment) {

      // ---------------- COMMENT CARD ------------------

      const commentCard = document.createElement("div");

      commentCard.className = "my-comment-card";


      // ---------------- PRODUCT NAME ------------------

      const productHeading = document.createElement("h3");

      productHeading.textContent = `Product: ${comment.product_name || "Unknown product"}`;


      // ---------------- ORIGINAL REVIEW ------------------

      const reviewLabel = document.createElement("p");

      reviewLabel.className = "review-label";
      reviewLabel.textContent = "Original Review:";

      const reviewText = document.createElement("p");

      reviewText.className = "original-review";

      reviewText.textContent = comment.review_text || "Review unavailable.";


      // ---------------- USER'S COMMENT ------------------

      const commentLabel =
        document.createElement("p");

      commentLabel.className = "comment-label";
      commentLabel.textContent = "Your Comment:";

      const commentText = document.createElement("p");

      commentText.className = "comment-body";

      commentText.textContent = comment.comment || "No comment provided.";


      // ---------------- CREATED DATE ------------------

      const createdAt = comment.created_at
        ? new Date(comment.created_at)
        : null;

      const createdDate = createdAt
        ? createdAt.toLocaleDateString()
        : "Unknown date";

      const createdParagraph = document.createElement("p");

      createdParagraph.className = "comment-date";

      createdParagraph.textContent = `Created: ${createdDate}`;


      // ---------------- ACTION BUTTONS ------------------

      const actionContainer = document.createElement("div");

      actionContainer.className = "comment-actions";


      // Edit button
      const editButton = document.createElement("button");

      editButton.type = "button";
      editButton.className = "edit-comment-btn";
      editButton.textContent = "Edit";

      editButton.addEventListener("click", function () {
        window.location.href =
          `edit-comment.html?commentId=${comment.comment_id}`;
      });


      // Delete button
      const deleteButton = document.createElement("button");

      deleteButton.type = "button";
      deleteButton.className = "delete-comment-btn";
      deleteButton.textContent = "Delete";

      deleteButton.addEventListener("click", function () {
        deleteComment(comment.comment_id);
      });


      actionContainer.appendChild(editButton);
      actionContainer.appendChild(deleteButton);


      // ---------------- BUILD COMMENT CARD ------------------

      commentCard.appendChild(productHeading);

      commentCard.appendChild(reviewLabel);
      commentCard.appendChild(reviewText);

      commentCard.appendChild(commentLabel);
      commentCard.appendChild(commentText);

      commentCard.appendChild(createdParagraph);
      commentCard.appendChild(actionContainer);

      myCommentsContainer.appendChild(commentCard);
    });

  } catch (err) {
    console.error("Error loading comments:", err);

    myCommentsContainer.textContent =
      "Unable to load your comments.";
  }
}


// ---------------- DELETE COMMENT ------------------

async function deleteComment(commentId) {

  const id = Number(commentId);

  if (!Number.isInteger(id) || id <= 0) {
    alert("Invalid comment ID.");
    return;
  }

  const confirmed = confirm("Are you sure you want to delete this comment?");

  if (!confirmed) {
    return;
  }

  try {
    // DELETE /api/comments/:id — handled by routes/comments.js
    const response = await fetch(`/api/comments/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders()
    });

    if (response.status === 401) {
      window.location.href = "account-login.html";
      return;
    }

    const data = await safeJson(response);

    if (!response.ok) {
      alert(
        data?.error ||
        data?.message ||
        "Unable to delete comment."
      );

      return;
    }

    alert("Comment deleted successfully.");

    // Reload the page's comment list.
    await loadMyComments();

  } catch (err) {
    console.error("Error deleting comment:", err);

    alert(
      "Unable to delete the comment. Please try again."
    );
  }
}


// ---------------- PAGE INITIALIZATION ------------------

// This page is only available to logged-in users.
if (!getToken()) {
  window.location.href = "account-login.html";

} else {
  loadMyComments();
}