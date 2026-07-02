/**
 * Widget - UI
 * DOM creation, messages, and core UI functionality
 */

import {
  initSessionAPI,
  saveMessage,
  fetchConfig,
  callWidgetChatAPI,
  fetchSessionHistory,
  fetchRecentSessions,
  uploadFile,
} from "./api.js";
import { ICONS } from "./constants.js";
import { DEFAULT_CONFIG } from "./constants.js";
import {
  checkBrochureKeywords,
  extractBrochureSearchQuery,
  searchAndDisplayDocuments,
  restoreDocumentMessage,
} from "./documents.js";
import { createFeedbackButtons, attachFeedbackListeners } from "./feedback.js";
import { detectLeadCapture } from "./lead-capture.js";
import { state, resetChatState } from "./state.js";
import {
  getOrCreateVisitorId,
  getStoredSessionId,
  getStoredSessionToken,
  storeSessionId,
  storeSessionToken,
  getStoredLeadInfo,
} from "./storage.js";
import { applyWidgetStyles } from "./styles.js";
import {
  escapeHtml,
  formatTimestamp,
  formatRelativeTime,
  scrollToBottom,
  formatBotMessage,
  getCurrentTime,
  generateUUID,
  renderAvatarMarkup,
  renderBotAvatarMarkup,
  attachAvatarImageFallbacks,
} from "./utils.js";

/**
 * Create the widget DOM structure
 */
export function createWidget() {
  const config = state.config;

  state.container = document.createElement("div");
  state.container.id = "widget-container";

  // Chat Window
  state.windowEl = document.createElement("div");
  state.windowEl.className = "oc-window";
  state.windowEl.innerHTML = `
		<div class="oc-header">
			<div class="oc-header-left">
				<div class="oc-avatar">
					${renderAvatarMarkup(config.logoUrl)}
					<div class="oc-status-dot"></div>
				</div>
				<div class="oc-agent-info">
					<span class="oc-agent-name">${escapeHtml(config.agentName)}</span>
					<span class="oc-agent-status">Online</span>
				</div>
			</div>
			<div class="oc-header-actions">
				<button class="oc-menu-btn">${ICONS.menu}</button>
			</div>
			<div class="oc-menu-dropdown" id="oc-menu-dropdown">
				<button class="oc-menu-item" data-action="new_chat">
					${ICONS.plus}
					<span>Start a new chat</span>
				</button>
				<button class="oc-menu-item" data-action="recent_chats">
					${ICONS.history}
					<span>Recent chats</span>
				</button>
				<button class="oc-menu-item" data-action="view_tickets">
					${ICONS.ticket}
					<span>View tickets</span>
				</button>
				<button class="oc-menu-item" data-action="end_chat">
					${ICONS.x}
					<span>End chat</span>
				</button>
			</div>
		</div>
		<div class="oc-body"></div>
		<div class="oc-footer">
			<div class="oc-privacy">
				By chatting, you agree to our <a href="${escapeHtml(config.privacyPolicyUrl || "/privacy-policy")}" target="_blank" rel="noopener noreferrer">privacy policy</a>.
			</div>
			<div class="oc-input-container">
				<input type="file" class="oc-file-input" accept="image/*,.pdf,.txt,.docx" hidden />
				<button type="button" class="oc-upload-btn" title="Upload file">${ICONS.fileText}</button>
				<input type="text" class="oc-input" placeholder="${escapeHtml(config.inputPlaceholder)}" />
				<button class="oc-send-btn" disabled>${ICONS.send}</button>
			</div>
			${config.showBranding ? '<div class="oc-branding">Powered by <strong>widget</strong></div>' : ""}
		</div>
	`;

  // Launcher Button
  state.launcher = document.createElement("button");
  state.launcher.className = "oc-launcher";
  state.launcher.innerHTML = `
		<span class="oc-launcher-chat-icon">
			<span class="oc-launcher-icon-wrapper">
				${ICONS.chat}
				<span class="oc-launcher-sparkle">${ICONS.sparkleSmall}</span>
			</span>
		</span>
		<span class="oc-launcher-close-icon">${ICONS.close}</span>
	`;

  state.container.appendChild(state.windowEl);
  state.container.appendChild(state.launcher);
  document.body.appendChild(state.container);

  state.messagesContainer = state.windowEl.querySelector(".oc-body");
  state.input = state.windowEl.querySelector(".oc-input");
  attachAvatarImageFallbacks(state.container);
}

/**
 * Attach all event listeners
 */
