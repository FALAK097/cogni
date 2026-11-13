/**
 * Widget - Appointment Booking Workflow
 * Slot selection chips, confirmation, failure fallback, and booked appointment details card
 */

import { fetchBookingAvailabilityAPI, confirmBookingAPI } from "./api.js";
import { state } from "./state.js";
import { escapeHtml, renderBotAvatarMarkup, scrollToBottom, validateEmail } from "./utils.js";

let bookingInProgress = false;

export function isBookingTrigger(text) {
  if (!text || typeof text !== "string") return false;
  const normalized = text.toLowerCase();
  return (
    normalized.includes("appointment") ||
    normalized.includes("book a meeting") ||
    normalized.includes("book meeting") ||
    normalized.includes("schedule a meeting") ||
    normalized.includes("schedule meeting") ||
    normalized.includes("book an appointment") ||
    normalized.includes("book appointment") ||
    normalized.includes("schedule appointment") ||
    normalized.includes("available slot") ||
    normalized.includes("available time")
  );
}

export async function startBookingWorkflow(optionalContainer = null) {
  if (bookingInProgress) return;
  bookingInProgress = true;

  const bookingCardEl = optionalContainer || document.createElement("div");
  if (!optionalContainer) {
    bookingCardEl.className = "oc-message bot oc-booking-container";
    bookingCardEl.innerHTML = `
      <div class="oc-bot-header">
        <div class="oc-bot-avatar">${renderBotAvatarMarkup(state.config.logoUrl)}</div>
        <span class="oc-bot-name">${escapeHtml(state.config.agentName)}</span>
      </div>
      <div class="oc-bubble oc-booking-bubble">
        <div class="oc-booking-loading">
          <span>Finding available appointment times…</span>
        </div>
      </div>
    `;
    state.messagesContainer.appendChild(bookingCardEl);
    scrollToBottom();
  }

  const bubbleEl = bookingCardEl.querySelector(".oc-booking-bubble") || bookingCardEl;

  try {
    const data = await fetchBookingAvailabilityAPI();
    bookingInProgress = false;

    if (!data || !data.slots || data.slots.length === 0) {
      const fallbackMsg =
        data?.handoffFallback ||
        "No appointment times are currently available. Our team has been notified and will follow up with you directly in this chat.";
      renderFailureFallback(bubbleEl, fallbackMsg, data?.slots);
      return;
    }

    renderSlotSelection(bubbleEl, data.slots, data.timezone || "UTC", data.handoffFallback);
  } catch {
    bookingInProgress = false;
    renderFailureFallback(
      bubbleEl,
      "Unable to load available slots right now. Our team has been notified and will follow up with you.",
    );
  }
}

function renderSlotSelection(bubbleEl, slots, timezone, fallbackMessage) {
  bubbleEl.innerHTML = `
    <div class="oc-booking-step oc-booking-slots-step">
      <div class="oc-booking-header">
        <span class="oc-booking-title">Select an appointment time</span>
        <span class="oc-booking-subtitle">Timezone: ${escapeHtml(timezone)}</span>
      </div>
      <div class="oc-booking-chips" role="group" aria-label="Available appointment times">
        ${slots
          .slice(0, 16)
          .map(
            (slot, index) => `
          <button
            type="button"
            class="oc-slot-chip"
            data-index="${index}"
            data-start="${escapeHtml(slot.startAt)}"
            data-end="${escapeHtml(slot.endAt)}"
            data-label="${escapeHtml(slot.label)}"
          >
            ${escapeHtml(slot.label)}
          </button>
        `,
          )
          .join("")}
      </div>
    </div>
  `;

  scrollToBottom();

  const chipButtons = bubbleEl.querySelectorAll(".oc-slot-chip");
  chipButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      chipButtons.forEach((b) => b.classList.remove("oc-slot-chip-active"));
      btn.classList.add("oc-slot-chip-active");

      const selectedSlot = {
        startAt: btn.dataset.start,
        endAt: btn.dataset.end,
        label: btn.dataset.label,
      };

      renderBookingConfirmation(bubbleEl, selectedSlot, timezone, slots, fallbackMessage);
    });
  });
}

