/**
 * Widget - Lead Capture
 * Conversational lead capture functionality
 */

import { detectLeadCaptureAPI, submitLeadCaptureAPI } from "./api.js";
import { renderBotAvatarMarkup } from "./utils.js";
import { ICONS } from "./constants.js";
import { state } from "./state.js";
import { saveLeadToStorage } from "./storage.js";
import {
  escapeHtml,
  scrollToBottom,
  validateEmail,
  validatePhone,
  getCurrentTime,
} from "./utils.js";

/**
 * Get user message count from conversation history
 */
export function getUserMessageCount() {
  return state.conversationHistory.filter((msg) => msg.role === "user").length;
}

/**
 * Detect if lead capture should be triggered
 */
export async function detectLeadCapture(currentMessage = null) {
  if (!state.sessionDbId || !state.leadCaptureEnabled || state.leadCaptureFormShown) {
    return false;
  }

  if (state.savedLeadInfo) {
    state.leadCaptureFormShown = true;
    return false;
  }

  try {
    const sessionDurationMinutes = state.sessionStartTime
      ? Math.floor((Date.now() - state.sessionStartTime) / 60000)
      : 0;

    const userMsgCount = getUserMessageCount();
    const messageToCheck =
      currentMessage ||
      (state.conversationHistory.length > 0
        ? state.conversationHistory[state.conversationHistory.length - 1].content
        : "");

    const data = await detectLeadCaptureAPI(messageToCheck, userMsgCount, sessionDurationMinutes);

    if (data.triggered) {
      startConversationalLeadCapture(data.triggerType, data.triggerValue);
      return true;
    }
    return false;
  } catch (error) {
    console.error("Widget: Lead capture detection failed", error);
    return false;
  }
}

/**
 * Start the conversational lead capture flow
 */
export function startConversationalLeadCapture(triggerType, triggerValue) {
  if (state.leadCaptureFormShown) return;
  state.leadCaptureFormShown = true;
  state.leadCaptureStep = 1;
  state.pendingLeadInfo = { name: "", email: "", phone: "", triggerType, triggerValue };

  // Ask for name first
  askForName();
}

/**
 * Render markup for lead capture step 1 (name)
 */
export function renderLeadNameMarkup(config) {
  const agentName = config?.agentName || "Assistant";
  const logoUrl = config?.logoUrl || null;
  return `
		<div class="oc-bot-header">
			<div class="oc-bot-avatar">
				${renderBotAvatarMarkup(logoUrl)}
			</div>
			<span class="oc-bot-name">${escapeHtml(agentName)}</span>
		</div>
		<div class="oc-bubble" id="oc-lead-name-prompt">I'd love to help you further! May I have your name?</div>
		<div class="oc-lead-input-container" id="oc-name-input-container">
			<label for="oc-lead-name-input" class="oc-screen-reader-only">Your name</label>
			<input
				type="text"
				class="oc-lead-input"
				id="oc-lead-name-input"
				name="name"
				placeholder="Your name"
				aria-label="Your name"
				aria-describedby="oc-lead-name-error"
				autocomplete="name"
			/>
			<button
				type="button"
				class="oc-lead-submit-btn"
				id="oc-lead-name-btn"
				aria-label="Submit name"
				disabled
			>${ICONS.send}</button>
		</div>
		<div class="oc-lead-error" id="oc-lead-name-error" role="alert" aria-live="polite"></div>
	`;
}

/**
 * Render markup for lead capture step 2 (email)
 */
export function renderLeadEmailMarkup(config, userName) {
  const agentName = config?.agentName || "Assistant";
  const logoUrl = config?.logoUrl || null;
  const name = userName || "";
  return `
		<div class="oc-bot-header">
			<div class="oc-bot-avatar">
				${renderBotAvatarMarkup(logoUrl)}
			</div>
			<span class="oc-bot-name">${escapeHtml(agentName)}</span>
		</div>
		<div class="oc-bubble" id="oc-lead-email-prompt">Nice to meet you, ${escapeHtml(name)}! What's your email address?</div>
		<div class="oc-lead-input-container" id="oc-email-input-container">
			<label for="oc-lead-email-input" class="oc-screen-reader-only">Email address</label>
			<input
				type="email"
				class="oc-lead-input"
				id="oc-lead-email-input"
				name="email"
				placeholder="your@email.com"
				aria-label="Email address"
				aria-describedby="oc-lead-email-error"
				autocomplete="email"
			/>
			<button
				type="button"
				class="oc-lead-submit-btn"
				id="oc-lead-email-btn"
				aria-label="Submit email"
				disabled
			>${ICONS.send}</button>
		</div>
		<div class="oc-lead-error" id="oc-lead-email-error" role="alert" aria-live="polite"></div>
	`;
}