export function attachEvents() {
  state.launcher.addEventListener("click", toggleChat);

  const sendBtn = state.windowEl.querySelector(".oc-send-btn");
  sendBtn.addEventListener("click", sendMessage);

  state.input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  // Enable/disable send button based on input
  state.input.addEventListener("input", () => {
    sendBtn.disabled = !state.input.value.trim();
  });

  // Menu toggle
  const menuBtn = state.windowEl.querySelector(".oc-menu-btn");
  const menuDropdown = state.windowEl.querySelector("#oc-menu-dropdown");

  menuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    state.isMenuOpen = !state.isMenuOpen;
    menuDropdown.classList.toggle("is-open", state.isMenuOpen);
  });

  // Close menu when clicking outside
  document.addEventListener("click", () => {
    if (state.isMenuOpen) {
      state.isMenuOpen = false;
      menuDropdown.classList.remove("is-open");
    }
  });

  // Handle menu item clicks
  const menuItems = state.windowEl.querySelectorAll(".oc-menu-item");
  menuItems.forEach((item) => {
    item.addEventListener("click", (e) => {
      e.stopPropagation();
      const action = item.getAttribute("data-action");
      handleMenuAction(action);
      state.isMenuOpen = false;
      menuDropdown.classList.remove("is-open");
    });
  });

  // Attach feedback event listeners
  attachFeedbackListeners();

  const fileInput = state.windowEl.querySelector(".oc-file-input");
  const uploadBtn = state.windowEl.querySelector(".oc-upload-btn");
  if (uploadBtn && fileInput) {
    uploadBtn.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", async () => {
      const file = fileInput.files?.[0];
      fileInput.value = "";
      if (!file) return;
      try {
        await uploadFile(file);
        addUserMessage(`Uploaded ${file.name}`);
        await refreshMessagesFromServer();
      } catch (error) {
        console.error("widget: upload failed", error);
      }
    });
  }
}

/**
 * Handle menu actions
 */
function handleMenuAction(action) {
  switch (action) {
    case "new_chat":
      resetChat();
      break;
    case "recent_chats":
      void showRecentChats();
      break;
    case "view_tickets":
      showTickets();
      break;
    case "end_chat":
      endChat();
      break;
  }
}

function endChat() {
  exitPanelView();
  stopMessagePolling();
  if (state.isOpen) {
    toggleChat();
  }
}

function truncatePreview(text, maxLength = 80) {
  if (!text || text.length <= maxLength) return text || "No messages yet";
  return `${text.slice(0, maxLength).trim()}…`;
}

function enterPanelView(panel) {
  state.activePanel = panel;
  state.windowEl.classList.add("is-panel-view");
  state.windowEl.querySelector(".oc-header")?.classList.add("is-hidden");
  state.windowEl.querySelector(".oc-footer")?.classList.add("is-hidden");
}

function exitPanelView() {
  state.activePanel = null;
  state.windowEl.classList.remove("is-panel-view");
  state.windowEl.querySelector(".oc-header")?.classList.remove("is-hidden");
  state.windowEl.querySelector(".oc-footer")?.classList.remove("is-hidden");
}

function renderPanelShell({ title, titleIcon, bodyHtml, footerHtml = "" }) {
  return `
		<div class="oc-panel-view">
			<div class="oc-panel-header">
				<button type="button" class="oc-panel-back" aria-label="Back">${ICONS.chevronLeft}</button>
				<div class="oc-panel-title">
					<span class="oc-panel-title-icon">${titleIcon}</span>
					<span>${escapeHtml(title)}</span>
				</div>
				<button type="button" class="oc-panel-close" aria-label="Close">${ICONS.x}</button>
			</div>
			<div class="oc-panel-body">${bodyHtml}</div>
			${footerHtml ? `<div class="oc-panel-footer">${footerHtml}</div>` : ""}
		</div>
	`;
}

function attachPanelHandlers(container, handlers = {}) {
  container.querySelector(".oc-panel-back")?.addEventListener("click", () => {
    void handlers.onBack?.();
  });
  container.querySelector(".oc-panel-close")?.addEventListener("click", () => {
    void handlers.onBack?.();
  });
  handlers.onAttach?.(container);
}

function renderRecentChatsEmptyState() {
  return `
		<div class="oc-panel-empty">
			<div class="oc-panel-empty-icon">${ICONS.emptyChats}</div>
			<div class="oc-panel-empty-title">No chats</div>
			<div class="oc-panel-empty-subtitle">Chats with AI and team will be shown here</div>
		</div>
	`;
}

function renderTicketsEmptyState() {
  return `
		<div class="oc-panel-empty">
			<div class="oc-panel-empty-icon">${ICONS.emptyTickets}</div>
			<div class="oc-panel-empty-title">No tickets</div>
			<div class="oc-panel-empty-subtitle">Your tickets will be shown here</div>
		</div>
	`;
}

