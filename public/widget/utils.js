/**
 * Widget - Utility Functions
 * Common helper functions used across the widget
 */

import { ICONS } from "./constants.js";
import { state } from "./state.js";
import remend from "remend";

/**
 * Generate a UUID v4
 */
export function generateUUID() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Escape HTML to prevent XSS
 */
export function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Get current time formatted as HH:MM in IST
 */
export function getCurrentTime() {
  return new Date().toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

/**
 * Format timestamp to HH:MM in IST
 */
export function formatTimestamp(timestamp) {
  if (!timestamp) return getCurrentTime();

  // Backend sends UTC time without timezone indicator - force UTC parsing
  let date;
  if (typeof timestamp === "string") {
    const dateStr =
      timestamp.includes("Z") || timestamp.includes("+") ? timestamp : timestamp + "Z";
    date = new Date(dateStr);
  } else {
    date = new Date(timestamp);
  }

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

/**
 * Format relative time (e.g., "2 hours ago") in IST
 */
export function formatRelativeTime(date) {
  if (!date) return "Just now";

  // Backend sends UTC time without timezone indicator (e.g., "2024-06-11T09:07:00")
  // We need to parse it as UTC, not local time
  let utcTime;

  if (typeof date === "string") {
    // If it's an ISO string without timezone, append 'Z' to indicate UTC
    const dateStr = date.includes("Z") || date.includes("+") ? date : date + "Z";
    utcTime = new Date(dateStr);
  } else {
    utcTime = new Date(date);
  }

  // Check if date is valid
  if (isNaN(utcTime.getTime())) return "Just now";

  // Get current time
  const now = new Date();

  const diffMs = now.getTime() - utcTime.getTime();

  // If the time is in the future, return "Just now"
  if (diffMs < 0) return "Just now";

  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "Just now";
  if (diffMins < 60) return diffMins === 1 ? "1 minute ago" : `${diffMins} minutes ago`;
  if (diffHours < 24) return diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`;
  if (diffDays < 30) return diffDays === 1 ? "1 day ago" : `${diffDays} days ago`;

  // For older dates, show the actual date in IST
  return utcTime.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  });
}

/**
 * Get browser metadata for session tracking
 */
export function getBrowserMetadata() {
  const ua = navigator.userAgent;
  let browser = "Unknown";
  if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Edg")) browser = "Edge";
  else if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Safari")) browser = "Safari";
  else if (ua.includes("Opera") || ua.includes("OPR")) browser = "Opera";

  let os = "Unknown";
  if (ua.includes("Win")) os = "Windows";
  else if (ua.includes("Mac")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

  let deviceType = "desktop";
  if (/Mobi|Android/i.test(ua)) deviceType = "mobile";
  else if (/Tablet|iPad/i.test(ua)) deviceType = "tablet";

  return {
    hostname: window.location.hostname,
    pageUrl: window.location.href,
    referrer: document.referrer || "direct",
    browser,
    os,
    deviceType,
    language: navigator.language || null,
    screenSize: `${window.screen.width}x${window.screen.height}`,
  };
}

/**
 * Scroll messages container to bottom
 */
export function scrollToBottom() {
  if (state.messagesContainer) {
    state.messagesContainer.scrollTop = state.messagesContainer.scrollHeight;
  }
}

/**
 * Format bot message with markdown-like formatting
 */
export function formatBotMessage(text) {
  const config = state.config;

  // Heal incomplete Markdown streaming tokens using remend
  const healed = remend(text || "");

  // First, normalize the text to add newlines before list items
  let normalized = healed
    .replace(/([^\n])- /g, "$1\n- ")
    .replace(/([^\n])(\s{2,}- )/g, "$1\n$2")
    .replace(/\n{2,}/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n");

  // Process markdown-style formatting
  let formatted = normalized.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  // Handle markdown links
  formatted = formatted.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="oc-link">$1</a>',
  );

  // Handle plain URLs
  formatted = formatted.replace(
    /(?<!href="|">)(https?:\/\/[^\s<]+[^\s<.,;:!?)}\]"'])/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="oc-link">$1</a>',
  );

  // Handle inline code
  formatted = formatted.replace(
    /`([^`]+)`/g,
    '<code style="background: ' +
      (config.theme === "dark" ? "#27272a" : "#f4f4f5") +
      '; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 13px;">$1</code>',
  );

  // Protect formatting tags with placeholders
  const strongPlaceholder = "___STRONG___";
  const strongEndPlaceholder = "___STRONGEND___";
  const codePlaceholder = "___CODE___";
  const codeEndPlaceholder = "___CODEEND___";
  const linkPlaceholder = "___LINK___";
  const linkEndPlaceholder = "___LINKEND___";

  formatted = formatted
    .replace(/<strong>/g, strongPlaceholder)
    .replace(/<\/strong>/g, strongEndPlaceholder)
    .replace(/<code([^>]*)>/g, (match) => codePlaceholder + match.slice(5))
    .replace(/<\/code>/g, codeEndPlaceholder)
    .replace(/<a ([^>]*)>/g, (match, attrs) => linkPlaceholder + "{{" + attrs + "}}")
    .replace(/<\/a>/g, linkEndPlaceholder);

  // Escape remaining HTML
  formatted = escapeHtml(formatted);

  // Restore formatting tags
  formatted = formatted
    .replace(new RegExp(strongPlaceholder, "g"), "<strong>")
    .replace(new RegExp(strongEndPlaceholder, "g"), "</strong>")
    .replace(new RegExp(codePlaceholder + " style=&quot;", "g"), '<code style="')
    .replace(/&quot;&gt;/g, '">')
    .replace(new RegExp(codeEndPlaceholder, "g"), "</code>")
    .replace(new RegExp(linkPlaceholder + "\\{\\{([^}]*)\\}\\}", "g"), (match, attrs) => {
      const unescapedAttrs = attrs
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">");
      return "<a " + unescapedAttrs + ">";
    })
    .replace(new RegExp(linkEndPlaceholder, "g"), "</a>");

  // Convert to line elements with bullet handling
  const result = formatted
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return null;
      if (trimmed.startsWith("- ")) {
        return `<div class="oc-bullet">${trimmed.slice(2)}</div>`;
      }
      const indentedMatch = line.match(/^(\s+)- (.*)$/);
      if (indentedMatch) {
        return `<div class="oc-bullet oc-bullet-nested">${indentedMatch[2]}</div>`;
      }
      return `<div class="oc-line">${trimmed}</div>`;
    })
    .filter((line) => line !== null)
    .join("");

  return result;
}