/**
 * Render markup for lead capture step 3 (phone)
 */
export function renderLeadPhoneMarkup(config) {
  const agentName = config?.agentName || "Assistant";
  const logoUrl = config?.logoUrl || null;
  return `
		<div class="oc-bot-header">
			<div class="oc-bot-avatar">
				${renderBotAvatarMarkup(logoUrl)}
			</div>
			<span class="oc-bot-name">${escapeHtml(agentName)}</span>
		</div>
		<div class="oc-bubble" id="oc-lead-phone-prompt">Great! And what's your phone number? (optional)</div>
		<div class="oc-lead-input-container" id="oc-phone-input-container">
			<span class="oc-lead-prefix" aria-hidden="true">+91</span>
			<label for="oc-lead-phone-input" class="oc-screen-reader-only">Phone number (optional)</label>
			<input
				type="tel"
				class="oc-lead-input"
				id="oc-lead-phone-input"
				name="phone"
				placeholder="9876543210"
				aria-label="Phone number (optional)"
				aria-describedby="oc-lead-phone-error"
				autocomplete="tel"
				maxlength="10"
			/>
			<button
				type="button"
				class="oc-lead-submit-btn"
				id="oc-lead-phone-btn"
				aria-label="Submit phone number"
				disabled
			>${ICONS.send}</button>
		</div>
		<div class="oc-lead-error" id="oc-lead-phone-error" role="alert" aria-live="polite"></div>
		<button type="button" class="oc-lead-skip-btn" id="oc-lead-phone-skip">Skip this step</button>
	`;
}

/**
 * Ask for user's name
 */
function askForName() {
  const questionDiv = document.createElement("div");
  questionDiv.className = "oc-message bot oc-lead-question";
  questionDiv.id = "oc-lead-step-1";
  questionDiv.innerHTML = renderLeadNameMarkup(state.config);
  state.messagesContainer.appendChild(questionDiv);
  scrollToBottom();

  const inputEl = document.getElementById("oc-lead-name-input");
  const btnEl = document.getElementById("oc-lead-name-btn");
  const errorEl = document.getElementById("oc-lead-name-error");
  const container = document.getElementById("oc-name-input-container");

  function validate() {
    const name = inputEl.value.trim();
    if (!name) {
      if (errorEl) errorEl.textContent = "Please enter your name.";
      if (container) container.classList.add("has-error");
      inputEl.setAttribute("aria-invalid", "true");
      return false;
    }
    if (errorEl) errorEl.textContent = "";
    if (container) container.classList.remove("has-error");
    inputEl.setAttribute("aria-invalid", "false");
    return true;
  }

  inputEl.addEventListener("input", () => {
    const hasValue = !!inputEl.value.trim();
    btnEl.disabled = !hasValue;
    if (hasValue && errorEl && errorEl.textContent) {
      errorEl.textContent = "";
      if (container) container.classList.remove("has-error");
      inputEl.setAttribute("aria-invalid", "false");
    }
  });

  inputEl.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (validate()) {
        handleNameSubmit();
      }
    }
  });

  btnEl.addEventListener("click", () => {
    if (validate()) {
      handleNameSubmit();
    }
  });
  setTimeout(() => inputEl.focus(), 100);
}

/**
 * Handle name submission
 */
function handleNameSubmit() {
  const inputEl = document.getElementById("oc-lead-name-input");
  if (!inputEl) return;
  const name = inputEl.value.trim();
  if (!name) return;

  state.pendingLeadInfo.name = name;

  // Import addUserMessage dynamically to avoid circular dependency
  import("./ui.js").then(({ addUserMessage }) => {
    addUserMessage(name, null, true);
  });

  // Remove the input container and error
  const container = document.getElementById("oc-name-input-container");
  if (container) container.remove();
  const errorEl = document.getElementById("oc-lead-name-error");
  if (errorEl) errorEl.remove();

  // Move to email step
  state.leadCaptureStep = 2;
  askForEmail();
}

/**
 * Ask for user's email
 */