function renderRecentChatsList(sessions) {
  const listHtml = sessions
    .map(
      (session) => `
		<button
			type="button"
			class="oc-panel-list-item${session.isCurrent ? " is-current" : ""}"
			data-session-id="${escapeHtml(session.id)}"
		>
			<div class="oc-panel-list-preview">${escapeHtml(truncatePreview(session.preview))}</div>
			<div class="oc-panel-list-meta">
				<span>${escapeHtml(formatRelativeTime(session.lastActivityAt))}</span>
				${session.isCurrent ? '<span class="oc-panel-list-badge">Current</span>' : ""}
			</div>
		</button>
	`,
    )
    .join("");

  return `<div class="oc-panel-list">${listHtml}</div>`;
}

function renderRecentChatsPanel(contentHtml, showNewChatButton = false) {
  const footerHtml = showNewChatButton
    ? `<button type="button" class="oc-panel-primary-btn" data-action="start_new_chat">${ICONS.plus}<span>Start a new chat</span></button>`
    : "";

  state.messagesContainer.innerHTML = renderPanelShell({
    title: "Recent chats",
    titleIcon: ICONS.historyCircle,
    bodyHtml: contentHtml,
    footerHtml,
  });

  attachPanelHandlers(state.messagesContainer, {
    onBack: exitRecentChats,
    onAttach: (container) => {
      container.querySelector('[data-action="start_new_chat"]')?.addEventListener("click", () => {
        void resetChat();
      });
    },
  });
}

function bindRecentChatItems(sessions) {
  const items = state.messagesContainer.querySelectorAll(".oc-panel-list-item");
  items.forEach((item) => {
    item.addEventListener("click", () => {
      const sessionId = item.getAttribute("data-session-id");
      const session = sessions.find((entry) => entry.id === sessionId);
      if (session) {
        void switchToSession(session);
      }
    });
  });
}

function renderRecentChatsContent(sessions) {
  if (!sessions.length) {
    renderRecentChatsPanel(renderRecentChatsEmptyState(), true);
    return;
  }

  renderRecentChatsPanel(renderRecentChatsList(sessions), false);
  bindRecentChatItems(sessions);
}

async function showRecentChats() {
  enterPanelView("recent-chats");
  renderRecentChatsPanel(`<div class="oc-panel-loading">Loading recent chats…</div>`, false);

  try {
    const data = await fetchRecentSessions();
    renderRecentChatsContent(data.sessions || []);
  } catch (error) {
    console.error("widget: failed to load recent chats", error);
    renderRecentChatsPanel(
      `<div class="oc-panel-empty"><div class="oc-panel-empty-title">Unable to load recent chats</div></div>`,
      true,
    );
  }
}

function renderTicketsTabs() {
  const isOpen = state.ticketsTab === "open";
  return `
		<div class="oc-panel-tabs">
			<button type="button" class="oc-panel-tab${isOpen ? " is-active" : ""}" data-tab="open">Open</button>
			<button type="button" class="oc-panel-tab${!isOpen ? " is-active" : ""}" data-tab="closed">Closed</button>
		</div>
	`;
}

function renderTicketsPanel() {
  state.messagesContainer.innerHTML = renderPanelShell({
    title: "Tickets",
    titleIcon: ICONS.ticket,
    bodyHtml: `${renderTicketsTabs()}${renderTicketsEmptyState()}`,
  });

  attachPanelHandlers(state.messagesContainer, {
    onBack: exitTickets,
    onAttach: (container) => {
      container.querySelectorAll(".oc-panel-tab").forEach((tab) => {
        tab.addEventListener("click", () => {
          state.ticketsTab = tab.getAttribute("data-tab") === "closed" ? "closed" : "open";
          renderTicketsPanel();
        });
      });
    },
  });
}

function showTickets() {
  state.ticketsTab = "open";
  enterPanelView("tickets");
  renderTicketsPanel();
}

function exitTickets() {
  exitPanelView();
  void restoreChatView();
}

async function restoreChatView() {
  state.messagesContainer.innerHTML = "";

  try {
    const data = await fetchSessionHistory(state.sessionDbId);
    if (data?.messages?.length) {
      restoreMessages(data.messages);
      return;
    }
  } catch (error) {
    console.error("widget: failed to restore current chat", error);
  }

  addBotMessage(state.config.welcomeMessage);
}

async function exitRecentChats() {
  exitPanelView();
  await restoreChatView();
}

