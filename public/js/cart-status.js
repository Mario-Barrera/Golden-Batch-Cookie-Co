// ---------------- HELPER FUNCTION ------------------

// Create a unique cart-storage key for the currently logged-in user.
function getCartBadgeStorageKey() {
  const storedUser = localStorage.getItem("user");

  if (!storedUser) {
    return null;
  }

  try {
    const user = JSON.parse(storedUser);

    if (!user.user_id) {
      return null;
    }

    return `goldenBatchCart_${user.user_id}`;

  } catch (err) {
    console.error("Unable to read stored user:", err);

    return null;
  }
}

// ---------------- CART BADGE ------------------

// Update the Order navigation badge with the number of packs saved in the cart.
function updateCartBadge() {
  const cartCountBadge = document.getElementById("cart-count-badge");

  if (!cartCountBadge) {
    return;
  }

  // Get the unique cart key for the currently logged-in user.
  const cartStorageKey = getCartBadgeStorageKey();

  // If no logged-in user is found, hide the cart badge.
  if (!cartStorageKey) {
    cartCountBadge.textContent = "0";
    cartCountBadge.style.display = "none";

    return;
  }

  const storedCart = localStorage.getItem(cartStorageKey);

  // If this user does not have a saved cart, hide the badge.
  if (!storedCart) {
    cartCountBadge.textContent = "0";
    cartCountBadge.style.display = "none";

    return;
  }

  try {
    const cart = JSON.parse(storedCart);

    if (!Array.isArray(cart)) {
      throw new Error("Saved cart is invalid.");
    }

    // Add together the quantities of all packs in the cart.
    const totalQuantity = cart.reduce(function (total, item) {
        return total + Number(item.quantity);
    }, 0);

    cartCountBadge.textContent = totalQuantity;

    cartCountBadge.style.display = totalQuantity > 0 ? "inline-flex" : "none";

  } catch (err) {
    console.error("Unable to read saved cart:", err);

    cartCountBadge.textContent = "0";
    cartCountBadge.style.display = "none";
  }
}

// Update the badge when the webpage opens.
document.addEventListener("DOMContentLoaded", function () {
  updateCartBadge();
});