function askForEmail() {
  const questionDiv = document.createElement("div");
  questionDiv.className = "oc-message bot oc-lead-question";
  questionDiv.id = "oc-lead-step-2";
  questionDiv.innerHTML = renderLeadEmailMarkup(state.config, state.pendingLeadInfo.name);
  state.messagesContainer.appendChild(questionDiv);
  scrollToBottom();

  const inputEl = document.getElementById("oc-lead-email-input");
  const btnEl = document.getElementById("oc-lead-email-btn");
  const errorEl = document.getElementById("oc-lead-email-error");
  const container = document.getElementById("oc-email-input-container");

  function validate() {
    const email = inputEl.value.trim();
    if (!email) {
      if (errorEl) errorEl.textContent = "Please enter your email address.";
      if (container) container.classList.add("has-error");
      inputEl.setAttribute("aria-invalid", "true");
      return false;
    }
    if (!validateEmail(email)) {
      if (errorEl) errorEl.textContent = "Please enter a valid email address.";
      if (container) container.classList.add("has-error");
      inputEl.setAttribute("aria-invalid", "true");
      return false;
    }
    if (errorEl) errorEl.textContent = "";
    if (container) container.classList.remove("has-error");
    inputEl.setAttribute("aria-invalid", "false");
    return true;
  }

  inputEl.addEventListener("input", () => {
    const isValid = validateEmail(inputEl.value.trim());
    btnEl.disabled = !isValid;
    if (isValid && errorEl && errorEl.textContent) {
      errorEl.textContent = "";
      if (container) container.classList.remove("has-error");
      inputEl.setAttribute("aria-invalid", "false");
    }
  });

  inputEl.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (validate()) {
        handleEmailSubmit();
      }
    }
  });

  btnEl.addEventListener("click", () => {
    if (validate()) {
      handleEmailSubmit();
    }
  });
  setTimeout(() => inputEl.focus(), 100);
}

/**
 * Handle email submission
 */
function handleEmailSubmit() {
  const inputEl = document.getElementById("oc-lead-email-input");
  if (!inputEl) return;
  const email = inputEl.value.trim();
  if (!email || !validateEmail(email)) return;

  state.pendingLeadInfo.email = email;

  // Import addUserMessage dynamically to avoid circular dependency
  import("./ui.js").then(({ addUserMessage }) => {
    addUserMessage(email, null, true);
  });

  // Remove the input container and error
  const container = document.getElementById("oc-email-input-container");
  if (container) container.remove();
  const errorEl = document.getElementById("oc-lead-email-error");
  if (errorEl) errorEl.remove();

  // Move to phone step
  state.leadCaptureStep = 3;
  askForPhone();
}

/**
 * Ask for user's phone
 */
function askForPhone() {
  const questionDiv = document.createElement("div");
  questionDiv.className = "oc-message bot oc-lead-question";
  questionDiv.id = "oc-lead-step-3";
  questionDiv.innerHTML = renderLeadPhoneMarkup(state.config);
  state.messagesContainer.appendChild(questionDiv);
  scrollToBottom();

  const inputEl = document.getElementById("oc-lead-phone-input");
  const btnEl = document.getElementById("oc-lead-phone-btn");
  const skipBtn = document.getElementById("oc-lead-phone-skip");
  const errorEl = document.getElementById("oc-lead-phone-error");
  const container = document.getElementById("oc-phone-input-container");

  function validate() {
    const phone = inputEl.value.trim();
    if (!phone) {
      if (errorEl) errorEl.textContent = "Please enter your phone number or click skip.";
      if (container) container.classList.add("has-error");
      inputEl.setAttribute("aria-invalid", "true");
      return false;
    }
    if (!validatePhone(phone)) {
      if (errorEl) errorEl.textContent = "Please enter a valid 10-digit mobile number.";
      if (container) container.classList.add("has-error");
      inputEl.setAttribute("aria-invalid", "true");
      return false;
    }
    if (errorEl) errorEl.textContent = "";
    if (container) container.classList.remove("has-error");
    inputEl.setAttribute("aria-invalid", "false");
    return true;
  }

  inputEl.addEventListener("input", (e) => {
    // Only allow digits
    e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10);
    const isValid = validatePhone(inputEl.value.trim());
    btnEl.disabled = !isValid;
    if (isValid && errorEl && errorEl.textContent) {
      errorEl.textContent = "";
      if (container) container.classList.remove("has-error");
      inputEl.setAttribute("aria-invalid", "false");
    }
  });

  inputEl.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (validate()) {
        handlePhoneSubmit();
      }
    }
  });

  btnEl.addEventListener("click", () => {
    if (validate()) {
      handlePhoneSubmit();
    }
  });
  skipBtn.addEventListener("click", handlePhoneSkip);
  setTimeout(() => inputEl.focus(), 100);
}

