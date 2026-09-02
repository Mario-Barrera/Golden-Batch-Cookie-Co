// Get the container where the cookie products will be displayed.
const productContainer = document.getElementById("product-container");

// Get the elements used for the customer's order.
const orderItemsContainer = document.getElementById("order-items");
const orderSubtotal = document.getElementById("order-subtotal");
const submitOrderBtn = document.getElementById("submit-order-btn");
const orderForm = document.getElementById("order-form");
const paymentForm = document.getElementById("payment-form");
const backToOrderBtn = document.getElementById("back-to-order-btn");

// Stores the products the customer has selected.
const cart = [];

// ---------------- HELPER FUNCTIONS ------------------

// Create a unique cart-storage key for the currently logged-in user.
function getCartStorageKey() {
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

// Save the current cart so it remains available when the customer leaves the Order page.
function saveCart() {
  const cartStorageKey = getCartStorageKey();

  if (!cartStorageKey) {
    return;
  }

  if (cart.length === 0) {
    localStorage.removeItem(cartStorageKey);
  } else {
    localStorage.setItem(
      cartStorageKey,
      JSON.stringify(cart)
    );
  }

  // Update the Order navigation badge after the cart changes.
  if (typeof updateCartBadge === "function") {
    updateCartBadge();
  }
}

// Restore the currently logged-in customer's previously saved cart.
function loadSavedCart() {
  const cartStorageKey = getCartStorageKey();

  if (!cartStorageKey) {
    renderOrder();
    return;
  }

  const storedCart = localStorage.getItem(cartStorageKey);

  if (!storedCart) {
    renderOrder();
    return;
  }

  try {
    const savedItems = JSON.parse(storedCart);

    if (!Array.isArray(savedItems)) {
      throw new Error("Saved cart is invalid.");
    }

    cart.push(...savedItems);

  } catch (err) {
    console.error("Unable to restore saved cart:", err);

    localStorage.removeItem(cartStorageKey);
  }

  renderOrder();
}

// ---------------- PRODUCT LOADING ------------------

// Load all products from the database.
async function loadProducts() {
  if (!productContainer) {
    console.warn("Product container not found.");
    return;
  }

  try {
    const response = await fetch("/api/products");

    if (!response.ok) {
      throw new Error("Failed to fetch products");
    }

    const data = await response.json();

    // Support either:
    // { products: [...] }
    // or a direct array: [...]
    const products = data.products || data;

    // If products is not an array or the array is empty.
    if (!Array.isArray(products) || products.length === 0) {
      productContainer.textContent =
        "No products are currently available.";

      return;
    }

    // Clear anything currently inside the product container.
    productContainer.replaceChildren();

    // Create one menu card for each product.
    products.forEach(function (product) {
      const productCard = createProductCard(product);

      productContainer.appendChild(productCard);
    });

  } catch (err) {
    console.error("Error loading products:", err);

    productContainer.textContent =
      "Unable to load products. Please try again later.";
  }
}

// Create the HTML for one cookie product.
// '.classList' is the element's list of CSS classes
// '.add()' is the method that adds a new class to that list
function createProductCard(product) {
  const productCard = document.createElement("article");
  productCard.classList.add("product-card");

  // Get the product's image_key value that came from the database
  // and use it to find the matching image filename in productImages.
  const imageFile = productImages[product.image_key];

  // Create the <img> element.
  const productImage = document.createElement("img");
  productImage.classList.add("product-image");

  // If an image filename was found, use it as the <img> source.
  // Otherwise, use the company logo as the fallback image.
  if (imageFile) {
    productImage.src = `images/${imageFile}`;
  } else {
    productImage.src = "images/Company-Logo-Color.png";
  }

  // Set the alt attribute on the <img> element.
  productImage.alt = product.name;

  // Create the product name.
  const productName = document.createElement("h2");
  productName.classList.add("product-name");
  productName.textContent = product.name;

  // Create and display a message showing how many cookies are included in each order.
  const productQuantity = document.createElement("p");
  productQuantity.classList.add("product-quantity");
  productQuantity.textContent = "Pack of 5";

  // Create the product price.
  const productPrice = document.createElement("p");
  productPrice.classList.add("product-price");
  productPrice.textContent =
    `$${Number(product.price).toFixed(2)}`;

  // Create the Add to Order button.
  const addButton = document.createElement("button");
  addButton.classList.add("add-to-order-btn");
  addButton.type = "button";
  addButton.textContent = "Add to Order";

  // Save the product ID on the button so it can be accessed later.
  addButton.dataset.productId = product.product_id;

  // Add this product to the customer's order when clicked.
  addButton.addEventListener("click", function () {
    addProductToOrder(product);
  });

  // Add all product elements to the product card.
  productCard.append(
    productImage,
    productName,
    productQuantity,
    productPrice,
    addButton
  );

  return productCard;
}

// Add a product to the customer's order.
function addProductToOrder(product) {
  // Check whether this product is already in the cart.
  const existingItem = cart.find(function (item) {
    return item.product_id === product.product_id;
  });

  // If the product is already in the cart, increase its quantity instead of adding another copy.
  // otherwise, add a new product to the cart.
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({
      product_id: product.product_id,
      name: product.name,
      price: Number(product.price),
      quantity: 1,
    });
  }

  // Save the updated cart in localStorage.
  saveCart();

  // Rebuild the order panel with the updated cart.
  renderOrder();
}

