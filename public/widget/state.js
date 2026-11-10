/**
 * Widget - Shared State
 * Centralized mutable state for the widget
 */

import { DEFAULT_CONFIG } from "./constants.js";

// Widget state object - single source of truth
export const state = {
  config: { ...DEFAULT_CONFIG },
  baseUrl: "",
  publicKey: "",
  sessionToken: null,
  preview: false,
  previewMessagePending: false,
  isOpen: false,
  isInitialized: false,
  hasInteracted: false,
  isMenuOpen: false,
  isSending: false,

  // Session state
  sessionId: null,
  visitorId: null,
  sessionDbId: null,
  sessionStartTime: null,
  conversationHistory: [],

  // DOM references
  container: null,
  launcher: null,
  windowEl: null,
  messagesContainer: null,
  input: null,

  // Lead capture state
  leadCaptureFormShown: false,
  leadCaptureEnabled: false,
  leadCaptureKeywords: [],
  leadCaptureStep: 0, // 0=not started, 1=asking name, 2=asking contact, 3=done
  pendingLeadInfo: { name: "", email: "", phone: "" },
  savedLeadInfo: null,

  // Brochure feature state
  brochureEnabled: false,
  brochureSuggestionText: "Receive Brochure",

  pollIntervalId: null,
  activePanel: null,
  ticketsTab: "open",
};

// Helper to reset state for new chat
export function resetChatState() {
  state.hasInteracted = false;
  state.previewMessagePending = false;
  state.conversationHistory = [];
  state.leadCaptureStep = 0;
  state.pendingLeadInfo = { name: "", email: "", phone: "" };
}

// Helper to update config
export function updateConfig(newConfig) {
  state.config = { ...state.config, ...newConfig };
}