/**
 * Handle phone skip
 */
function handlePhoneSkip() {
  // Import addUserMessage dynamically to avoid circular dependency
  import("./ui.js").then(({ addUserMessage }) => {
    addUserMessage("Skipped", null, true);
  });

  // Remove the input container, error, and skip button
  const container = document.getElementById("oc-phone-input-container");
  if (container) container.remove();
  const errorEl = document.getElementById("oc-lead-phone-error");
  if (errorEl) errorEl.remove();
  const skipBtn = document.getElementById("oc-lead-phone-skip");
  if (skipBtn) skipBtn.remove();

  // Submit the lead without phone
  state.pendingLeadInfo.phone = "";
  state.leadCaptureStep = 4;
  submitLeadCapture();
}

/**
 * Handle phone submission
 */
function handlePhoneSubmit() {
  const inputEl = document.getElementById("oc-lead-phone-input");
  if (!inputEl) return;
  const phone = inputEl.value.trim();
  if (!phone || !validatePhone(phone)) return;

  state.pendingLeadInfo.phone = "+91" + phone;

  // Import addUserMessage dynamically to avoid circular dependency
  import("./ui.js").then(({ addUserMessage }) => {
    addUserMessage("+91 " + phone, null, true);
  });

  // Remove the input container, error, and skip button
  const container = document.getElementById("oc-phone-input-container");
  if (container) container.remove();
  const errorEl = document.getElementById("oc-lead-phone-error");
  if (errorEl) errorEl.remove();
  const skipBtn = document.getElementById("oc-lead-phone-skip");
  if (skipBtn) skipBtn.remove();

  // Submit the lead
  state.leadCaptureStep = 4;
  submitLeadCapture();
}

/**
 * Submit lead capture data to backend
 */
async function submitLeadCapture() {
  // Generate conversation summary
  const conversationSummary = state.conversationHistory
    .slice(-10)
    .map((msg) => `${msg.role}: ${msg.content}`)
    .join("\n");

  try {
    const success = await submitLeadCaptureAPI({
      name: state.pendingLeadInfo.name,
      email: state.pendingLeadInfo.email,
      phone: state.pendingLeadInfo.phone,
      conversationSummary,
      triggerType: state.pendingLeadInfo.triggerType,
      triggerValue: state.pendingLeadInfo.triggerValue,
      messageCount: state.conversationHistory.length,
    });

    if (success) {
      // Save lead info to localStorage for future sessions
      saveLeadToStorage({
        name: state.pendingLeadInfo.name,
        email: state.pendingLeadInfo.email,
        phone: state.pendingLeadInfo.phone,
      });
      state.savedLeadInfo = state.pendingLeadInfo;

      // Show thank you message
      const thankYouDiv = document.createElement("div");
      thankYouDiv.className = "oc-message bot";
      thankYouDiv.innerHTML = `
				<div class="oc-bot-header">
					<div class="oc-bot-avatar">
						${renderBotAvatarMarkup(state.config.logoUrl)}
					</div>
					<span class="oc-bot-name">${escapeHtml(state.config.agentName)}</span>
				</div>
				<div class="oc-bubble">Thanks ${escapeHtml(state.pendingLeadInfo.name)}! We'll be in touch soon. Feel free to continue chatting!</div>
				<div class="oc-timestamp">${getCurrentTime()}</div>
			`;
      state.messagesContainer.appendChild(thankYouDiv);
      scrollToBottom();
    } else {
      import("./ui.js").then(({ addBotMessage }) => {
        addBotMessage("Sorry, there was an issue saving your information. Please try again later.");
      });
    }
  } catch (error) {
    console.error("Widget: Lead submission failed", error);
    import("./ui.js").then(({ addBotMessage }) => {
      addBotMessage("Sorry, there was an error. Please try again later.");
    });
  }
}

/**
 * Close lead form (for legacy support)
 */
export function closeLeadForm() {
  state.leadCaptureFormShown = false;
  state.leadCaptureStep = 0;
}
