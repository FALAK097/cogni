/**
 * OutCaller Widget - Storage
 * localStorage operations for session, visitor, feedback, and lead data
 */

import { STORAGE_KEYS } from "./constants.js";
import { generateUUID } from "./utils.js";

/**
 * Get or create visitor ID from localStorage
 */
export function getOrCreateVisitorId() {
  let id = localStorage.getItem(STORAGE_KEYS.VISITOR);
  if (!id) {
    id = generateUUID();
    localStorage.setItem(STORAGE_KEYS.VISITOR, id);
  }
  return id;
}

/**
 * Get stored session ID from localStorage
 */
export function getStoredSessionId(workspaceId) {
  const scopedKey = getWorkspaceStorageKey(STORAGE_KEYS.SESSION, workspaceId);
  if (scopedKey) {
    return localStorage.getItem(scopedKey);
  }
  return localStorage.getItem(STORAGE_KEYS.SESSION);
}

/**
 * Store session ID in localStorage
 */
export function storeSessionId(id, workspaceId) {
  const scopedKey = getWorkspaceStorageKey(STORAGE_KEYS.SESSION, workspaceId);
  localStorage.setItem(scopedKey || STORAGE_KEYS.SESSION, id);
  if (scopedKey) {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
  }
}

function getWorkspaceStorageKey(baseKey, workspaceId) {
  if (typeof workspaceId !== "string" || !workspaceId.trim()) return null;
  return `${baseKey}:${workspaceId.trim()}`;
}

/**
 * Get feedback storage from localStorage
 */
export function getFeedbackStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.FEEDBACK);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

/**
 * Save feedback to localStorage
 */
export function saveFeedbackToStorage(messageId, feedback) {
  try {
    const stored = getFeedbackStorage();
    stored[messageId] = feedback;
    localStorage.setItem(STORAGE_KEYS.FEEDBACK, JSON.stringify(stored));
  } catch (error) {
    console.error("OutCaller Widget: Failed to save feedback to storage", error);
  }
}

/**
 * Get stored lead info from localStorage
 */
export function getStoredLeadInfo() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.LEAD);
    if (stored) {
      const lead = JSON.parse(stored);
      // Validate that lead has at least name and one contact method
      if (lead.name && (lead.email || lead.phone)) {
        return lead;
      }
    }
  } catch (error) {
    console.error("OutCaller Widget: Failed to get stored lead info", error);
  }
  return null;
}

/**
 * Save lead info to localStorage
 */
export function saveLeadToStorage(leadInfo) {
  try {
    localStorage.setItem(STORAGE_KEYS.LEAD, JSON.stringify(leadInfo));
  } catch (error) {
    console.error("OutCaller Widget: Failed to save lead to storage", error);
  }
}