async function switchToSession(session) {
  if (session.isCurrent) {
    await exitRecentChats();
    return;
  }

  const scopeKey = state.publicKey || state.config.workspaceId;
  state.sessionDbId = session.id;
  if (!state.preview) {
    state.sessionToken = session.token;
    state.sessionId = session.browserSessionId;
    storeSessionId(state.sessionId, scopeKey);
    storeSessionToken(state.sessionToken, scopeKey);
  }

  exitPanelView();
  resetChatState();
  state.messagesContainer.innerHTML = "";

  try {
    const data = await fetchSessionHistory(session.id);
    if (data?.messages?.length) {
      restoreMessages(data.messages);
      return;
    }
  } catch (error) {
    console.error("widget: failed to load selected chat", error);
  }

  addBotMessage(state.config.welcomeMessage);
}

/**
 * Toggle chat open/closed
 */
export function toggleChat() {
  if (!state.windowEl || !state.launcher) return;

  state.isOpen = !state.isOpen;
  if (state.isOpen) {
    state.windowEl.classList.add("is-open");
    state.launcher.classList.add("is-open");
    hidePreviewMessages();
    setTimeout(() => state.input.focus(), 100);
    startMessagePolling();
  } else {
    state.windowEl.classList.remove("is-open");
    state.launcher.classList.remove("is-open");
    stopMessagePolling();
    if (state.preview && state.config.previewMessages?.length) {
      showPreviewMessages();
    }
  }
}

function startMessagePolling() {
  stopMessagePolling();
  state.pollIntervalId = window.setInterval(() => {
    if (state.isOpen && state.sessionDbId) {
      void refreshMessagesFromServer();
    }
  }, 8000);
}

function stopMessagePolling() {
  if (state.pollIntervalId) {
    window.clearInterval(state.pollIntervalId);
    state.pollIntervalId = null;
  }
}

async function refreshMessagesFromServer() {
  if (!state.sessionDbId || state.activePanel) return;
  try {
    const data = await fetchSessionHistory(state.sessionDbId);
    if (data?.messages?.length) {
      restoreMessages(data.messages);
    }
  } catch (error) {
    console.error("widget: failed to refresh messages", error);
  }
}

/**
 * Initialize session with backend
 */
export async function initSession(options = {}) {
  const forceNew = options.forceNew === true;
  const config = state.config;
  const scopeKey = state.publicKey || config.publicKey || config.workspaceId;

  if (!scopeKey) {
    addBotMessage(config.welcomeMessage);
    return;
  }

  if (state.preview) {
    state.visitorId = getOrCreateVisitorId();
    state.sessionId = forceNew ? generateUUID() : getStoredSessionId(scopeKey) || generateUUID();
    if (forceNew) {
      state.sessionDbId = null;
      state.sessionToken = null;
      storeSessionToken(null, scopeKey);
    }
    state.sessionStartTime = Date.now();
    state.leadCaptureEnabled = false;
    state.brochureEnabled = config.enableBrochure || false;
    state.brochureSuggestionText = config.brochureSuggestionText || "Receive Brochure";
    storeSessionId(state.sessionId, scopeKey);

    try {
      const data = await initSessionAPI(state.publicKey, state.sessionId, state.visitorId, true);
      state.sessionDbId = data.sessionId;
      state.sessionToken = data.token || null;
      storeSessionToken(state.sessionToken, scopeKey);

      if (data.browserSessionId) {
        state.sessionId = data.browserSessionId;
        storeSessionId(state.sessionId, scopeKey);
      }

      if (!data.isNew && data.messages && data.messages.length > 0) {
        restoreMessages(data.messages);
      } else {
        addBotMessage(config.welcomeMessage);
      }
    } catch (error) {
      console.error("widget: Preview session init error", error);
      addBotMessage(config.welcomeMessage);
    }
    return;
  }

  state.visitorId = getOrCreateVisitorId();
  state.sessionId = forceNew ? generateUUID() : getStoredSessionId(scopeKey) || generateUUID();
  if (forceNew) {
    state.sessionDbId = null;
    state.sessionToken = null;
    storeSessionToken(null, scopeKey);
  } else {
    state.sessionToken = getStoredSessionToken(scopeKey);
  }
  storeSessionId(state.sessionId, scopeKey);
  state.sessionStartTime = Date.now();

  state.savedLeadInfo = getStoredLeadInfo();

  try {
    const data = await initSessionAPI(state.publicKey, state.sessionId, state.visitorId, false);

    state.sessionDbId = data.sessionId;
    state.sessionToken = data.token || null;
    storeSessionToken(state.sessionToken, scopeKey);

    if (data.workspaceId) {
      state.config.workspaceId = data.workspaceId;
    }

    state.leadCaptureEnabled = data.enableLeadCapture || false;
    state.leadCaptureKeywords = data.leadCaptureKeywords || [];
    state.brochureEnabled = data.enableBrochure || false;
    state.brochureSuggestionText = data.brochureSuggestionText || "Receive Brochure";

    if (data.browserSessionId) {
      state.sessionId = data.browserSessionId;
      storeSessionId(state.sessionId, scopeKey);
    }

    if (!data.isNew && data.messages && data.messages.length > 0) {
      restoreMessages(data.messages);
    } else {
      addBotMessage(config.welcomeMessage);
    }
  } catch (error) {
    console.error("widget: Session init error", error);
    addBotMessage(config.welcomeMessage);
  }
}

