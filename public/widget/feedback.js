/**
 * Widget - Feedback
 * Feedback UI components and handlers
 */

import { submitFeedback } from "./api.js";
import { ICONS, FEEDBACK_REASONS } from "./constants.js";
import { state } from "./state.js";

/**
 * Create feedback buttons HTML
 */
export function createFeedbackButtons(messageId, existingFeedback = null) {
  const feedbackHtml = `
		<div class="oc-feedback${existingFeedback ? " has-feedback" : ""}" data-message-id="${messageId}" role="group" aria-label="Rate this response">
			<button type="button" class="oc-feedback-btn oc-feedback-positive${existingFeedback === "positive" ? " active" : ""}" aria-label="Mark response as helpful" aria-pressed="${existingFeedback === "positive"}" title="Helpful response" data-feedback="positive">
				${ICONS.thumbsUp}
			</button>
			<button type="button" class="oc-feedback-btn oc-feedback-negative${existingFeedback === "negative" ? " active" : ""}" aria-label="Mark response as not helpful" aria-pressed="${existingFeedback === "negative"}" title="Not helpful" data-feedback="negative">
				${ICONS.thumbsDown}
			</button>
			<span class="oc-feedback-thanks${existingFeedback ? " show" : ""}" role="status" aria-live="polite">${existingFeedback ? "Thanks for your feedback." : ""}</span>
		</div>
	`;
  return feedbackHtml;
}

export function createFeedbackReasonMarkup() {
  return `
		<div class="oc-feedback-modal" role="group" aria-label="Tell us how this response could improve">
			<div class="oc-feedback-modal-title">What went wrong?</div>
			<div class="oc-feedback-modal-options">
				${FEEDBACK_REASONS.map((reason) => `<button type="button" class="oc-feedback-option" data-reason="${reason}" aria-pressed="false">${reason}</button>`).join("")}
			</div>
			<label class="oc-feedback-input-label">Anything else? <span>(optional)</span>
				<textarea class="oc-feedback-textarea" aria-label="Additional feedback details" rows="2"></textarea>
			</label>
			<div class="oc-feedback-modal-actions">
				<button type="button" class="oc-feedback-modal-btn cancel">Skip details</button>
				<button type="button" class="oc-feedback-modal-btn submit">Submit feedback</button>
			</div>
		</div>
	`;
}

function setFeedbackStatus(feedbackContainer, message, isError = false) {
  const status = feedbackContainer.querySelector(".oc-feedback-thanks");
  if (!status) return;
  status.textContent = message;
  status.classList.toggle("error", isError);
  status.classList.add("show");
}

function resetFeedbackSelection(feedbackContainer) {
  feedbackContainer.classList.remove("has-feedback");
  feedbackContainer.querySelectorAll(".oc-feedback-btn").forEach((button) => {
    button.classList.remove("active");
    button.setAttribute("aria-pressed", "false");
  });
}

async function submitFeedbackSelection(messageId, feedbackContainer, feedback, reason = null) {
  const buttons = [...feedbackContainer.querySelectorAll(".oc-feedback-btn")];
  buttons.forEach((button) => {
    button.disabled = true;
  });
  const saved = await submitFeedback(messageId, feedback, reason);
  buttons.forEach((button) => {
    button.disabled = false;
  });

  if (saved) {
    setFeedbackStatus(feedbackContainer, "Thanks for your feedback.");
    return true;
  }

  setFeedbackStatus(feedbackContainer, "Feedback couldn't be saved. Please try again.", true);
  return false;
}

/**
 * Show feedback reason modal for negative feedback
 */
export function showFeedbackReasonModal(messageId, feedbackContainer) {
  // Remove any existing modal
  const existingModal = feedbackContainer.querySelector(".oc-feedback-modal");
  if (existingModal) existingModal.remove();

  feedbackContainer.style.position = "relative";
  feedbackContainer.insertAdjacentHTML("beforeend", createFeedbackReasonMarkup());

  const modal = feedbackContainer.querySelector(".oc-feedback-modal");
  let selectedReason = "";
  const negativeButton = feedbackContainer.querySelector('[data-feedback="negative"]');
  modal.querySelector(".oc-feedback-option")?.focus();
  modal.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    modal.remove();
    resetFeedbackSelection(feedbackContainer);
    negativeButton?.focus();
  });

  // Handle option clicks
  modal.querySelectorAll(".oc-feedback-option").forEach((opt) => {
    opt.addEventListener("click", () => {
      modal.querySelectorAll(".oc-feedback-option").forEach((option) => {
        option.classList.remove("selected");
        option.setAttribute("aria-pressed", "false");
      });
      opt.classList.add("selected");
      opt.setAttribute("aria-pressed", "true");
      selectedReason = opt.dataset.reason;
    });
  });

  // Handle skip
  modal.querySelector(".cancel").addEventListener("click", async () => {
    modal.remove();
    const saved = await submitFeedbackSelection(messageId, feedbackContainer, "negative");
    if (!saved) resetFeedbackSelection(feedbackContainer);
    negativeButton?.focus();
  });

  // Handle submit
  modal.querySelector(".submit").addEventListener("click", async () => {
    const textarea = modal.querySelector(".oc-feedback-textarea");
    const additionalText = textarea.value.trim();
    const fullReason = selectedReason + (additionalText ? `: ${additionalText}` : "");
    const submitButton = modal.querySelector(".submit");
    submitButton.disabled = true;
    const saved = await submitFeedbackSelection(
      messageId,
      feedbackContainer,
      "negative",
      fullReason || null,
    );
    submitButton.disabled = false;
    if (saved) {
      modal.remove();
      negativeButton?.focus();
    } else {
      modal.querySelector(".oc-feedback-textarea")?.focus();
    }
  });
}

/**
 * Show thanks message after feedback
 */
export function showFeedbackThanks(feedbackContainer) {
  setFeedbackStatus(feedbackContainer, "Thanks for your feedback.");
}

/**
 * Attach feedback event listeners to messages container
 */
export function attachFeedbackListeners() {
  if (!state.messagesContainer) return;

  state.messagesContainer.addEventListener("click", async (e) => {
    const btn = e.target.closest(".oc-feedback-btn");
    if (!btn) return;

    const feedbackContainer = btn.closest(".oc-feedback");
    if (!feedbackContainer) return;

    const messageId = feedbackContainer.dataset.messageId;
    const feedback = btn.dataset.feedback;

    if (!messageId || !feedback) return;

    // Don't re-submit if already active with same feedback
    if (btn.classList.contains("active")) return;

    const status = feedbackContainer.querySelector(".oc-feedback-thanks");
    if (status) {
      status.textContent = "";
      status.classList.remove("show", "error");
    }

    // Remove any existing modal
    const existingModal = feedbackContainer.querySelector(".oc-feedback-modal");
    if (existingModal) existingModal.remove();

    // Remove active from all buttons in this container
    feedbackContainer.querySelectorAll(".oc-feedback-btn").forEach((b) => {
      b.classList.remove("active");
      b.setAttribute("aria-pressed", "false");
    });

    // Add active to clicked button
    btn.classList.add("active");
    btn.setAttribute("aria-pressed", "true");
    feedbackContainer.classList.add("has-feedback");

    if (feedback === "negative") {
      // Show reason modal for negative feedback
      showFeedbackReasonModal(messageId, feedbackContainer);
    } else {
      // For positive feedback, submit immediately
      const saved = await submitFeedbackSelection(messageId, feedbackContainer, feedback);
      if (!saved) resetFeedbackSelection(feedbackContainer);
    }
  });
}
