/**
 * OutCaller Widget - Lead Capture
 * Conversational lead capture functionality
 */

import { detectLeadCaptureAPI, submitLeadCaptureAPI } from "./api.js";
import { ICONS, WIDGET_LOGO } from "./constants.js";
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
    console.error("OutCaller Widget: Lead capture detection failed", error);
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
 * Ask for user's name
 */
function askForName() {
  const logoSrc = state.config.logoUrl || WIDGET_LOGO;

  const questionDiv = document.createElement("div");
  questionDiv.className = "oc-message bot oc-lead-question";
  questionDiv.id = "oc-lead-step-1";
  questionDiv.innerHTML = `
		<div class="oc-bot-header">
			<div class="oc-bot-avatar">
				<img src="${logoSrc}" alt="Logo" />
			</div>
			<span class="oc-bot-name">${escapeHtml(state.config.agentName)}</span>
		</div>
		<div class="oc-bubble">I'd love to help you further! May I have your name?</div>
		<div class="oc-lead-input-container" id="oc-name-input-container">
			<input type="text" class="oc-lead-input" id="oc-lead-name-input" placeholder="Your name" />
			<button class="oc-lead-submit-btn" id="oc-lead-name-btn" disabled>${ICONS.send}</button>
		</div>
	`;
  state.messagesContainer.appendChild(questionDiv);
  scrollToBottom();

  const inputEl = document.getElementById("oc-lead-name-input");
  const btnEl = document.getElementById("oc-lead-name-btn");

  inputEl.addEventListener("input", () => {
    btnEl.disabled = !inputEl.value.trim();
  });

  inputEl.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && inputEl.value.trim()) {
      handleNameSubmit();
    }
  });

  btnEl.addEventListener("click", handleNameSubmit);
  setTimeout(() => inputEl.focus(), 100);
}

/**
 * Handle name submission
 */
function handleNameSubmit() {
  const inputEl = document.getElementById("oc-lead-name-input");
  const name = inputEl.value.trim();
  if (!name) return;

  state.pendingLeadInfo.name = name;

  // Import addUserMessage dynamically to avoid circular dependency
  import("./ui.js").then(({ addUserMessage }) => {
    addUserMessage(name, null, true);
  });

  // Remove the input container
  const container = document.getElementById("oc-name-input-container");
  if (container) container.remove();

  // Move to email step
  state.leadCaptureStep = 2;
  askForEmail();
}

/**
 * Ask for user's email
 */
function askForEmail() {
  const logoSrc = state.config.logoUrl || WIDGET_LOGO;

  const questionDiv = document.createElement("div");
  questionDiv.className = "oc-message bot oc-lead-question";
  questionDiv.id = "oc-lead-step-2";
  questionDiv.innerHTML = `
		<div class="oc-bot-header">
			<div class="oc-bot-avatar">
				<img src="${logoSrc}" alt="Logo" />
			</div>
			<span class="oc-bot-name">${escapeHtml(state.config.agentName)}</span>
		</div>
		<div class="oc-bubble">Nice to meet you, ${escapeHtml(state.pendingLeadInfo.name)}! What's your email address?</div>
		<div class="oc-lead-input-container" id="oc-email-input-container">
			<input type="email" class="oc-lead-input" id="oc-lead-email-input" placeholder="your@email.com" />
			<button class="oc-lead-submit-btn" id="oc-lead-email-btn" disabled>${ICONS.send}</button>
		</div>
	`;
  state.messagesContainer.appendChild(questionDiv);
  scrollToBottom();

  const inputEl = document.getElementById("oc-lead-email-input");
  const btnEl = document.getElementById("oc-lead-email-btn");

  inputEl.addEventListener("input", () => {
    btnEl.disabled = !validateEmail(inputEl.value.trim());
  });

  inputEl.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && validateEmail(inputEl.value.trim())) {
      handleEmailSubmit();
    }
  });

  btnEl.addEventListener("click", handleEmailSubmit);
  setTimeout(() => inputEl.focus(), 100);
}

/**
 * Handle email submission
 */
function handleEmailSubmit() {
  const inputEl = document.getElementById("oc-lead-email-input");
  const email = inputEl.value.trim();
  if (!email) return;

  state.pendingLeadInfo.email = email;

  // Import addUserMessage dynamically to avoid circular dependency
  import("./ui.js").then(({ addUserMessage }) => {
    addUserMessage(email, null, true);
  });

  // Remove the input container
  const container = document.getElementById("oc-email-input-container");
  if (container) container.remove();

  // Move to phone step
  state.leadCaptureStep = 3;
  askForPhone();
}

/**
 * Ask for user's phone
 */
function askForPhone() {
  const logoSrc = state.config.logoUrl || WIDGET_LOGO;

  const questionDiv = document.createElement("div");
  questionDiv.className = "oc-message bot oc-lead-question";
  questionDiv.id = "oc-lead-step-3";
  questionDiv.innerHTML = `
		<div class="oc-bot-header">
			<div class="oc-bot-avatar">
				<img src="${logoSrc}" alt="Logo" />
			</div>
			<span class="oc-bot-name">${escapeHtml(state.config.agentName)}</span>
		</div>
		<div class="oc-bubble">Great! And what's your phone number? (optional)</div>
		<div class="oc-lead-input-container" id="oc-phone-input-container">
			<span class="oc-lead-prefix">+91</span>
			<input type="tel" class="oc-lead-input" id="oc-lead-phone-input" placeholder="9876543210" maxlength="10" />
			<button class="oc-lead-submit-btn" id="oc-lead-phone-btn" disabled>${ICONS.send}</button>
		</div>
		<button class="oc-lead-skip-btn" id="oc-lead-phone-skip">Skip this step</button>
	`;
  state.messagesContainer.appendChild(questionDiv);
  scrollToBottom();

  const inputEl = document.getElementById("oc-lead-phone-input");
  const btnEl = document.getElementById("oc-lead-phone-btn");
  const skipBtn = document.getElementById("oc-lead-phone-skip");

  inputEl.addEventListener("input", (e) => {
    // Only allow digits
    e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10);
    btnEl.disabled = !validatePhone(inputEl.value.trim());
  });

  inputEl.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && validatePhone(inputEl.value.trim())) {
      handlePhoneSubmit();
    }
  });

  btnEl.addEventListener("click", handlePhoneSubmit);
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

  // Remove the input container and skip button
  const container = document.getElementById("oc-phone-input-container");
  if (container) container.remove();
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
  const phone = inputEl.value.trim();
  if (!phone) return;

  state.pendingLeadInfo.phone = "+91" + phone;

  // Import addUserMessage dynamically to avoid circular dependency
  import("./ui.js").then(({ addUserMessage }) => {
    addUserMessage("+91 " + phone, null, true);
  });

  // Remove the input container
  const container = document.getElementById("oc-phone-input-container");
  if (container) container.remove();

  // Submit the lead
  state.leadCaptureStep = 4;
  submitLeadCapture();
}

/**
 * Submit lead capture data to backend
 */
async function submitLeadCapture() {
  const logoSrc = state.config.logoUrl || WIDGET_LOGO;

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
						<img src="${logoSrc}" alt="Logo" />
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
    console.error("OutCaller Widget: Lead submission failed", error);
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