/**
 * Restore messages from session history
 */
export function restoreMessages(messages) {
  state.messagesContainer.innerHTML = "";
  state.hasInteracted = true;
  state.conversationHistory = [];

  const privacyEl = state.windowEl.querySelector(".oc-privacy");
  if (privacyEl) privacyEl.style.display = "none";

  messages.forEach((msg) => {
    if (msg.role === "user") {
      addUserMessage(msg.content, msg.timestamp, true);
      state.conversationHistory.push({ role: "user", content: msg.content });
    } else if (msg.role === "assistant") {
      // Check if this is a document message
      if (msg.metadata?.type === "documents" && msg.metadata?.documents?.length > 0) {
        restoreDocumentMessage(
          msg.content,
          msg.metadata.documents,
          msg.timestamp,
          msg.id,
          msg.feedback,
        );
      } else {
        addBotMessage(msg.content, msg.timestamp, true, msg.id, msg.feedback);
      }
      state.conversationHistory.push({ role: "assistant", content: msg.content });
    }
  });
}

/**
 * Add user message to chat
 */
export function addUserMessage(text, timestamp = null, isRestored = false) {
  const msg = document.createElement("div");
  msg.className = "oc-message user";
  msg.innerHTML = `
		<div class="oc-bubble">${escapeHtml(text)}</div>
		<div class="oc-timestamp">${formatTimestamp(timestamp)}</div>
	`;
  state.messagesContainer.appendChild(msg);
  scrollToBottom();

  if (!isRestored) {
    state.conversationHistory.push({ role: "user", content: text });
  }
}

/**
 * Add bot message to chat
 */
export function addBotMessage(
  text,
  timestamp = null,
  isRestored = false,
  messageId = null,
  existingFeedback = null,
) {
  const msg = document.createElement("div");
  msg.className = "oc-message bot";

  // Only show feedback buttons if messageId exists (not welcome message)
  const feedbackHtml = messageId ? createFeedbackButtons(messageId, existingFeedback) : "";

  msg.innerHTML = `
		<div class="oc-bot-header">
			<div class="oc-bot-avatar">
				${renderBotAvatarMarkup(state.config.logoUrl)}
			</div>
			<span class="oc-bot-name">${escapeHtml(state.config.agentName)}</span>
		</div>
		<div class="oc-bubble">${formatBotMessage(text)}</div>
		${feedbackHtml}
		<div class="oc-timestamp">${formatTimestamp(timestamp)}</div>
	`;
  state.messagesContainer.appendChild(msg);

  attachAvatarImageFallbacks(msg);

  if ((!isRestored && !state.config.hideSuggestionsOnInteract) || !state.hasInteracted) {
    const existingSuggestions = state.messagesContainer.querySelector(".oc-suggestions");
    if (existingSuggestions) existingSuggestions.remove();
    addSuggestedQuestions();
  }

  scrollToBottom();

  if (!isRestored && text !== state.config.welcomeMessage) {
    saveMessage("assistant", text);
  }
}

/**
 * Add suggested questions
 */
export function addSuggestedQuestions() {
  const suggestions = state.config.suggestions || [];
  if (suggestions.length === 0 && !state.brochureEnabled) return;

  const suggestionsEl = document.createElement("div");
  suggestionsEl.className = "oc-suggestions";

  suggestions.forEach((q) => {
    const pill = document.createElement("button");
    pill.className = "oc-pill";
    pill.textContent = q;
    pill.onclick = () => {
      state.input.value = q;
      sendMessage();
    };
    suggestionsEl.appendChild(pill);
  });

  // Add brochure suggestion pill if enabled
  if (state.brochureEnabled) {
    const brochurePill = document.createElement("button");
    brochurePill.className = "oc-pill oc-pill-brochure";
    brochurePill.innerHTML = `${ICONS.fileText} <span>${escapeHtml(state.brochureSuggestionText)}</span>`;
    brochurePill.onclick = () => {
      addUserMessage(state.brochureSuggestionText, null, false);
      state.hasInteracted = true;
      const existingSuggestions = state.messagesContainer.querySelector(".oc-suggestions");
      if (existingSuggestions) existingSuggestions.remove();
      searchAndDisplayDocuments();
    };
    suggestionsEl.appendChild(brochurePill);
  }

  state.messagesContainer.appendChild(suggestionsEl);
  scrollToBottom();
}

