// ---------------- DOM ELEMENTS ------------------

const editCommentForm =
  document.getElementById("edit-comment-form");

const commentInput =
  document.getElementById("comment");

const editCommentMessage =
  document.getElementById("edit-comment-message");

const saveCommentBtn =
  document.getElementById("save-comment-btn");


// ---------------- COMMENT ID ------------------

// Get the comment ID from the URL.
const urlParams =
  new URLSearchParams(window.location.search);

const commentId =
  Number(urlParams.get("commentId"));


// ---------------- FORM MESSAGE ------------------

// Display a message on the edit comment form.
function showEditCommentMessage(message) {
  if (editCommentMessage) {
    editCommentMessage.textContent = message;
  }
}


// ---------------- LOAD COMMENT ------------------

// Retrieve the logged-in user's comments and find
// the specific comment selected for editing.
async function loadCommentForEditing() {

  if (!commentInput) {
    console.warn("Comment textarea not found.");
    return;
  }

  // Reject invalid comment IDs.
  if (!Number.isInteger(commentId) || commentId <= 0) {
    showEditCommentMessage("Invalid comment ID.");

    if (saveCommentBtn) {
      saveCommentBtn.disabled = true;
    }

    return;
  }

  try {
    // GET /api/comments/me — handled by routes/comments.js
    const response = await fetch("/api/comments/me", {
      headers: getAuthHeaders()
    });

    // Redirect if the user is no longer authenticated.
    if (response.status === 401) {
      window.location.href = "account-login.html";
      return;
    }

    const data = await safeJson(response);

    if (!response.ok) {
      throw new Error(
        data?.error ||
        "Unable to load your comments."
      );
    }

    const comments = data.items || [];

    // Find the selected comment among the logged-in user's comments.
    const selectedComment = comments.find(function (comment) {
      return Number(comment.comment_id) === commentId;
    });

    // The comment does not exist or does not belong to this user.
    if (!selectedComment) {
      showEditCommentMessage(
        "Comment not found or you do not have permission to edit it."
      );

      if (saveCommentBtn) {
        saveCommentBtn.disabled = true;
      }

      return;
    }

    // Place the existing comment into the textarea.
    commentInput.value =
      selectedComment.comment || "";

  } catch (err) {
    console.error(
      "Error loading comment for editing:",
      err
    );

    showEditCommentMessage(
      "Unable to load the comment. Please try again."
    );

    if (saveCommentBtn) {
      saveCommentBtn.disabled = true;
    }
  }
}


// ---------------- UPDATE COMMENT ------------------

// Save changes to the selected comment.
async function updateComment(event) {
  event.preventDefault();

  // Make sure the comment ID is valid.
  if (!Number.isInteger(commentId) || commentId <= 0) {
    alert("Invalid comment ID.");
    return;
  }

  // Get and normalize the updated comment.
  const comment = commentInput
    ? commentInput.value.trim()
    : "";

  if (!comment) {
    alert("Comment cannot be empty.");
    return;
  }

  if (comment.length > 1000) {
    alert(
      "Comment must be 1000 characters or less."
    );
    return;
  }

  // Prevent multiple submissions while the request is processing.
  if (saveCommentBtn) {
    saveCommentBtn.disabled = true;
  }

  try {
    // PATCH /api/comments/:id — handled by routes/comments.js
    const response = await fetch(
      `/api/comments/${commentId}`,
      {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          comment: comment
        })
      }
    );

    if (response.status === 401) {
      window.location.href = "account-login.html";
      return;
    }

    const data = await safeJson(response);

    if (!response.ok) {
      alert(
        data?.error ||
        "Unable to update comment."
      );

      if (saveCommentBtn) {
        saveCommentBtn.disabled = false;
      }

      return;
    }

    alert("Comment updated successfully.");

    // Return to the user's comments page.
    window.location.href =
      "my-comments.html";

  } catch (err) {
    console.error(
      "Comment update failed:",
      err
    );

    alert(
      "Network error. Please try again."
    );

    if (saveCommentBtn) {
      saveCommentBtn.disabled = false;
    }
  }
}


// ---------------- PAGE INITIALIZATION ------------------

async function initializeEditCommentPage() {

  // This page is only for logged-in users.
  if (!getToken()) {
    window.location.href =
      "account-login.html";
    return;
  }

  // Reject invalid comment IDs in the URL.
  if (!Number.isInteger(commentId) || commentId <= 0) {
    alert("Invalid comment ID.");

    window.location.href =
      "my-comments.html";

    return;
  }

  // Load the original comment into the textarea.
  await loadCommentForEditing();

  // Run updateComment() when the form is submitted.
  if (editCommentForm) {
    editCommentForm.addEventListener(
      "submit",
      updateComment
    );
  }
}

initializeEditCommentPage();