const form = document.getElementById("textbook-form");
const emptyResult = document.getElementById("empty-result");
const resultContent = document.getElementById("result-content");
const resultLabel = document.getElementById("result-label");
const resultHeading = document.getElementById("result-heading");
const resultExplanation = document.getElementById("result-explanation");
const savingCard = document.getElementById("saving-card");
const savingAmount = document.getElementById("saving-amount");
const nextSteps = document.getElementById("next-steps");
const shareButton = document.getElementById("share-button");
const resetButton = document.getElementById("reset-button");
const shareStatus = document.getElementById("share-status");

let currentSummary = "";

function showError(input, messageElement, message) {
  messageElement.textContent = message;
  messageElement.hidden = !message;
  if (input) {
    if (message) input.setAttribute("aria-invalid", "true");
    else input.removeAttribute("aria-invalid");
  }
}

function money(value) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency", currency: "ZAR", maximumFractionDigits: 2
  }).format(value);
}

function validateForm() {
  let valid = true;
  const priceInput = document.getElementById("new-price");
  const priceError = document.getElementById("new-price-error");
  const requiredError = document.getElementById("required-error");
  const frequencyInput = document.getElementById("frequency");
  const frequencyError = document.getElementById("frequency-error");
  const secondhandInput = document.getElementById("secondhand-price");
  const secondhandError = document.getElementById("secondhand-error");

  const price = Number(priceInput.value);
  if (!priceInput.value.trim() || !Number.isFinite(price) || price <= 0) {
    showError(priceInput, priceError, "Enter a textbook price greater than R0.");
    valid = false;
  } else showError(priceInput, priceError, "");

  const selectedRequirement = form.querySelector('input[name="required"]:checked');
  showError(null, requiredError, selectedRequirement ? "" : "Choose whether the textbook is required, recommended or optional.");
  if (!selectedRequirement) valid = false;

  showError(frequencyInput, frequencyError, frequencyInput.value ? "" : "Choose how often you expect to use the textbook.");
  if (!frequencyInput.value) valid = false;

  if (secondhandInput.value.trim()) {
    const secondhand = Number(secondhandInput.value);
    if (!Number.isFinite(secondhand) || secondhand <= 0) {
      showError(secondhandInput, secondhandError, "Enter a second-hand price greater than R0, or leave this field empty.");
      valid = false;
    } else {
      showError(secondhandInput, secondhandError, secondhand >= price ? "This price is not cheaper than the new copy. You can still continue." : "");
    }
  } else showError(secondhandInput, secondhandError, "");
  return valid;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!validateForm()) {
    const firstInvalid = form.querySelector('[aria-invalid="true"]');
    if (firstInvalid) firstInvalid.focus();
    else document.getElementById("required-error").scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  const data = new FormData(form);
  const title = (data.get("bookTitle") || "").trim() || "This textbook";
  const price = Number(data.get("newPrice"));
  const requirement = data.get("required");
  const frequency = data.get("frequency");
  const secondhandRaw = data.get("secondhandPrice");
  const secondhand = secondhandRaw ? Number(secondhandRaw) : null;
  const alternatives = data.getAll("alternatives");

  let score = 0;
  if (requirement === "required") score += 3;
  if (requirement === "recommended") score += 1;
  if (frequency === "often") score += 2;
  if (frequency === "sometimes") score += 1;
  if (alternatives.length > 0) score -= 1;
  if (secondhand !== null && secondhand > 0 && secondhand < price) score -= 1;

  let label, heading, explanation;
  if (requirement === "required" && frequency !== "rarely") {
    label = secondhand !== null && secondhand > 0 && secondhand < price ? "Consider an alternative" : "Buying may be worthwhile";
    heading = secondhand !== null && secondhand > 0 && secondhand < price ? "Look at the second-hand option first" : "This book may be worth buying";
    explanation = secondhand !== null && secondhand > 0 && secondhand < price
      ? `${title} is required and you expect to use it, but a cheaper second-hand copy is available. Compare its condition and edition before deciding.`
      : `${title} is required and you expect to use it regularly. Buying may be practical, but check whether your library or course provides access first.`;
  } else if (requirement === "required" || score >= 2) {
    label = "Compare your options";
    heading = "Consider alternatives before buying";
    explanation = `${title} may be useful, but the price and how often you will use it matter. Compare the available alternatives before spending money.`;
  } else {
    label = "Consider an alternative";
    heading = "You may not need to buy a new copy";
    explanation = `${title} is not marked as essential for frequent use. Consider borrowing, renting, using a library copy or accessing a digital version before buying.`;
  }

  resultLabel.textContent = label;
  resultLabel.className = "result-label" + (label === "Compare your options" || label === "Consider an alternative" ? " caution" : "");
  resultHeading.textContent = heading;
  resultExplanation.textContent = explanation;

  const savings = secondhand !== null && secondhand > 0 && secondhand < price ? price - secondhand : null;
  savingCard.hidden = savings === null;
  if (savings !== null) savingAmount.textContent = money(savings);

  const suggestions = [];
  if (secondhand !== null && secondhand > 0 && secondhand < price) suggestions.push(`Compare the second-hand copy at ${money(secondhand)} with the new copy at ${money(price)}.`);
  if (alternatives.includes("library")) suggestions.push("Check whether the library copy is available when you need it.");
  if (alternatives.includes("digital")) suggestions.push("Compare the digital version's price, access period and permitted use.");
  if (alternatives.includes("rental")) suggestions.push("Compare the rental fee and return date with the cost of buying.");
  if (!suggestions.length) suggestions.push("Ask your lecturer which chapters or edition are essential.", "Check with classmates or your library for cheaper access.");
  suggestions.push("Confirm the required edition and any course-specific instructions before purchasing.");
  nextSteps.replaceChildren();
  suggestions.forEach((suggestion) => {
    const li = document.createElement("li");
    li.textContent = suggestion;
    nextSteps.appendChild(li);
  });

  currentSummary = `${title}: ${label}. ${explanation}${savings !== null ? ` Potential saving versus new: ${money(savings)}.` : ""}`;
  emptyResult.hidden = true;
  resultContent.hidden = false;
  shareStatus.hidden = true;
  resultHeading.focus?.();
  resultContent.scrollIntoView({ behavior: "smooth", block: "nearest" });
});

