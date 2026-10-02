/**
 * widget - Main Entry Point
 */

import { closeLeadForm } from "./widget/lead-capture.js";
import { state } from "./widget/state.js";
import {
  destroyWidget,
  init,
  resetChat,
  toggleChat,
  getScriptInfo,
  updateAppearance,
} from "./widget/ui.js";

const events = new EventTarget();

function emit(name, detail) {
  events.dispatchEvent(new CustomEvent(name, { detail }));
}

function show() {
  if (!state.windowEl || !state.launcher) return;
  if (!state.isOpen) {
    toggleChat();
    emit("open");
  }
}

function hide() {
  if (!state.windowEl || !state.launcher) return;
  if (state.isOpen) {
    toggleChat();
    emit("close");
  }
}

function toggle() {
  if (!state.windowEl || !state.launcher) return;
  const wasOpen = state.isOpen;
  toggleChat();
  emit(wasOpen ? "close" : "open");
}

async function resetPreview() {
  if (!state.preview || !state.isInitialized) return false;
  await resetChat();
  return true;
}

(function autoInit() {
  const { publicKey } = getScriptInfo();
  if (publicKey) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => init({ publicKey }));
    } else {
      init({ publicKey });
    }
  }
})();

window.Widget = {
  init,
  destroy: destroyWidget,
  updateAppearance,
  show,
  hide,
  toggle,
  open: show,
  close: hide,
  resetPreview,
  on: (name, listener) => events.addEventListener(name, listener),
  off: (name, listener) => events.removeEventListener(name, listener),
  identify: async (customer) => {
    const { identifyVisitor } = await import("./widget/api.js");
    const result = await identifyVisitor(customer);
    emit("identify", customer);
    return result;
  },
  closeLeadForm,
};
