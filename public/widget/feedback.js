/**
 * OutCaller Widget - Feedback
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
		<div class="oc-feedback${existingFeedback ? " has-feedback" : ""}" data-message-id="${messageId}">
			<button class="oc-feedback-btn oc-feedback-positive${existingFeedback === "positive" ? " active" : ""}" title="Helpful response" data-feedback="positive">
				${ICONS.thumbsUp}
			</button>
			<button class="oc-feedback-btn oc-feedback-negative${existingFeedback === "negative" ? " active" : ""}" title="Not helpful" data-feedback="negative">
				${ICONS.thumbsDown}
			</button>
			<span class="oc-feedback-thanks${existingFeedback ? " show" : ""}">Thanks!</span>
		</div>
	`;
  return feedbackHtml;
}

/**
 * Show feedback reason modal for negative feedback
 */
export function showFeedbackReasonModal(messageId, feedbackContainer) {
  // Remove any existing modal
  const existingModal = feedbackContainer.querySelector(".oc-feedback-modal");
  if (existingModal) existingModal.remove();

  const modalHtml = `
		<div class="oc-feedback-modal">
			<div class="oc-feedback-modal-title">What went wrong?</div>
			<div class="oc-feedback-modal-options">
				${FEEDBACK_REASONS.map((r) => `<button class="oc-feedback-option" data-reason="${r}">${r}</button>`).join("")}
			</div>
			<textarea class="oc-feedback-textarea" placeholder="Tell us more (optional)..." rows="2"></textarea>
			<div class="oc-feedback-modal-actions">
				<button class="oc-feedback-modal-btn cancel">Skip</button>
				<button class="oc-feedback-modal-btn submit">Submit</button>
			</div>
		</div>
	`;

  feedbackContainer.style.position = "relative";
  feedbackContainer.insertAdjacentHTML("beforeend", modalHtml);

  const modal = feedbackContainer.querySelector(".oc-feedback-modal");
  let selectedReason = "";

  // Handle option clicks
  modal.querySelectorAll(".oc-feedback-option").forEach((opt) => {
    opt.addEventListener("click", () => {
      modal.querySelectorAll(".oc-feedback-option").forEach((o) => o.classList.remove("selected"));
      opt.classList.add("selected");
      selectedReason = opt.dataset.reason;
    });
  });

  // Handle skip
  modal.querySelector(".cancel").addEventListener("click", async () => {
    modal.remove();
    await submitFeedback(messageId, "negative");
    showFeedbackThanks(feedbackContainer);
  });

  // Handle submit
  modal.querySelector(".submit").addEventListener("click", async () => {
    const textarea = modal.querySelector(".oc-feedback-textarea");
    const additionalText = textarea.value.trim();
    const fullReason = selectedReason + (additionalText ? `: ${additionalText}` : "");
    modal.remove();
    await submitFeedback(messageId, "negative", fullReason || null);
    showFeedbackThanks(feedbackContainer);
  });
}

/**
 * Show thanks message after feedback
 */
export function showFeedbackThanks(feedbackContainer) {
  const thanks = feedbackContainer.querySelector(".oc-feedback-thanks");
  if (thanks) {
    thanks.classList.add("show");
    setTimeout(() => thanks.classList.remove("show"), 2000);
  }
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

    // Remove any existing modal
    const existingModal = feedbackContainer.querySelector(".oc-feedback-modal");
    if (existingModal) existingModal.remove();

    // Remove active from all buttons in this container
    feedbackContainer.querySelectorAll(".oc-feedback-btn").forEach((b) => {
      b.classList.remove("active");
    });

    // Add active to clicked button
    btn.classList.add("active");
    feedbackContainer.classList.add("has-feedback");

    if (feedback === "negative") {
      // Show reason modal for negative feedback
      showFeedbackReasonModal(messageId, feedbackContainer);
    } else {
      // For positive feedback, submit immediately
      await submitFeedback(messageId, feedback);
      showFeedbackThanks(feedbackContainer);
    }
  });
}
