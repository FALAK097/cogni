/**
 * widget Echo - Main Entry Point
 */

import { closeLeadForm } from "./widget/lead-capture.js";
import { state } from "./widget/state.js";
import { destroyWidget, init, toggleChat, getScriptInfo } from "./widget/ui.js";

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
  toggle: toggleChat,
  open: () => {
    if (!state.isOpen) toggleChat();
  },
  close: () => {
    if (state.isOpen) toggleChat();
  },
  identify: async (customer) => {
    const { identifyVisitor } = await import("./widget/api.js");
    return identifyVisitor(customer);
  },
  closeLeadForm,
};

window.OutCallerWidget = window.Widget;
