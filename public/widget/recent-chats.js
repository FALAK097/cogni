/**
 * OutCaller Widget - Recent Chats
 * Recent chats view and session switching
 */

import { fetchRecentSessions, fetchSessionHistory } from "./api.js";
import { ICONS, WIDGET_LOGO } from "./constants.js";
import { state } from "./state.js";
import { storeSessionId } from "./storage.js";
import { escapeHtml, formatRelativeTime } from "./utils.js";

/**
 * Render sessions into the list
 */
function renderRecentSessions(recentChatsEl, sessions) {
  const listEl = recentChatsEl.querySelector(".oc-recent-list");
  if (!listEl) return;

  const logoSrc = state.config.logoUrl || WIDGET_LOGO;

  if (sessions.length === 0) {
    listEl.innerHTML = `
			<div class="oc-recent-empty">
				${ICONS.history}
				<div class="oc-recent-empty-text">No recent chats</div>
				<div class="oc-recent-empty-subtext">Start a new conversation to see your chat history here.</div>
			</div>
		`;
    return;
  }

  listEl.innerHTML = sessions
    .map((session) => {
      const title = session.lastMessage || "New conversation";
      const timeAgo = formatRelativeTime(session.lastActivityAt);

      return `
			<div class="oc-recent-item" data-session-id="${escapeHtml(session.id)}" data-browser-session-id="${escapeHtml(session.sessionId)}">
				<div class="oc-recent-item-avatar">
					<img src="${logoSrc}" alt="Logo" />
				</div>
				<div class="oc-recent-item-content">
					<div class="oc-recent-item-title">${escapeHtml(title)}</div>
					<div class="oc-recent-item-meta">
						<span class="oc-recent-item-agent">${escapeHtml(state.config.agentName)}</span>
						<span class="oc-recent-item-dot"></span>
						<span class="oc-recent-item-time">${escapeHtml(timeAgo)}</span>
					</div>
				</div>
				<button class="oc-recent-item-open">
					Open ${ICONS.arrowRight}
				</button>
			</div>
		`;
    })
    .join("");

  // Add click handlers to items
  const items = listEl.querySelectorAll(".oc-recent-item");
  items.forEach((item) => {
    item.addEventListener("click", async () => {
      const sessionDbIdToLoad = item.getAttribute("data-session-id");
      const browserSessionIdToLoad = item.getAttribute("data-browser-session-id");
      await loadSession(sessionDbIdToLoad, browserSessionIdToLoad);
    });
  });
}

/**
 * Refresh recent chats list (called when new messages are sent)
 */
export async function refreshRecentChats() {
  const recentChatsEl = document.getElementById("oc-recent-chats");
  if (!recentChatsEl || !recentChatsEl.classList.contains("oc-active")) {
    // Only refresh if the view is currently open
    return;
  }
  const sessions = await fetchRecentSessions();
  renderRecentSessions(recentChatsEl, sessions);
}

/**
 * Show recent chats view
 */
export async function showRecentChatsView() {
  state.isRecentChatsOpen = true;

  // Create the recent chats container
  const recentChatsEl = document.createElement("div");
  recentChatsEl.className = "oc-recent-chats oc-active";
  recentChatsEl.id = "oc-recent-chats";

  recentChatsEl.innerHTML = `
		<div class="oc-recent-header">
			<button class="oc-recent-back">${ICONS.back}</button>
			<div class="oc-recent-header-content">
				${ICONS.history}
				<span class="oc-recent-title">Recent chats</span>
			</div>
			<button class="oc-recent-new">${ICONS.plus}</button>
		</div>
		<div class="oc-recent-list"></div>
	`;

  state.windowEl.appendChild(recentChatsEl);

  // Add event listeners
  const backBtn = recentChatsEl.querySelector(".oc-recent-back");
  const newBtn = recentChatsEl.querySelector(".oc-recent-new");

  backBtn.addEventListener("click", hideRecentChatsView);
  newBtn.addEventListener("click", async () => {
    hideRecentChatsView();
    const { resetChat } = await import("./ui.js");
    await resetChat();
  });

  // Fetch and render sessions
  const sessions = await fetchRecentSessions();
  renderRecentSessions(recentChatsEl, sessions);
}

/**
 * Load a specific session
 */
async function loadSession(newSessionDbId, newBrowserSessionId) {
  hideRecentChatsView();

  // Show loading state
  state.messagesContainer.innerHTML = `
		<div class="oc-recent-loading" style="height: 200px;">
			<div class="oc-recent-loading-spinner"></div>
		</div>
	`;

  try {
    const data = await fetchSessionHistory(newSessionDbId);

    // Update session IDs
    state.sessionDbId = newSessionDbId;
    state.sessionId = newBrowserSessionId;
    storeSessionId(state.sessionId, state.config.workspaceId);

    // Clear and restore messages
    if (data.messages && data.messages.length > 0) {
      // Import restoreMessages dynamically
      const { restoreMessages } = await import("./ui.js");
      restoreMessages(data.messages);
    } else {
      state.messagesContainer.innerHTML = "";
      const { addBotMessage } = await import("./ui.js");
      addBotMessage(state.config.welcomeMessage);
    }
  } catch (error) {
    console.error("OutCaller Widget: Error loading session", error);
    state.messagesContainer.innerHTML = "";
    const { addBotMessage, resetChat } = await import("./ui.js");
    addBotMessage("Sorry, there was an error loading this conversation. Starting a new chat.");
    await resetChat();
  }
}

/**
 * Hide the recent chats view
 */
export function hideRecentChatsView() {
  state.isRecentChatsOpen = false;
  const recentChatsEl = document.getElementById("oc-recent-chats");
  if (recentChatsEl) {
    recentChatsEl.remove();
  }
}
