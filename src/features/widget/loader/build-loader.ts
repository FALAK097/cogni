export function buildWidgetLoaderSource(baseUrl: string) {
  return `(function () {
  var script = document.currentScript;
  if (!script) return;
  var key = script.getAttribute("data-widget-key");
  if (!key) {
    console.error("[widget] Missing data-widget-key.");
    return;
  }
  if (document.querySelector('iframe[data-widget-frame="' + key + '"]')) return;

  var baseUrl = ${JSON.stringify(baseUrl)};
  var frame = document.createElement("iframe");
  frame.src = baseUrl + "/embed/" + encodeURIComponent(key);
  frame.title = "Support chat";
  frame.setAttribute("data-widget-frame", key);
  frame.setAttribute("allow", "clipboard-write");
  frame.style.position = "fixed";
  frame.style.right = "20px";
  frame.style.bottom = "20px";
  frame.style.width = "56px";
  frame.style.height = "56px";
  frame.style.border = "0";
  frame.style.background = "transparent";
  frame.style.zIndex = "2147483000";
  frame.style.colorScheme = "normal";
  frame.style.transition = "width 180ms ease, height 180ms ease";
  document.body.appendChild(frame);

  var listeners = {};
  function command(method, payload) {
    if (!frame.contentWindow) return;
    frame.contentWindow.postMessage({
      type: "widget:command",
      method: method,
      payload: payload
    }, baseUrl);
  }

  window.Widget = {
    show: function () { command("show"); },
    hide: function () { command("hide"); },
    toggle: function () { command("toggle"); },
    identify: function (customer) { command("identify", customer); },
    destroy: function () {
      window.removeEventListener("message", handleMessage);
      frame.remove();
      delete window.Widget;
    },
    on: function (eventName, handler) {
      listeners[eventName] = listeners[eventName] || [];
      listeners[eventName].push(handler);
      return function () {
        listeners[eventName] = (listeners[eventName] || []).filter(function (item) {
          return item !== handler;
        });
      };
    },
    off: function (eventName, handler) {
      listeners[eventName] = (listeners[eventName] || []).filter(function (item) {
        return item !== handler;
      });
    }
  };

  function handleMessage(event) {
    if (event.origin !== baseUrl || event.source !== frame.contentWindow) return;
    if (!event.data) return;

    if (event.data.type === "widget:event") {
      (listeners[event.data.event] || []).forEach(function (handler) {
        handler();
      });
      return;
    }

    if (event.data.type !== "widget:resize") return;

    frame.style.width = Math.min(event.data.width, window.innerWidth - 24) + "px";
    frame.style.height = Math.min(event.data.height, window.innerHeight - 24) + "px";
    frame.style.left = event.data.position === "LEFT" ? "20px" : "auto";
    frame.style.right = event.data.position === "LEFT" ? "auto" : "20px";
  }

  window.addEventListener("message", handleMessage);
})();`;
}
