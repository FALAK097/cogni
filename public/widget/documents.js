/**
 * Widget - Documents/Brochure
 * Document search and display functionality
 */

import { searchDocuments, saveMessage } from "./api.js";
import { renderBotAvatarMarkup } from "./utils.js";
import { ICONS, BROCHURE_KEYWORDS } from "./constants.js";
import { state } from "./state.js";
import {
  escapeHtml,
  getSafeDocumentHref,
  scrollToBottom,
  getCurrentTime,
  formatBotMessage,
} from "./utils.js";

export function normalizeWidgetDocument(doc) {
  return {
    fileName: doc.fileName || doc.title || doc.name || doc.documentName || "Document",
    description: doc.description || doc.documentDescription || "",
    fileUrl: doc.fileUrl || doc.url || "",
  };
}

export function renderDocumentCard(doc) {
  const { fileName, description, fileUrl } = normalizeWidgetDocument(doc);
  const href = getSafeDocumentHref(fileUrl);
  const action = href
    ? `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" class="oc-document-download" title="Open document in a new tab" aria-label="Open ${escapeHtml(fileName)} in a new tab">${ICONS.externalLink}</a>`
    : "";

  return `
			<div class="oc-document-card">
				<div class="oc-document-icon">${ICONS.fileText}</div>
				<div class="oc-document-info">
					<p class="oc-document-name">${escapeHtml(fileName)}</p>
					${description ? `<p class="oc-document-desc">${escapeHtml(description)}</p>` : ""}
				</div>
				${action}
			</div>
		`;
}

/**
 * Check if message contains brochure-related keywords
 */
export function checkBrochureKeywords(message) {
  const lowerMessage = message.toLowerCase();
  return BROCHURE_KEYWORDS.some((keyword) => lowerMessage.includes(keyword));
}

/**
 * Extract search query from brochure request message
 */
export function extractBrochureSearchQuery(message) {
  const patterns = [
    /brochure\s+(?:for|of|about)\s+(.+)/i,
    /document\s+(?:for|of|about)\s+(.+)/i,
    /send\s+(?:me\s+)?(?:the\s+)?brochure\s+(?:for|of|about)\s+(.+)/i,
    /get\s+(?:me\s+)?(?:the\s+)?brochure\s+(?:for|of|about)\s+(.+)/i,
    /show\s+(?:me\s+)?(?:the\s+)?brochure\s+(?:for|of|about)\s+(.+)/i,
    /(.+?)\s+brochure/i,
    /(.+?)\s+document/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      let query = match[1].trim();
      query = query.replace(/\s*(please|thanks|thank you|now)$/i, "").trim();
      if (query.length > 2) {
        return query;
      }
    }
  }

  return null;
}

/**
 * Search and display documents/brochures
 */
export async function searchAndDisplayDocuments(searchQuery = null) {
  // Show loading message
  const loadingDiv = document.createElement("div");
  loadingDiv.className = "oc-message bot";
  loadingDiv.id = "oc-documents-loading";
  loadingDiv.innerHTML = `
		<div class="oc-bot-header">
			<div class="oc-bot-avatar">
				${renderBotAvatarMarkup(state.config.logoUrl)}
			</div>
			<span class="oc-bot-name">${escapeHtml(state.config.agentName)}</span>
		</div>
		<div class="oc-bubble">Looking for documents...</div>
	`;
  state.messagesContainer.appendChild(loadingDiv);
  scrollToBottom();

  try {
    const data = await searchDocuments(searchQuery);

    // Remove loading message
    const loadingEl = document.getElementById("oc-documents-loading");
    if (loadingEl) loadingEl.remove();

    const documents = data.documents || [];

    if (documents.length === 0) {
      import("./ui.js").then(({ addBotMessage }) => {
        addBotMessage(
          "I couldn't find any documents matching your request. Is there something else I can help you with?",
        );
      });
      return;
    }

    // Create document display message
    const docDiv = document.createElement("div");
    docDiv.className = "oc-message bot";

    const documentsHtml = `<div class="oc-documents">${documents.map(renderDocumentCard).join("")}</div>`;

    docDiv.innerHTML = `
			<div class="oc-bot-header">
				<div class="oc-bot-avatar">
					${renderBotAvatarMarkup(state.config.logoUrl)}
				</div>
				<span class="oc-bot-name">${escapeHtml(state.config.agentName)}</span>
			</div>
			<div class="oc-bubble">
				Here are the documents I found for you:
				${documentsHtml}
			</div>
			<div class="oc-timestamp">${getCurrentTime()}</div>
		`;
    state.messagesContainer.appendChild(docDiv);
    scrollToBottom();

    // Save document message with metadata
    const docMetadata = {
      type: "documents",
      documents: documents.map(normalizeWidgetDocument),
    };
    saveMessage("assistant", "Here are the documents I found for you:", docMetadata);
  } catch (error) {
    console.error("Widget: Document fetch failed", error);

    // Remove loading message if still there
    const loadingEl = document.getElementById("oc-documents-loading");
    if (loadingEl) loadingEl.remove();

    import("./ui.js").then(({ addBotMessage }) => {
      addBotMessage("Sorry, there was an error retrieving the documents. Please try again later.");
    });
  }
}

/**
 * Restore document message from history
 */
export function restoreDocumentMessage(text, documents, timestamp, messageId, existingFeedback) {
  const msg = document.createElement("div");
  msg.className = "oc-message bot";

  let documentsHtml = '<div class="oc-documents">';
  documentsHtml += documents.map(renderDocumentCard).join("");
  documentsHtml += "</div>";

  // Import feedback functions dynamically
  import("./feedback.js").then(({ createFeedbackButtons }) => {
    const feedbackHtml = messageId ? createFeedbackButtons(messageId, existingFeedback) : "";
    const formattedTimestamp = timestamp
      ? new Date(timestamp).toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Kolkata",
        })
      : new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Kolkata",
        });

    msg.innerHTML = `
			<div class="oc-bot-header">
				<div class="oc-bot-avatar">
					${renderBotAvatarMarkup(state.config.logoUrl)}
				</div>
				<span class="oc-bot-name">${escapeHtml(state.config.agentName)}</span>
			</div>
			<div class="oc-bubble">
				${formatBotMessage(text)}
				${documentsHtml}
			</div>
			${feedbackHtml}
			<div class="oc-timestamp">${formattedTimestamp}</div>
		`;
    state.messagesContainer.appendChild(msg);
    scrollToBottom();
  });
}
