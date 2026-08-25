const loginItem = document.getElementById("account-login-item");
const profileItem = document.getElementById("account-profile-item");

const token = localStorage.getItem("token");

if (token) {
  loginItem.style.display = "none";
  profileItem.style.display = "list-item";
} else {
  loginItem.style.display = "list-item";
  profileItem.style.display = "none";
}