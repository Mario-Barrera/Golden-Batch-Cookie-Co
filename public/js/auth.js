function safeJson(response) {
  return response.text().then(function (text) {           
    if (!text) return null;                               
    try {
      return JSON.parse(text);
    } catch (error) {
        console.error("Invalid JSON response:", error);
      return null;
    }
  });
}

// saveAuth() stores the authentication information returned by your API after login or registration
function saveAuth(authData) {
  const { token, user } = authData;

  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
}

// Get stored JWT token from localStorage
function getToken() {
  return localStorage.getItem("token");
}

// Check whether user appears to be logged in
// !!getToken uses double negative and means:  token exist is true   token missing is false
function isLoggedIn() {
  return !!getToken();
}

// this function builds the HTTP headers object
function getAuthHeaders() {
  const token = getToken();

  if (!token) {                                             
    return {
      "Content-Type": "application/json"
    };
  }

  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  };
}

function setupLogout() {
  const logoutLink = document.getElementById("logout");

  if (!logoutLink) return;

  logoutLink.addEventListener("click", function () {
    // Remove frontend auth data
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  });
}

document.addEventListener("DOMContentLoaded", function () {
  setupLogout();
});