/**
 * Show typing indicator
 */
export function showTypingIndicator() {
  const indicator = document.createElement("div");
  indicator.id = "oc-typing-indicator";
  indicator.className = "oc-message bot";
  indicator.innerHTML = `
		<div class="oc-bot-header">
			<div class="oc-bot-avatar">
				${renderBotAvatarMarkup(state.config.logoUrl)}
			</div>
			<span class="oc-bot-name">${escapeHtml(state.config.agentName)}</span>
		</div>
		<div class="oc-bubble oc-typing-bubble">
			<span class="oc-typing-dot"></span>
			<span class="oc-typing-dot"></span>
			<span class="oc-typing-dot"></span>
		</div>
	`;
  state.messagesContainer.appendChild(indicator);
  scrollToBottom();
}

/**
 * Remove typing indicator
 */
export function removeTypingIndicator() {
  const indicator = document.getElementById("oc-typing-indicator");
  if (indicator) indicator.remove();
}

/**
 * Send message
 */
export async function sendMessage() {
  const text = state.input.value.trim();
  if (!text) return;

  if (!state.hasInteracted) {
    state.hasInteracted = true;
    const privacyEl = state.windowEl.querySelector(".oc-privacy");
    if (privacyEl) privacyEl.style.display = "none";
  }

  addUserMessage(text);
  state.input.value = "";

  const sendBtn = state.windowEl.querySelector(".oc-send-btn");
  if (sendBtn) sendBtn.disabled = true;

  if (state.config.hideSuggestionsOnInteract) {
    const suggestions = state.messagesContainer.querySelector(".oc-suggestions");
    if (suggestions) suggestions.remove();
  }

  // Check for brochure/document request keywords
  if (state.brochureEnabled && checkBrochureKeywords(text)) {
    const searchQuery = extractBrochureSearchQuery(text);
    searchAndDisplayDocuments(searchQuery);
    if (sendBtn) sendBtn.disabled = false;
    return;
  }

  // Check for keyword-triggered lead capture BEFORE AI response
  if (state.leadCaptureEnabled && !state.leadCaptureFormShown) {
    const triggered = await detectLeadCapture(text);
    if (triggered) {
      if (sendBtn) sendBtn.disabled = false;
      return;
    }
  }

  showTypingIndicator();
  await callWidgetChat(text, generateUUID());
}

/**
 * Call Widget chat API
 */
async function callWidgetChat(userMessage, interactionId) {
  try {
    const leadInfo = state.savedLeadInfo
      ? {
          name: state.savedLeadInfo.name,
          email: state.savedLeadInfo.email,
          phone: state.savedLeadInfo.phone,
        }
      : null;

    const historyToSend = state.conversationHistory.slice(-20);

    const response = await callWidgetChatAPI(userMessage, historyToSend, leadInfo, interactionId);

    removeTypingIndicator();

    // Create streaming message container
    const msg = document.createElement("div");
    msg.className = "oc-message bot";
    msg.innerHTML = `
			<div class="oc-bot-header">
				<div class="oc-bot-avatar">
					${renderBotAvatarMarkup(state.config.logoUrl)}
				</div>
				<span class="oc-bot-name">${escapeHtml(state.config.agentName)}</span>
			</div>
			<div class="oc-bubble oc-streaming"></div>
			<div class="oc-timestamp">${getCurrentTime()}</div>
		`;
    state.messagesContainer.appendChild(msg);
    const bubble = msg.querySelector(".oc-bubble");

    let fullResponse = "";
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") {
            break;
          } else if (data === "[ERROR]") {
            throw new Error("Stream error from server");
          } else if (data) {
            fullResponse += data;
            bubble.innerHTML = formatBotMessage(fullResponse);
            scrollToBottom();
          }
        }
      }
    }

    // Remove streaming class when done
    bubble.classList.remove("oc-streaming");

    state.conversationHistory.push({ role: "assistant", content: fullResponse });

    // Handle suggestions
    if (!state.config.hideSuggestionsOnInteract || !state.hasInteracted) {
      const existingSuggestions = state.messagesContainer.querySelector(".oc-suggestions");
      if (existingSuggestions) existingSuggestions.remove();
      addSuggestedQuestions();
    }

    // Resolve the message persisted by the chat route and add feedback controls.
    if (fullResponse) {
      const messageId = await saveMessage("assistant", fullResponse);
      if (messageId) {
        const msgEl = bubble.closest(".oc-message");
        if (msgEl) {
          const feedbackHtml = createFeedbackButtons(messageId);
          const timestampEl = msgEl.querySelector(".oc-timestamp");
          if (timestampEl) {
            timestampEl.insertAdjacentHTML("beforebegin", feedbackHtml);
          }
        }
      }
    }

    // Re-enable send button
    const sendBtn = state.windowEl.querySelector(".oc-send-btn");
    if (sendBtn) sendBtn.disabled = false;

    // Check if we should trigger lead capture
    await detectLeadCapture();
  } catch (error) {
    console.error("Widget: chat stream error", error);
    removeTypingIndicator();
    addBotMessage("Sorry, I'm having trouble responding right now. Please try again.");

    const sendBtn = state.windowEl.querySelector(".oc-send-btn");
    if (sendBtn) sendBtn.disabled = false;
  }
}

