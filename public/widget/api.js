/**
 * widget Echo - API
 * Backend API calls for session, messages, and other data
 */

import { state } from "./state.js";
import { saveFeedbackToStorage } from "./storage.js";
import { getBrowserMetadata } from "./utils.js";

const buildPublicApiUrl = (path) => `${state.baseUrl}${path}`;

function widgetKeyPath(suffix) {
  return `/api/widget/${encodeURIComponent(state.publicKey)}${suffix}`;
}

async function requestJson(path, options = {}) {
  const response = await fetch(buildPublicApiUrl(path), options);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json();
}

async function requestOk(path, options = {}) {
  const response = await fetch(buildPublicApiUrl(path), options);
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

export async function initSessionAPI(_publicKey, sessionId, visitorId) {
  const metadata = getBrowserMetadata();
  return requestJson(widgetKeyPath("/session"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId,
      visitorId,
      metadata: {
        ...metadata,
        clientIp: state.publicIp || null,
      },
    }),
  });
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

export async function fetchRecentSessions() {
  if (!state.publicKey || !state.visitorId) {
    return [];
  }

  try {
    const data = await requestJson(
      `${widgetKeyPath("/sessions")}?visitorId=${encodeURIComponent(state.visitorId)}`,
    );
    return data.sessions || [];
  } catch (error) {
    console.error("widget: Error fetching recent sessions", error);
    return [];
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

export async function uploadFile(file) {
  if (!state.sessionToken) {
    throw new Error("Session required");
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(buildPublicApiUrl(widgetKeyPath("/upload")), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${state.sessionToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status}`);
  }

  return response.json();
}

export async function identifyVisitor(customer = {}) {
  return requestJson(widgetKeyPath("/identify"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: state.sessionToken ? `Bearer ${state.sessionToken}` : "",
    },
    body: JSON.stringify(customer),
  });
}

export async function callEchoChatAPI(userMessage, historyToSend, leadInfo = null) {
  const response = await fetch(buildPublicApiUrl(widgetKeyPath("/chat")), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(state.sessionToken ? { Authorization: `Bearer ${state.sessionToken}` } : {}),
    },
    body: JSON.stringify({
      sessionId: state.sessionId,
      message: userMessage,
      history: historyToSend,
      leadInfo,
    }),
  });

  if (!response.ok) {
    throw new Error(`Chat API error: ${response.status}`);
  }

  return response;
}