/**
 * Validate email format
 */
export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate Indian phone number (10 digits starting with 6-9)
 */
export function validatePhone(phone) {
  return /^[6-9]\d{9}$/.test(phone);
}

/**
 * Convert ArrayBuffer to Base64
 */
export function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert Float32 audio to PCM16
 */
export function convertToPCM16(float32Array) {
  const pcm16 = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return pcm16;
}

export function resolveLogoUrl(logoUrl) {
  if (logoUrl == null) return null;
  if (typeof logoUrl !== "string") return null;
  const trimmed = logoUrl.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("data:image/")) return trimmed;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return trimmed;
    }
  } catch {
    return null;
  }
  return null;
}

export function renderAvatarMarkup(logoUrl) {
  const resolved = resolveLogoUrl(logoUrl);
  if (resolved) {
    return `<img src="${escapeHtml(resolved)}" alt="" class="oc-avatar-image" />`;
  }
  return `<span class="oc-avatar-icon">${ICONS.chat}</span>`;
}

export function renderBotAvatarMarkup(logoUrl) {
  const resolved = resolveLogoUrl(logoUrl);
  if (resolved) {
    return `<img src="${escapeHtml(resolved)}" alt="" class="oc-bot-avatar-image" />`;
  }
  return `<span class="oc-bot-avatar-icon">${ICONS.sparkle}</span>`;
}

export function attachAvatarImageFallbacks(root) {
  if (!root) return;

  root.querySelectorAll(".oc-avatar-image, .oc-bot-avatar-image").forEach((img) => {
    if (!(img instanceof HTMLImageElement)) return;
    if (img.dataset.fallbackAttached === "true") return;
    img.dataset.fallbackAttached = "true";

    const useBotIcon = img.classList.contains("oc-bot-avatar-image");
    const showFallback = () => {
      const span = document.createElement("span");
      span.className = useBotIcon ? "oc-bot-avatar-icon" : "oc-avatar-icon";
      span.innerHTML = useBotIcon ? ICONS.sparkle : ICONS.chat;
      img.replaceWith(span);
    };

    img.addEventListener("error", showFallback, { once: true });
    if (img.complete && img.naturalWidth === 0) {
      showFallback();
    }
  });
}