/**
 * Show preview messages
 */
export function showPreviewMessages() {
  if (state.isOpen || !state.config.previewMessages?.length) return;

  const previewContainer = document.createElement("div");
  previewContainer.className = "oc-preview-container";
  previewContainer.id = "oc-preview-container";

  const closeBtn = document.createElement("button");
  closeBtn.className = "oc-preview-close";
  closeBtn.innerHTML = ICONS.x;
  closeBtn.onclick = (e) => {
    e.stopPropagation();
    hidePreviewMessages();
  };
  previewContainer.appendChild(closeBtn);

  state.config.previewMessages.forEach((msg, idx) => {
    const msgEl = document.createElement("div");
    msgEl.className = "oc-preview-message";
    msgEl.textContent = msg;
    msgEl.style.animationDelay = `${idx * 0.1}s`;
    msgEl.onclick = () => {
      hidePreviewMessages();
      toggleChat();
    };
    previewContainer.appendChild(msgEl);
  });

  state.container.insertBefore(previewContainer, state.launcher);
}

/**
 * Hide preview messages
 */
export function hidePreviewMessages() {
  const preview = document.getElementById("oc-preview-container");
  if (preview) preview.remove();
}

/**
 * Update appearance-related config and refresh injected styles (dashboard preview).
 */
function refreshPreviewDom() {
  if (!state.preview || !state.windowEl) return;

  const config = state.config;
  const agentNameEl = state.windowEl.querySelector(".oc-agent-name");
  if (agentNameEl) {
    agentNameEl.textContent = config.agentName || "Support";
  }

  const avatar = state.windowEl.querySelector(".oc-header .oc-avatar");
  if (avatar) {
    avatar.innerHTML = `${renderAvatarMarkup(config.logoUrl)}<div class="oc-status-dot"></div>`;
    attachAvatarImageFallbacks(avatar);
  }

  if (state.input) {
    state.input.placeholder = config.inputPlaceholder || "Ask a question...";
  }

  const privacyLink = state.windowEl.querySelector(".oc-privacy a");
  if (privacyLink) {
    privacyLink.href = config.privacyPolicyUrl || "/privacy-policy";
  }

  const branding = state.windowEl.querySelector(".oc-branding");
  if (branding) {
    branding.style.display = config.showBranding ? "" : "none";
  }

  if (state.messagesContainer) {
    const messageCount = state.messagesContainer.querySelectorAll(".oc-message").length;
    const shouldRefreshWelcome = !state.hasInteracted && messageCount <= 1;

    if (shouldRefreshWelcome) {
      state.messagesContainer.innerHTML = "";
      state.conversationHistory = [];
      addBotMessage(config.welcomeMessage);
    } else {
      state.messagesContainer.querySelectorAll(".oc-bot-name").forEach((element) => {
        element.textContent = config.agentName || "Support";
      });
      state.messagesContainer.querySelectorAll(".oc-bot-avatar").forEach((element) => {
        element.innerHTML = renderBotAvatarMarkup(config.logoUrl);
      });
      attachAvatarImageFallbacks(state.messagesContainer);

      const existingSuggestions = state.messagesContainer.querySelector(".oc-suggestions");
      if (existingSuggestions) existingSuggestions.remove();
      if (!config.hideSuggestionsOnInteract || !state.hasInteracted) {
        addSuggestedQuestions();
      }
    }
  }

  hidePreviewMessages();
  if (!state.isOpen && config.previewMessages?.length) {
    showPreviewMessages();
  }
}

