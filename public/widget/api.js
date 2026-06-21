/**
 * widget - API
 * Backend API calls for session, messages, and other data
 */

import { state } from "./state.js";
import {
  saveFeedbackToStorage,
  saveLeadToStorage,
  storeSessionId,
  storeSessionToken,
} from "./storage.js";
import { generateUUID, getBrowserMetadata } from "./utils.js";

const buildPublicApiUrl = (path) => `${state.baseUrl}${path}`;

function widgetKeyPath(suffix) {
  return `/api/widget/${encodeURIComponent(state.publicKey)}${suffix}`;
}

async function requestJson(path, options = {}) {
  const headers = new Headers(options.headers);
  if (state.sessionToken) {
    headers.set("Authorization", `Bearer ${state.sessionToken}`);
  }
  const response = await fetch(buildPublicApiUrl(path), { ...options, headers });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json();
}

async function requestOk(path, options = {}) {
  const headers = new Headers(options.headers);
  if (state.sessionToken) {
    headers.set("Authorization", `Bearer ${state.sessionToken}`);
  }
  const response = await fetch(buildPublicApiUrl(path), { ...options, headers });
  return response.ok;
}

export async function fetchConfig(_publicKey) {
  try {
    return await requestJson(widgetKeyPath("/config"));
  } catch (error) {
    console.error("widget: Error fetching config", error);
    return null;
  }
}

export async function initSessionAPI(_publicKey, sessionId, visitorId, preview = false) {
  const metadata = getBrowserMetadata();
  return requestJson(widgetKeyPath("/session"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId,
      visitorId,
      preview,
      metadata,
    }),
  });
}

async function refreshSessionCredentials() {
  const data = await initSessionAPI(state.publicKey, state.sessionId, state.visitorId, false);
  state.sessionDbId = data.sessionId;
  state.sessionId = data.browserSessionId || state.sessionId;
  state.sessionToken = data.token || null;
  const scopeKey = state.publicKey || state.config.workspaceId;
  storeSessionId(state.sessionId, scopeKey);
  storeSessionToken(state.sessionToken, scopeKey);
}

export async function saveMessage(role, content, metadata = {}) {
  if (!state.sessionDbId) return null;

  const msgMetadata = {
    pageUrl: window.location.href,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    ...metadata,
  };

  try {
    const data = await requestJson(widgetKeyPath("/message"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: state.sessionDbId,
        role,
        content,
        metadata: msgMetadata,
      }),
    });
    return data.message?.id || null;
  } catch (error) {
    console.error("widget: Failed to save message", error);
    return null;
  }
}

export async function submitFeedback(messageId, feedback, reason = null) {
  if (!messageId || !state.sessionDbId) return false;

  try {
    const ok = await requestOk(widgetKeyPath("/feedback"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messageId,
        sessionId: state.sessionDbId,
        feedback,
        reason,
      }),
    });

    if (ok) {
      saveFeedbackToStorage(messageId, feedback);
      return true;
    }
    return false;
  } catch (error) {
    console.error("widget: Failed to submit feedback", error);
    return false;
  }
}

export async function fetchSessionHistory(sessionDbId) {
  return requestJson(`${widgetKeyPath("/history")}?sessionId=${encodeURIComponent(sessionDbId)}`);
}

export async function detectLeadCaptureAPI(currentMessage, messageCount, sessionDurationMinutes) {
  try {
    return await requestJson(widgetKeyPath("/lead-capture/detect"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: state.sessionDbId,
        currentMessage,
        messageCount,
        sessionDurationMinutes,
      }),
    });
  } catch {
    return { triggered: false };
  }
}

export async function submitLeadCaptureAPI(leadData) {
  return requestOk(widgetKeyPath("/lead-capture/submit"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: state.sessionDbId,
      ...leadData,
    }),
  });
}

export async function searchDocuments(searchQuery = null) {
  return requestJson(widgetKeyPath("/documents"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      searchQuery,
    }),
  });
}

export async function uploadFile(file, canRetry = true, interactionId = generateUUID()) {
  if (state.preview) {
    throw new Error("Uploads are disabled in dashboard preview");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("sessionId", state.sessionId);
  formData.append("visitorId", state.visitorId);
  formData.append("interactionId", interactionId);
  formData.append("metadata", JSON.stringify(getBrowserMetadata()));

  const response = await fetch(buildPublicApiUrl(widgetKeyPath("/upload")), {
    method: "POST",
    headers: state.sessionToken
      ? {
          Authorization: `Bearer ${state.sessionToken}`,
        }
      : {},
    body: formData,
  });

  if (!response.ok) {
    if (response.status === 401 && canRetry) {
      await refreshSessionCredentials();
      return uploadFile(file, false, interactionId);
    }
    throw new Error(`Upload failed: ${response.status}`);
  }

  const data = await response.json();
  if (data.sessionId && data.token) {
    state.sessionDbId = data.sessionId;
    state.sessionToken = data.token;
    storeSessionToken(data.token, state.publicKey || state.config.workspaceId);
  }
  return data;
}

export async function identifyVisitor(customer = {}) {
  state.savedLeadInfo = {
    name: typeof customer.name === "string" ? customer.name : "",
    email: typeof customer.email === "string" ? customer.email : "",
    phone: typeof customer.phone === "string" ? customer.phone : "",
  };
  saveLeadToStorage(state.savedLeadInfo);
  if (!state.sessionToken) {
    return { ok: true, pending: true };
  }

  return requestJson(widgetKeyPath("/identify"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: state.sessionToken ? `Bearer ${state.sessionToken}` : "",
    },
    body: JSON.stringify(customer),
  });
}

export async function callWidgetChatAPI(
  userMessage,
  historyToSend,
  leadInfo = null,
  interactionId,
  canRetry = true,
) {
  const metadata = getBrowserMetadata();
  const response = await fetch(buildPublicApiUrl(widgetKeyPath("/chat")), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(state.sessionToken ? { Authorization: `Bearer ${state.sessionToken}` } : {}),
    },
    body: JSON.stringify({
      sessionId: state.sessionId,
      interactionId,
      visitorId: state.visitorId,
      message: userMessage,
      history: historyToSend,
      leadInfo,
      preview: state.preview,
      metadata,
    }),
  });

  if (!response.ok) {
    if (response.status === 401 && canRetry && !state.preview) {
      await refreshSessionCredentials();
      return callWidgetChatAPI(userMessage, historyToSend, leadInfo, interactionId, false);
    }
    throw new Error(`Chat API error: ${response.status}`);
  }

  const sessionId = response.headers.get("X-Widget-Session-Id");
  const sessionToken = response.headers.get("X-Widget-Session-Token");
  if (sessionId && sessionToken) {
    state.sessionDbId = sessionId;
    state.sessionToken = sessionToken;
    storeSessionToken(sessionToken, state.publicKey || state.config.workspaceId);
  }

  return response;
}