shareButton.addEventListener("click", async () => {
  shareStatus.hidden = false;
  try {
    if (navigator.share) {
      await navigator.share({ title: "Textbook Check result", text: currentSummary });
      shareStatus.textContent = "Share options opened.";
    } else if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(currentSummary);
      shareStatus.textContent = "Result copied. You can paste it into a message to a classmate.";
    } else {
      shareStatus.textContent = "Select and copy this result: " + currentSummary;
    }
  } catch (error) {
    shareStatus.textContent = "Sharing was cancelled or is unavailable. You can copy this result: " + currentSummary;
  }
});

resetButton.addEventListener("click", () => {
  form.reset();
  ["new-price", "secondhand-price", "frequency"].forEach(id => document.getElementById(id).removeAttribute("aria-invalid"));
  document.querySelectorAll(".error-message").forEach(el => { el.hidden = true; el.textContent = ""; });
  resultContent.hidden = true;
  emptyResult.hidden = false;
  shareStatus.hidden = true;
  document.getElementById("book-title").focus();
});

const reviewForm = document.getElementById("review-form");
const reviewsList = document.getElementById("reviews-list");
reviewForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const bookInput = document.getElementById("review-book");
  const textInput = document.getElementById("review-text");
  const bookError = document.getElementById("review-book-error");
  const textError = document.getElementById("review-text-error");
  const book = bookInput.value.trim();
  const tip = textInput.value.trim();
  showError(bookInput, bookError, book ? "" : "Enter a textbook title or subject.");
  showError(textInput, textError, tip ? "" : "Enter a short tip.");
  if (!book || !tip) {
    (!book ? bookInput : textInput).focus();
    return;
  }

  const empty = reviewsList.querySelector(".empty-review");
  if (empty) empty.remove();
  const card = document.createElement("article");
  card.className = "review-card";
  const heading = document.createElement("h3");
  heading.textContent = book;
  const paragraph = document.createElement("p");
  paragraph.textContent = tip;
  card.append(heading, paragraph);
  reviewsList.prepend(card);
  reviewForm.reset();
  bookInput.focus();
});
