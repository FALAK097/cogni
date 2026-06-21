/**
 * widget - Main Entry Point
 */

import { closeLeadForm } from "./widget/lead-capture.js";
import { state } from "./widget/state.js";
import { destroyWidget, init, toggleChat, getScriptInfo } from "./widget/ui.js";

const events = new EventTarget();

function emit(name, detail) {
  events.dispatchEvent(new CustomEvent(name, { detail }));
}

function show() {
  if (!state.isOpen) {
    toggleChat();
    emit("open");
  }
}

function hide() {
  if (state.isOpen) {
    toggleChat();
    emit("close");
  }
}

function toggle() {
  const wasOpen = state.isOpen;
  toggleChat();
  emit(wasOpen ? "close" : "open");
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
  show,
  hide,
  toggle,
  open: show,
  close: hide,
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