// Display the customer's current order.
function renderOrder() {
  if (
    !orderItemsContainer ||
    !orderSubtotal ||
    !submitOrderBtn
  ) {
    console.warn("Order form elements not found.");
    return;
  }

  // Remove everything currently displayed inside the order-items container.
  orderItemsContainer.replaceChildren();

  // If the cart is empty, display the empty-order message.
  if (cart.length === 0) {
    const emptyMessage = document.createElement("p");    
    emptyMessage.id = "empty-order-message";
    emptyMessage.textContent =
      "Your order is currently empty.";

    orderItemsContainer.appendChild(emptyMessage);
    orderSubtotal.textContent = "$0.00";
    submitOrderBtn.disabled = true;

    return;
  }

  // Create one order row for each product in the cart.
  cart.forEach(function (item) {
    const orderItem = createOrderItem(item);
    orderItemsContainer.appendChild(orderItem);
  });

  // Recalculate the subtotal.
  updateSubtotal();

  // Allow the customer to place the order.
  submitOrderBtn.disabled = false;
}

// Create one item inside the order panel.
// The order panel is the visible section of the webpage where the cart items are displayed.
function createOrderItem(item) {
  const orderItem = document.createElement("div");
  orderItem.classList.add("order-item");

  // Product name.
  const productName = document.createElement("h3");
  productName.classList.add("order-item-name");
  productName.textContent = item.name;

  // Price for one box.
  const productPrice = document.createElement("p");
  productPrice.classList.add("order-item-price");
  productPrice.textContent =
    `$${item.price.toFixed(2)} each`;

  // Quantity controls container.
  const quantityControls = document.createElement("div");
  quantityControls.classList.add("quantity-controls");

  // Decrease quantity button.
  const decreaseButton = document.createElement("button");

  decreaseButton.type = "button";
  decreaseButton.classList.add("quantity-btn");
  decreaseButton.textContent = "−";

  // Pass the product ID so decreaseQuantity() knows which cart item to update.
  decreaseButton.addEventListener("click", function () {
    decreaseQuantity(item.product_id);
  });

  // Display the current quantity.
  const quantityDisplay = document.createElement("span");
  quantityDisplay.classList.add("item-quantity");
  quantityDisplay.textContent = item.quantity;

  // Increase quantity button.
  const increaseButton = document.createElement("button");
  increaseButton.type = "button";
  increaseButton.classList.add("quantity-btn");
  increaseButton.textContent = "+";

  // Pass the product ID so increaseQuantity() knows which cart item to update.
  increaseButton.addEventListener("click", function () {
    increaseQuantity(item.product_id);
  });

  // Add the quantity controls together.
  quantityControls.append(
    decreaseButton,
    quantityDisplay,
    increaseButton
  );

  // Calculate the total price for this individual product.
  const itemTotal = document.createElement("p");
  itemTotal.classList.add("order-item-total");
  itemTotal.textContent =
    `$${(item.price * item.quantity).toFixed(2)}`;

  // Create the Remove button.
  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.classList.add("remove-item-btn");
  removeButton.textContent = "Remove";

  removeButton.addEventListener("click", function () {
    removeProductFromOrder(item.product_id);
  });

  // Add everything to the order item.
  orderItem.append(
    productName,
    productPrice,
    quantityControls,
    itemTotal,
    removeButton
  );

  return orderItem;
}

// Increase the quantity of a product by one.
function increaseQuantity(productId) {
  const item = cart.find(function (cartItem) {
    return cartItem.product_id === productId;
  });

  if (!item) {
    return;
  }

  item.quantity += 1;

  saveCart();
  renderOrder();
}

// Decrease the quantity of a product by one.
function decreaseQuantity(productId) {
  const item = cart.find(function (cartItem) {
    return cartItem.product_id === productId;
  });

  if (!item) {
    return;
  }

  // If the quantity is already 1, remove the product from the order.
  // otherwise remove the product completely.
  if (item.quantity > 1) {
    item.quantity -= 1;
    saveCart();
  } else {
    removeProductFromOrder(productId);

    return;
  }

  renderOrder();
}

// Remove a product completely from the customer's order.
function removeProductFromOrder(productId) {
  const itemIndex = cart.findIndex(function (item) {
    return item.product_id === productId;
  });

  // If the product was not found in the cart, stop the function.
  if (itemIndex === -1) {
    return;
  }

  // itemIndex = the array position where removal should start
  // 1 = remove exactly one item
  cart.splice(itemIndex, 1);

  saveCart();
  renderOrder();
}

// Calculate the subtotal for the entire order.
function updateSubtotal() {
  const subtotal = cart.reduce(function (total, item) {
    return total + (item.price * item.quantity);
  }, 0);

  orderSubtotal.textContent =
    `$${subtotal.toFixed(2)}`;
}

// Temporarily handle the order-form submission.
// We will connect this to the backend later.
// Move the customer from the order panel to the payment panel.
if (orderForm && paymentForm) {
  orderForm.addEventListener("submit", function (event) {
    event.preventDefault();

    if (cart.length === 0) {
      return;
    }

    orderForm.hidden = true;
    paymentForm.hidden = false;
  });
}

// Return the customer from the payment panel to the order panel.
if (backToOrderBtn && orderForm && paymentForm) {
  backToOrderBtn.addEventListener("click", function () {
    paymentForm.hidden = true;
    orderForm.hidden = false;
  });
}

// Restore any previously saved order when the page opens.
loadSavedCart();

// Load the cookie menu when the page opens.
loadProducts();

