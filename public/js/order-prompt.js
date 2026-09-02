document.addEventListener("DOMContentLoaded", function () {

  // Wait 1 minutes before showing the order prompt again.
  const ORDER_PROMPT_INTERVAL = 60 * 1000;

  // sessionStorage key used to remember when the prompt was last shown.
  const LAST_SHOWN_KEY = "orderPromptLastShown";

  // -------------------- VARIABLES --------------------

  // Store the modal overlay after it has been loaded into the webpage.
  let orderPromptOverlay = null;

  // Store the timer so it can be stopped or replaced when needed.
  let orderPromptTimer = null;

  // -------------------- AUTHENTICATION --------------------

  // Check whether the visitor is currently logged in.
  async function isUserLoggedIn() {
    const token = localStorage.getItem("token");

    // No token means the visitor is logged out.
    if (!token) {
      return false;
    }

    try {
      // Ask the backend whether the stored JWT is still valid.
      const response = await fetch("/api/users/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // A successful response means the user is authenticated.
      if (response.ok) {
        return true;
      }

      // If the token is no longer valid, remove the old login information.
      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }

      return false;

    } catch (err) {
      console.error(
        "Unable to verify login status for order prompt:",
        err
      );

      // null means the login status could not be confirmed.
      return null;
    }
  }

  // -------------------- LOAD MODAL --------------------

  // Load order-prompt.html into the current webpage.
  async function loadOrderPrompt() {

    // If the modal has already been loaded, reuse it.
    if (orderPromptOverlay) {
      return orderPromptOverlay;
    }

    // Check whether the modal already exists in the webpage.
    const existingOverlay =
      document.getElementById("order-prompt-overlay");

    if (existingOverlay) {
      orderPromptOverlay = existingOverlay;

      setupCloseButton();

      return orderPromptOverlay;
    }

    // Get the reusable modal HTML file.
    const response = await fetch("/order-prompt.html");

    if (!response.ok) {
      throw new Error("Unable to load the order prompt.");
    }

    // Convert the fetched order-prompt.html file into an HTML text string that JavaScript can insert into the webpage.
    const html = await response.text();

    // Add the modal HTML to the end of the webpage body.
    // "beforeend" means: put the HTML inside <body>, at the very end, just before the closing </body> tag.
    document.body.insertAdjacentHTML(
      "beforeend",
      html
    );

    // Get the newly added modal overlay.
    orderPromptOverlay =
      document.getElementById("order-prompt-overlay");

    if (!orderPromptOverlay) {
      throw new Error("Order prompt overlay was not found.");
    }

    setupCloseButton();

    return orderPromptOverlay;
  }

  // -------------------- CLOSE BUTTON --------------------

  // Connect the Close button to the modal.
  function setupCloseButton() {
    const closeButton = document.getElementById("close-order-prompt");

    if (!closeButton) {
      return;
    }

    closeButton.addEventListener("click", hideOrderPrompt);
  }

  // Hide the order prompt without leaving the webpage.
  function hideOrderPrompt() {
    if (!orderPromptOverlay) {
      return;
    }

    orderPromptOverlay.classList.remove("show");
  }

  // -------------------- SHOW MODAL --------------------

  // Display the order prompt over the existing webpage.
  async function showOrderPrompt() {
    try {
      await loadOrderPrompt();

      orderPromptOverlay.classList.add("show");

      // Remember exactly when the modal was shown.
      sessionStorage.setItem(
        LAST_SHOWN_KEY,
        Date.now().toString()
      );

    } catch (err) {
      console.error("Error displaying order prompt:", err);
    }
  }

  // -------------------- TIMER --------------------

  // Stop the currently scheduled order-prompt timer.
  function stopOrderPromptTimer() {
    if (orderPromptTimer) {
      clearTimeout(orderPromptTimer);

      orderPromptTimer = null;
    }
  }

  // Schedule the next login check and possible popup.
  function scheduleNextOrderPrompt(delay) {
    stopOrderPromptTimer();

    orderPromptTimer = setTimeout(
      checkAndShowOrderPrompt,
      delay
    );
  }

  // Check the user's login status before showing the prompt again.
  async function checkAndShowOrderPrompt() {
    const loggedIn = await isUserLoggedIn();

    // Logged-in customers should never see the popup.
    if (loggedIn === true) {
      hideOrderPrompt();
      stopOrderPromptTimer();

      return;
    }

    // If login status could not be verified,
    // wait 1 minute and try again.
    if (loggedIn === null) {
      scheduleNextOrderPrompt(
        ORDER_PROMPT_INTERVAL
      );

      return;
    }

    // If the modal is not already visible, show it.
    if (
      !orderPromptOverlay ||
      !orderPromptOverlay.classList.contains("show")
    ) {
      await showOrderPrompt();
    }

    // Check again in another 2 minutes.
    scheduleNextOrderPrompt(
      ORDER_PROMPT_INTERVAL
    );
  }

  // -------------------- INITIALIZE --------------------

  // Start the order-prompt feature when the webpage opens.
  async function initializeOrderPrompt() {
    const loggedIn = await isUserLoggedIn();

    // Logged-in customers do not need the popup.
    if (loggedIn === true) {
      return;
    }

    // If the server could not confirm login status,
    // wait before checking again.
    if (loggedIn === null) {
      scheduleNextOrderPrompt(
        ORDER_PROMPT_INTERVAL
      );

      return;
    }

    // Get the time when the popup was last shown.
    const lastShown =
      Number(
        sessionStorage.getItem(LAST_SHOWN_KEY)
      ) || 0;

    // Calculate how much time has passed since it was last shown.
    const timeSinceLastShown =
      Date.now() - lastShown;


    // If the popup has never been shown during this session,
    // show it immediately.
    if (lastShown === 0) {
      await showOrderPrompt();

      scheduleNextOrderPrompt(
        ORDER_PROMPT_INTERVAL
      );

      return;
    }

    // If at least 2 minutes have passed,
    // show the popup again.
    if (
      timeSinceLastShown >=
      ORDER_PROMPT_INTERVAL
    ) {
      await showOrderPrompt();

      scheduleNextOrderPrompt(
        ORDER_PROMPT_INTERVAL
      );

      return;
    }

    // Otherwise, wait only for the remaining time.
    const remainingTime =
      ORDER_PROMPT_INTERVAL -
      timeSinceLastShown;

    scheduleNextOrderPrompt(
      remainingTime
    );
  }

  initializeOrderPrompt();
});