export async function updateAppearance(userConfig = {}) {
  if (!state.isInitialized) return;
  state.config = { ...state.config, ...userConfig };
  await applyWidgetStyles();
  refreshPreviewDom();
}

function openPreviewWidget() {
  if (!state.preview || !state.windowEl || !state.launcher) return;
  if (state.isOpen) return;
  state.isOpen = true;
  state.windowEl.classList.add("is-open");
  state.launcher.classList.add("is-open");
  hidePreviewMessages();
}

/**
 * Tear down widget DOM and in-memory state (dashboard preview remounts).
 */
export function destroyWidget() {
  hidePreviewMessages();
  const container = document.getElementById("widget-container");
  if (container) container.remove();

  const styles = document.getElementById("widget-styles");
  if (styles) styles.remove();

  state.isInitialized = false;
  state.isOpen = false;
  state.isMenuOpen = false;
  state.container = null;
  state.launcher = null;
  state.windowEl = null;
  state.messagesContainer = null;
  state.input = null;
  state.sessionDbId = null;
  state.sessionToken = null;
  state.preview = false;
  state.activePanel = null;
  state.ticketsTab = "open";
  state.leadCaptureFormShown = false;
  state.leadCaptureEnabled = false;
  state.leadCaptureStep = 0;
  state.pendingLeadInfo = { name: "", email: "", phone: "" };
  state.config = { ...DEFAULT_CONFIG };
  resetChatState();
}

/**
 * Reset chat to initial state
 */
export async function resetChat() {
  const scopeKey = state.publicKey || state.config.publicKey || state.config.workspaceId;

  stopMessagePolling();
  exitPanelView();
  state.messagesContainer.innerHTML = "";
  resetChatState();
  const privacyEl = state.windowEl.querySelector(".oc-privacy");
  if (privacyEl) privacyEl.style.display = "";

  state.sessionId = generateUUID();
  state.sessionDbId = null;
  state.sessionToken = null;

  if (scopeKey) {
    storeSessionId(state.sessionId, scopeKey);
    storeSessionToken(null, scopeKey);
  }

  await initSession({ forceNew: true });
}

/**
 * Initialize the widget
 */
export async function init(userConfig = {}) {
  if (state.isInitialized) {
    console.warn("widget: Already initialized");
    return;
  }

  if (userConfig.publicKey) {
    state.publicKey = userConfig.publicKey;
  }
  state.preview = userConfig.preview === true;

  if (userConfig.publicKey && Object.keys(userConfig).length <= 2 && !userConfig.agentName) {
    const fetchedConfig = await fetchConfig(userConfig.publicKey);
    if (fetchedConfig) {
      state.config = { ...state.config, ...fetchedConfig };
      state.publicKey = fetchedConfig.publicKey || userConfig.publicKey;
    } else {
      console.error("widget: Unable to load config");
      return;
    }
  } else {
    state.config = { ...state.config, ...userConfig };
    if (userConfig.publicKey) {
      state.publicKey = userConfig.publicKey;
    }
  }

  if (typeof userConfig.apiBaseUrl === "string" && userConfig.apiBaseUrl.trim()) {
    state.baseUrl = userConfig.apiBaseUrl.replace(/\/$/, "");
  }

  state.isInitialized = true;

  // Inject CSS
  await applyWidgetStyles();

  // Create DOM elements
  createWidget();

  // Add event listeners
  attachEvents();

  // Initialize session and restore messages (or show welcome)
  await initSession();

  openPreviewWidget();

  // Show preview messages after delay
  if (state.config.previewMessages?.length > 0 && state.config.autoShowPreviewDelay > 0) {
    setTimeout(() => {
      if (!state.isOpen) {
        showPreviewMessages();
      }
    }, state.config.autoShowPreviewDelay);
  }
}

/**
 * Get script info (for auto-initialization)
 */
export function getScriptInfo() {
  // Match both widget.js and widget.bundle.js
  const scripts = document.querySelectorAll('script[src*="widget"]');
  const currentScript = scripts[scripts.length - 1];
  if (currentScript) {
    const src = currentScript.src;
    const apiBaseUrl = currentScript.getAttribute("data-api-base-url");
    // Extract origin (protocol://host:port) for API calls
    if (apiBaseUrl) {
      state.baseUrl = apiBaseUrl.replace(/\/$/, "");
    } else {
      try {
        const url = new URL(src);
        state.baseUrl = url.origin;
      } catch {
        // Fallback for relative URLs
        state.baseUrl = window.location.origin;
      }
    }
    return {
      script: currentScript,
      publicKey: currentScript.getAttribute("data-widget-key"),
    };
  }
  return { script: null, publicKey: null };
}