function renderBookingConfirmation(bubbleEl, slot, timezone, allSlots, fallbackMessage) {
  const prefillEmail = state.pendingLeadInfo?.email || state.savedLeadInfo?.email || "";

  bubbleEl.innerHTML = `
    <div class="oc-booking-step oc-booking-confirm-step">
      <div class="oc-booking-header">
        <span class="oc-booking-title">Confirm your appointment</span>
        <span class="oc-booking-subtitle">Selected: <strong>${escapeHtml(slot.label)}</strong></span>
      </div>
      <form class="oc-booking-form" id="oc-booking-form">
        <div class="oc-booking-field">
          <label for="oc-booking-email">Your email address</label>
          <input
            type="email"
            id="oc-booking-email"
            class="oc-booking-input"
            required
            value="${escapeHtml(prefillEmail)}"
            placeholder="you@example.com"
          />
        </div>
        <div class="oc-booking-field">
          <label for="oc-booking-title">Meeting topic</label>
          <input
            type="text"
            id="oc-booking-title"
            class="oc-booking-input"
            value="Customer meeting"
            placeholder="e.g. Product demo or support"
          />
        </div>
        <div class="oc-booking-error" id="oc-booking-form-error" style="display:none;"></div>
        <div class="oc-booking-actions">
          <button type="button" class="oc-booking-back-btn" id="oc-booking-back">
            Choose another time
          </button>
          <button type="submit" class="oc-booking-submit-btn" id="oc-booking-submit">
            Confirm booking
          </button>
        </div>
      </form>
    </div>
  `;

  scrollToBottom();

  const backBtn = bubbleEl.querySelector("#oc-booking-back");
  backBtn?.addEventListener("click", () => {
    renderSlotSelection(bubbleEl, allSlots, timezone, fallbackMessage);
  });

  const form = bubbleEl.querySelector("#oc-booking-form");
  const emailInput = bubbleEl.querySelector("#oc-booking-email");
  const titleInput = bubbleEl.querySelector("#oc-booking-title");
  const errorEl = bubbleEl.querySelector("#oc-booking-form-error");
  const submitBtn = bubbleEl.querySelector("#oc-booking-submit");

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = emailInput.value.trim();
    const title = titleInput.value.trim() || "Customer meeting";

    if (!validateEmail(email)) {
      if (errorEl) {
        errorEl.textContent = "Please enter a valid email address.";
        errorEl.style.display = "block";
      }
      return;
    }

    if (errorEl) errorEl.style.display = "none";
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Booking appointment…";
    }

    try {
      const response = await confirmBookingAPI({
        conversationId: state.sessionDbId || "",
        startAt: slot.startAt,
        endAt: slot.endAt,
        attendeeEmail: email,
        title,
      });

      renderBookedDetailsCard(bubbleEl, {
        title,
        label: slot.label,
        startAt: slot.startAt,
        endAt: slot.endAt,
        attendeeEmail: email,
        timezone,
        status: response.status || "CONFIRMED",
        message: response.message || "Your requested time is reserved.",
      });

      // Persist in local lead storage if email provided
      if (state.pendingLeadInfo) {
        state.pendingLeadInfo.email = email;
      }
    } catch (err) {
      const errorMsg = err?.message || "This slot could not be booked or is already reserved.";
      renderFailureFallback(bubbleEl, fallbackMessage || errorMsg, allSlots);
    }
  });
}

export function renderBookedDetailsCard(bubbleEl, appointment) {
  const isPending = appointment.status === "PENDING_TEAM_APPROVAL";
  bubbleEl.innerHTML = `
    <div class="oc-booking-card">
      <div class="oc-booking-card-header">
        <span class="oc-booking-badge">✓ Appointment Reserved</span>
        <span class="oc-booking-card-title">${escapeHtml(appointment.title)}</span>
      </div>
      <div class="oc-booking-card-body">
        <div class="oc-booking-detail-row">
          <span class="oc-booking-detail-label">Time:</span>
          <span class="oc-booking-detail-val">${escapeHtml(appointment.label || appointment.startAt)}</span>
        </div>
        <div class="oc-booking-detail-row">
          <span class="oc-booking-detail-label">Attendee:</span>
          <span class="oc-booking-detail-val">${escapeHtml(appointment.attendeeEmail)}</span>
        </div>
        <div class="oc-booking-detail-row">
          <span class="oc-booking-detail-label">Status:</span>
          <span class="oc-booking-detail-val">${escapeHtml(isPending ? "Pending team confirmation" : "Confirmed")}</span>
        </div>
      </div>
      <div class="oc-booking-card-footer">
        ${escapeHtml(isPending ? "Our team has received your request. We’ll send the email confirmation after approval." : "Your appointment is confirmed and the details have been sent by email.")}
      </div>
    </div>
  `;

  scrollToBottom();
}

export function renderFailureFallback(bubbleEl, fallbackMessage, retrySlots = null) {
  bubbleEl.innerHTML = `
    <div class="oc-booking-fallback">
      <div class="oc-booking-fallback-header">
        <span class="oc-booking-fallback-badge">Notice</span>
        <span class="oc-booking-fallback-title">Appointment booking</span>
      </div>
      <p class="oc-booking-fallback-body">
        ${escapeHtml(fallbackMessage)}
      </p>
      ${
        retrySlots && retrySlots.length > 0
          ? `
        <div class="oc-booking-actions">
          <button type="button" class="oc-booking-retry-btn" id="oc-booking-retry">
            Pick another available slot
          </button>
        </div>
      `
          : ""
      }
    </div>
  `;

  scrollToBottom();

  const retryBtn = bubbleEl.querySelector("#oc-booking-retry");
  retryBtn?.addEventListener("click", () => {
    startBookingWorkflow(bubbleEl.closest(".oc-booking-container"));
  });
}
