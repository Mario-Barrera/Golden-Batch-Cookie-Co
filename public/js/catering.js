// -------------------- HELPER FUNCTIONS --------------------

// Validate and format a U.S. phone number as: (512) 784-2287
function formatPhoneNumber(phone) {
  if (typeof phone !== "string") {
    return null;
  }

  const digits = phone.replace(/\D/g, "");

  if (digits.length !== 10) {
    return null;
  }

  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

// Set the earliest selectable catering date.
function setMinimumCateringDate() {
  const dateInput = document.getElementById("event-date");

  // Get today's date.
  const minimumDate = new Date();

  // Add the required 4-day catering lead time.
  minimumDate.setDate(minimumDate.getDate() + 4);

  // Format the date as YYYY-MM-DD.
  const year = minimumDate.getFullYear();
  const month = String(minimumDate.getMonth() + 1).padStart(2, "0");
  const day = String(minimumDate.getDate()).padStart(2, "0");

  // Disable all dates before the minimum catering date.
  dateInput.min = `${year}-${month}-${day}`;
}

// -------------------- PAGE INITIALIZATION --------------------

document.addEventListener("DOMContentLoaded", function () {
  goToStep("step1");

  setMinimumCateringDate();
});

// Data that will eventually be submitted
const formData = {
  eventType: "",
  cookieFlavor: [],
  guestCount: "",
  eventDate: "",
  customerInfo: {
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
  },
};

// Select all form steps
const steps = document.querySelectorAll(".event-section");

// Select the step indicator
const stepIndicator = document.getElementById("step-indicator");

// define the navigation function
// goToStep = Switch steps safely
function goToStep(stepId) {
  steps.forEach(function (step) {
    step.style.display = "none";
  });

  const activeStep = document.getElementById(stepId);

  // the function exist safely and the app does not crash
  if (!activeStep) {
    console.error(`Step with id ${stepId} not found.`);
    return;
  }

  activeStep.style.display = "block";

  // Remove "step" from the ID to get the current step number.
  const stepNumber = stepId.replace("step", "");

  stepIndicator.textContent = `Step ${stepNumber} of 5`;
}

// ------- Step 1: Event Type (radio) ------- //

// [name="event-type"] is a CSS Attribute Selector
// :checked is a CSS pseudo-class selector that matches elements in a specific state.
function validateStep1() {
  const selected = document.querySelector('input[name="event-type"]:checked');

  if (!selected) {
    alert("Please select an event type to continue");
    return;
  }

  formData.eventType = selected.value;
  goToStep("step2");
}

// ------- Step 2: Cookie Types (checkboxes) ------- //

// Array.from() converts a NodeList to an Array and is a static method of the Array constructor
function validateStep2() {
  const selected = document.querySelectorAll('input[name="cookie-flavor"]:checked');

  if (selected.length === 0) {
    alert("Please select at least one type of cookie to continue");
    return;
  }

  formData.cookieFlavor = Array.from(selected, function (checkbox) {
    return checkbox.value;
  });

  goToStep("step3");
}

// ------- Step 3: Guest Count (radio) ------- //
function validateStep3() {
  const selected = document.querySelector('input[name="guest-count"]:checked');

  if (!selected) {
    alert("Please select the number of guests to continue");
    return;
  }

  formData.guestCount = selected.value;
  goToStep("step4");
}

// ------- Step 4: Event Date (Date Picker) ------- //
function validateStep4() {
  const dateInput = document.getElementById("event-date");
  const selectedDate = dateInput.value;

  if (!selectedDate) {
    alert("Please select a proposed date to continue");
    return;
  }

  // Get today's date and remove the current time.
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Calculate the earliest allowed catering date.
  const minimumDate = new Date(today);
  minimumDate.setDate(minimumDate.getDate() + 4);

  // Convert the selected date into a local Date object.
  const [year, month, day] = selectedDate.split("-").map(Number);
  const eventDate = new Date(year, month - 1, day);

  // Make sure the selected date meets the 4-day minimum lead time.
  if (eventDate < minimumDate) {
    alert(
      "Catering requests require at least 4 days notice. Please select another date."
    );
    return;
  }

  formData.eventDate = selectedDate;
  goToStep("step5");
}

// ------- Step 5: Customer Contact Info ------- //
async function validateStep5(event) {
  event.preventDefault();

  // Grab the inputs
  const firstNameInput = document.getElementById("first-name");
  const lastNameInput = document.getElementById("last-name");
  const phoneInput = document.getElementById("phone");
  const emailInput = document.getElementById("email");

  // trim the data
  const firstName = firstNameInput.value.trim();
  const lastName = lastNameInput.value.trim();
  const phone = formatPhoneNumber(phoneInput.value);
  const email = emailInput.value.trim();

  if (!firstName || !lastName || !email) {
    alert("Please fill out the form completely before submitting");
    return;
  }

  if (!phone) {
    alert("Please enter a valid 10-digit phone number.");
    return;
  }

  // Save data into state
  formData.customerInfo.firstName = firstName;
  formData.customerInfo.lastName = lastName;
  formData.customerInfo.phone = phone;
  formData.customerInfo.email = email;

  try {
    // Send the catering request to the backend
    const response = await fetch("/api/catering", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });

    // Check whether the server accepted the request
    if (!response.ok) {
      throw new Error("Failed to submit catering request");
    }

    alert(
      `Your catering request has been submitted successfully!

      Please expect a confirmation email within 24 hours. We will review your requested date and contact you to confirm availability.

      Please note that some dates may be unavailable due to production capacity, blackout dates, or additional lead-time requirements for larger orders.

      Thank you for choosing Golden Batch Cookie Co.!`
    );

    setTimeout(function () {
      // Reset the form controls
      document.querySelector("form").reset();

      // Reset the state object
      formData.eventType = "";
      formData.cookieFlavor = [];
      formData.guestCount = "";
      formData.eventDate = "";
      formData.customerInfo = {
        firstName: "",
        lastName: "",
        phone: "",
        email: "",
      };

      goToStep("step1");
    }, 1000);

  } catch (error) {
      console.error("Catering form submission error:", error);
      alert("Unable to submit the catering request. Please try again.");
  }
}
