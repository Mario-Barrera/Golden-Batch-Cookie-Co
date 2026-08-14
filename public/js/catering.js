// DOMContentLoaded only initializes the first state
document.addEventListener("DOMContentLoaded", function () {
  goToStep("step1");
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

// Step 1: Event Type (radio)
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

// Step 2: Pie Types (checkboxes)
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

// Step 3: Guest Count (radio)
function validateStep3() {
  const selected = document.querySelector('input[name="guest-count"]:checked');

  if (!selected) {
    alert("Please select the number of guests to continue");
    return;
  }

  formData.guestCount = selected.value;
  goToStep("step4");
}

// Step 4: Event Date (Date Picker)
function validateStep4() {
  const dateInput = document.getElementById("event-date");
  const selectedDate = dateInput.value;

  if (!selectedDate) {
    alert("Please select a proposed date to continue");
    return;
  }

  formData.eventDate = selectedDate;
  goToStep("step5");
}

// Step 5: Customer Contact Info
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
  const phone = phoneInput.value.trim();
  const email = emailInput.value.trim();

  if (!firstName || !lastName || !phone || !email) {
    alert("Please fill out the form completely before submitting");
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

    alert("Form submitted successfully!");

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
