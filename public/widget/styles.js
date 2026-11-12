/**
 * Widget - Styles
 * CSS injection for the widget
 */

import { state } from "./state.js";

const FONT_STYLESHEETS = {
  Inter: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap",
  Roboto: "https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600&display=swap",
  "Open Sans": "https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600&display=swap",
};

function resolveFontFamily(fontFamily) {
  const stacks = {
    Inter: "'Inter', ui-sans-serif, system-ui, sans-serif",
    Geist: "'Geist', 'Geist Fallback', ui-sans-serif, system-ui, sans-serif",
    "System UI": "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    Roboto: "'Roboto', ui-sans-serif, system-ui, sans-serif",
    "Open Sans": "'Open Sans', ui-sans-serif, system-ui, sans-serif",
  };
  return stacks[fontFamily] || stacks.Inter;
}

function ensureWidgetFont(fontFamily) {
  const href = FONT_STYLESHEETS[fontFamily];
  if (!href) return Promise.resolve();

  const id = `widget-font-${fontFamily.replace(/\s+/g, "-").toLowerCase()}`;
  const existing = document.getElementById(id);
  if (existing) {
    return document.fonts?.ready ?? Promise.resolve();
  }

  return new Promise((resolve) => {
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = href;
    link.onload = () => {
      void (document.fonts?.ready ?? Promise.resolve()).then(resolve).catch(() => resolve());
    };
    link.onerror = () => resolve();
    document.head.appendChild(link);
  });
}

/**
 * Load webfonts (when needed) and inject widget CSS.
 */
export async function applyWidgetStyles() {
  await ensureWidgetFont(state.config.fontFamily || "Inter");
  injectStyles();
}

/**
 * Inject all widget CSS styles
 */
export function injectStyles() {
  const config = state.config;
  const baseFontSize = config.fontSize || "14px";
  const panelBg = config.backgroundColor || (config.theme === "dark" ? "#09090b" : "#ffffff");
  const panelText = config.textColor || (config.theme === "dark" ? "#fafafa" : "#18181b");
  const panelMuted = config.theme === "dark" ? "#a1a1aa" : "#71717a";
  const panelBorder = config.borderColor || (config.theme === "dark" ? "#27272a" : "#e4e4e7");
  const panelSubtleBg = config.theme === "dark" ? "#27272a" : "#f4f4f5";
  const panelHoverBg = config.theme === "dark" ? "#3f3f46" : "#fafafa";
  const panelCurrentBg =
    config.theme === "dark" ? `${config.primaryColor}26` : `${config.primaryColor}14`;

  const style = document.createElement("style");
  style.id = "widget-styles";
  const existing = document.getElementById("widget-styles");
  if (existing) existing.remove();
  const containerPositioning = state.preview
    ? `position: absolute;
			inset: 0;
			width: 100%;
			height: 100%;
			bottom: auto;
			right: auto;
			left: auto;`
    : `position: fixed;
			${config.position === "bottom-left" ? "left: 20px;" : "right: 20px;"}
			bottom: 20px;`;

  const previewWindowStyles = state.preview
    ? `position: relative;
			bottom: auto;
			right: auto;
			left: auto;
			width: 100%;
			max-width: 100%;
			height: auto;
			max-height: calc(100% - 64px);`
    : `position: absolute;
			bottom: ${config.launcherSize === "lg" ? "72px" : config.launcherSize === "sm" ? "52px" : "62px"};
			${config.position === "bottom-left" ? "left: 0;" : "right: 0;"}
			width: 350px;
			max-width: calc(100vw - 40px);
			height: 600px;
			max-height: calc(100vh - 100px);`;

  const previewBubbleStyles = state.preview
    ? `position: relative;
			bottom: auto;
			right: auto;
			left: auto;
			width: 288px;
			max-width: 100%;
			${config.position === "bottom-left" ? "align-items: flex-start;" : "align-items: flex-end;"}`
    : `position: absolute;
			bottom: ${config.launcherSize === "lg" ? "72px" : config.launcherSize === "sm" ? "52px" : "62px"};
			${config.position === "bottom-left" ? "left: 0;" : "right: 0;"}
			width: 288px;
			${config.position === "bottom-left" ? "align-items: flex-start;" : "align-items: flex-end;"}`;

  style.innerHTML = `
		#widget-container {
			--oc-font-family: ${resolveFontFamily(config.fontFamily || "Inter")};
			--oc-font-size: ${baseFontSize};
			--oc-text-color: ${panelText};
			--oc-text-muted: ${panelMuted};
			font-family: var(--oc-font-family);
			font-size: var(--oc-font-size);
			${containerPositioning}
			z-index: 999999;
		}

		#widget-container * {
			box-sizing: border-box;
		}

		#widget-container .oc-window,
		#widget-container .oc-preview-container {
			font-family: inherit;
			font-size: inherit;
		}

		.oc-launcher {
			width: ${config.launcherSize === "lg" ? "56px" : config.launcherSize === "sm" ? "40px" : "48px"};
			height: ${config.launcherSize === "lg" ? "56px" : config.launcherSize === "sm" ? "40px" : "48px"};
			border-radius: 50%;
			background-color: ${config.primaryColor};
			border: none;
			cursor: pointer;
			display: flex;
			align-items: center;
			justify-content: center;
			box-shadow: ${config.shadowSize === "lg" ? "0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)" : config.shadowSize === "none" ? "none" : "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)"};
			transition: transform 0.2s ease;
			color: #ffffff;
		}

		.oc-launcher:hover {
			transform: scale(1.05);
		}

		#widget-container button:focus-visible,
		#widget-container a:focus-visible {
			outline: 2px solid Highlight;
			outline-offset: 2px;
		}

		.oc-launcher svg {
			width: ${config.launcherSize === "lg" ? "28px" : config.launcherSize === "sm" ? "20px" : "24px"};
			height: ${config.launcherSize === "lg" ? "28px" : config.launcherSize === "sm" ? "20px" : "24px"};
		}

		.oc-launcher-icon-wrapper {
			position: relative;
			display: flex;
			align-items: center;
			justify-content: center;
		}

		.oc-launcher-sparkle {
			position: absolute;
			top: -4px;
			right: -4px;
			color: #facc15;
		}

		.oc-launcher-sparkle svg {
			width: 12px;
			height: 12px;
		}

		.oc-launcher-close-icon {
			display: none;
		}

		.oc-launcher.is-open .oc-launcher-chat-icon {
			display: none;
		}

		.oc-launcher.is-open .oc-launcher-close-icon {
			display: block;
		}

		.oc-window {
			${previewWindowStyles}
			background: ${config.theme === "dark" ? "#09090b" : "#ffffff"};
			border-radius: ${config.borderRadius === "full" ? "24px" : config.borderRadius === "none" ? "0" : "16px"};
			box-shadow: ${config.shadowSize === "lg" ? "0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)" : config.shadowSize === "none" ? "none" : "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)"};
			display: none;
			flex-direction: column;
			overflow: hidden;
			border: 1px solid ${config.theme === "dark" ? "#27272a" : "#e4e4e7"};
		}

		.oc-window.is-open {
			display: flex;
			animation: oc-slideUp 0.2s ease;
		}

		@keyframes oc-slideUp {
			from { opacity: 0; transform: translateY(10px); }
			to { opacity: 1; transform: translateY(0); }
		}

		.oc-header {
			background: ${config.headerGradientFrom || config.primaryColor};
			padding: 16px 20px;
			display: flex;
			align-items: center;
			justify-content: space-between;
			color: white;
			position: relative;
		}

		.oc-header-left {
			display: flex;
			align-items: center;
			gap: 12px;
		}

		.oc-avatar {
			width: 36px;
			height: 36px;
			border-radius: 50%;
			display: flex;
			align-items: center;
			justify-content: center;
			position: relative;
			background: rgba(255, 255, 255, 0.16);
		}

		.oc-avatar:has(img) {
			background: transparent;
		}

		.oc-avatar img {
			width: 24px;
			height: 24px;
			object-fit: contain;
		}

		.oc-avatar svg {
			width: 24px;
			height: 24px;
		}

		.oc-avatar-icon {
			display: flex;
			align-items: center;
			justify-content: center;
			width: 24px;
			height: 24px;
			color: #ffffff;
		}

		.oc-avatar-icon svg {
			width: 20px;
			height: 20px;
		}

		.oc-status-dot {
			position: absolute;
			bottom: 0;
			right: 0;
			width: 10px;
			height: 10px;
			background: #22c55e;
			border-radius: 50%;
			border: 2px solid ${config.headerGradientFrom};
		}

		.oc-agent-info {
			display: flex;
			flex-direction: column;
		}

		.oc-agent-name {
			font-weight: 600;
			font-size: 1.07em;
		}

		.oc-agent-status {
			font-size: 0.857em;
			opacity: 0.8;
		}

		.oc-header-actions button {
			background: none;
			border: none;
			color: white;
			cursor: pointer;
			padding: 8px;
			border-radius: 8px;
			opacity: 0.8;
			transition: opacity 0.2s;
		}

		.oc-header-actions button:hover {
			opacity: 1;
			background: rgba(255,255,255,0.1);
		}

		.oc-body {
			flex: 1;
			overflow-y: auto;
			padding: 16px;
			display: flex;
			flex-direction: column;
			gap: 12px;
			background: ${config.theme === "dark" ? "#18181b" : "#ffffff"};
			scrollbar-width: thin;
			scrollbar-color: ${panelBorder} transparent;
		}

		.oc-body::-webkit-scrollbar {
			width: 5px;
			height: 5px;
		}

		.oc-body::-webkit-scrollbar-track {
			background: transparent;
		}

		.oc-body::-webkit-scrollbar-thumb {
			background-color: ${panelBorder};
			border-radius: 9999px;
		}

		.oc-message {
			display: flex;
			flex-direction: column;
			gap: 4px;
			min-width: 0;
			max-width: min(88%, 100%);
		}

		.oc-message.user {
			align-self: flex-end;
		}

		.oc-message.bot {
			align-self: flex-start;
		}

		.oc-message.team {
			align-self: flex-start;
		}

		.oc-screen-reader-only {
			position: absolute;
			width: 1px;
			height: 1px;
			padding: 0;
			margin: -1px;
			overflow: hidden;
			clip: rect(0, 0, 0, 0);
			white-space: nowrap;
			border: 0;
		}

		.oc-bubble {
			min-width: 0;
			max-width: 100%;
			padding: 10px 14px;
			border-radius: 12px;
			font-family: inherit;
			font-size: 1em;
			line-height: 1.55;
			box-shadow: none;
			overflow-wrap: anywhere;
			word-break: normal;
		}

		.oc-bubble pre,
		.oc-bubble code {
			max-width: 100%;
			white-space: pre-wrap;
			overflow-wrap: anywhere;
			word-break: normal;
		}

		.oc-message.user .oc-bubble {
			background-color: ${config.userBubbleColor};
			color: ${config.userBubbleTextColor};
			border-bottom-right-radius: 3px;
		}

		.oc-message.bot .oc-bubble {
			background-color: ${config.botBubbleColor};
			color: ${config.botBubbleTextColor};
			border-bottom-left-radius: 3px;
			border: 1px solid ${panelBorder};
		}

		.oc-message.team .oc-bubble {
			background-color: ${config.botBubbleColor};
			color: ${config.botBubbleTextColor};
			border-bottom-left-radius: 3px;
			border: 1px solid ${panelBorder};
		}

		.oc-bubble.oc-streaming::after {
			content: "";
			display: inline-block;
			width: 6px;
			height: 13px;
			margin-left: 3px;
			vertical-align: -1px;
			background-color: currentColor;
			opacity: 0.6;
			animation: blink 1s infinite;
		}

		@keyframes blink {
			0%, 50% { opacity: 0.6; }
			51%, 100% { opacity: 0; }
		}

		.oc-line {
			margin: 4px 0;
			line-height: 1.5;
		}

		.oc-line:first-child {
			margin-top: 0;
		}

		.oc-line:last-child {
			margin-bottom: 0;
		}

		.oc-bullet {
			padding-left: 20px;
			margin: 4px 0;
			position: relative;
			line-height: 1.5;
		}

		.oc-bullet::before {
			content: "•";
			position: absolute;
			left: 4px;
			color: ${config.primaryColor};
			font-weight: bold;
		}

		.oc-bullet-nested {
			padding-left: 32px;
			margin: 3px 0;
		}

		.oc-bullet-nested::before {
			left: 16px;
			content: "◦";
		}

		.oc-bubble strong {
			font-weight: 600;
			color: ${config.theme === "dark" ? "#fafafa" : "#18181b"};
		}

		.oc-bubble .oc-link {
			color: ${config.primaryColor};
			text-decoration: underline;
			text-underline-offset: 2px;
			word-break: break-word;
			transition: opacity 0.15s ease;
		}

		.oc-bubble .oc-link:hover {
			opacity: 0.8;
		}

		.oc-bubble .oc-link:visited {
			color: ${config.theme === "dark" ? "#a78bfa" : "#7c3aed"};
		}

		.oc-bot-header {
			display: flex;
			align-items: center;
			gap: 8px;
			margin-bottom: 6px;
		}

		.oc-bot-avatar {
			width: 24px;
			height: 24px;
			border-radius: 50%;
			border: 1px solid ${config.theme === "dark" ? "#27272a" : "#e4e4e7"};
			display: flex;
			align-items: center;
			justify-content: center;
			background: ${config.theme === "dark" ? "transparent" : "#ffffff"};
			overflow: hidden;
			flex-shrink: 0;
		}

		.oc-bot-avatar img {
			width: 16px;
			height: 16px;
			object-fit: contain;
		}

		.oc-bot-avatar svg {
			width: 12px;
			height: 12px;
			color: ${config.primaryColor};
		}

		.oc-bot-avatar-icon {
			display: flex;
			align-items: center;
			justify-content: center;
			width: 100%;
			height: 100%;
		}

		.oc-bot-avatar-icon svg {
			width: 12px;
			height: 12px;
			color: ${config.primaryColor};
		}

		.oc-bot-name {
			font-size: 12px;
			font-weight: 500;
			color: ${panelMuted};
		}

		.oc-team-avatar {
			width: 24px;
			height: 24px;
			border-radius: 50%;
			display: flex;
			align-items: center;
			justify-content: center;
			flex-shrink: 0;
			background: ${config.theme === "dark" ? "#27272a" : "#f4f4f5"};
			color: ${config.theme === "dark" ? "#d4d4d8" : "#52525b"};
			font-size: 9px;
			font-weight: 600;
			letter-spacing: 0.02em;
		}

		.oc-team-label {
			font-size: 10px;
			color: ${panelMuted};
		}

		.oc-team-header .oc-bot-name {
			max-width: 140px;
			min-width: 0;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.oc-timestamp {
			font-size: 10px;
			color: ${panelMuted};
			padding: 0 4px;
		}

		/* Feedback Buttons */
		.oc-message-footer {
			display: flex;
			align-items: center;
			justify-content: space-between;
			margin-top: 4px;
		}

		.oc-feedback {
			display: flex;
			gap: 4px;
			opacity: 1;
		}

		.oc-feedback-btn {
			padding: 6px;
			border: 1px solid ${config.theme === "dark" ? "#3f3f46" : "#e4e4e7"};
			border-radius: 6px;
			background: transparent;
			cursor: pointer;
			display: flex;
			align-items: center;
			justify-content: center;
			color: ${panelMuted};
			transition: background-color 150ms ease, color 150ms ease, border-color 150ms ease;
			min-width: 36px;
			min-height: 36px;
		}

		.oc-feedback-btn:hover {
			background: ${config.theme === "dark" ? "#27272a" : "#f4f4f5"};
			color: ${panelText};
		}

		.oc-feedback-btn:focus-visible,
		.oc-feedback-option:focus-visible,
		.oc-feedback-modal-btn:focus-visible {
			outline: 2px solid ${config.primaryColor};
			outline-offset: 2px;
		}

		.oc-feedback-btn:disabled,
		.oc-feedback-modal-btn:disabled {
			cursor: wait;
			opacity: 0.6;
		}

		.oc-feedback-btn.active {
			animation: oc-feedbackPulse 0.3s ease;
		}

		.oc-feedback-btn.oc-feedback-positive.active {
			background: ${config.theme === "dark" ? "rgba(34, 197, 94, 0.15)" : "#dcfce7"};
			border-color: #22c55e;
			color: #16a34a;
		}

		.oc-feedback-btn.oc-feedback-negative.active {
			background: ${config.theme === "dark" ? "rgba(239, 68, 68, 0.15)" : "#fee2e2"};
			border-color: #ef4444;
			color: #dc2626;
		}

		.oc-feedback-btn svg {
			width: 14px;
			height: 14px;
		}

		@keyframes oc-feedbackPulse {
			0% { transform: scale(1); }
			50% { transform: scale(1.15); }
			100% { transform: scale(1); }
		}

		.oc-feedback-thanks {
			font-size: 11px;
			color: ${panelMuted};
			margin-left: 8px;
			opacity: 0;
			transition: opacity 0.2s ease;
		}

		.oc-feedback-thanks.error {
			color: ${config.theme === "dark" ? "#fca5a5" : "#b91c1c"};
		}

		.oc-feedback-thanks.show {
			opacity: 1;
		}

		@media (prefers-reduced-motion: reduce) {
			#widget-container *,
			#widget-container *::before,
			#widget-container *::after {
				animation-duration: 0.01ms !important;
				animation-iteration-count: 1 !important;
				scroll-behavior: auto !important;
				transition-duration: 0.01ms !important;
			}
		}

		/* Feedback Reason Modal */
		.oc-feedback-modal {
			position: absolute;
			bottom: 100%;
			left: 0;
			right: 0;
			margin-bottom: 8px;
			background: ${config.theme === "dark" ? "#27272a" : "#ffffff"};
			border: 1px solid ${config.theme === "dark" ? "#3f3f46" : "#e4e4e7"};
			border-radius: 12px;
			padding: 12px;
			box-shadow: 0 4px 12px rgba(0,0,0,0.15);
			z-index: 10;
			animation: oc-slideUp 0.2s ease;
		}

		.oc-feedback-modal-title {
			font-size: 12px;
			font-weight: 600;
			color: ${config.theme === "dark" ? "#fafafa" : "#18181b"};
			margin-bottom: 8px;
		}

		.oc-feedback-input-label {
			display: block;
			margin: 4px 0 8px;
			font-size: 11px;
			font-weight: 500;
			color: ${config.theme === "dark" ? "#d4d4d8" : "#52525b"};
		}

		.oc-feedback-input-label span {
			font-weight: 400;
			color: ${panelMuted};
		}

		.oc-feedback-modal-options {
			display: flex;
			flex-wrap: wrap;
			gap: 6px;
			margin-bottom: 8px;
		}

		.oc-feedback-option {
			min-height: 32px;
			padding: 6px 10px;
			font-size: 11px;
			border: 1px solid ${config.theme === "dark" ? "#3f3f46" : "#e4e4e7"};
			border-radius: 16px;
			background: transparent;
			color: ${panelMuted};
			cursor: pointer;
			transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease;
		}

		.oc-feedback-option:hover,
		.oc-feedback-option.selected {
			background: ${config.theme === "dark" ? "rgba(239, 68, 68, 0.15)" : "#fee2e2"};
			border-color: #ef4444;
			color: #dc2626;
		}

		.oc-feedback-textarea {
			width: 100%;
			padding: 8px;
			font-size: 12px;
			border: 1px solid ${config.theme === "dark" ? "#3f3f46" : "#e4e4e7"};
			border-radius: 8px;
			background: ${config.theme === "dark" ? "#18181b" : "#fafafa"};
			color: ${config.theme === "dark" ? "#fafafa" : "#18181b"};
			resize: none;
			margin-bottom: 8px;
			font-family: inherit;
		}

		.oc-feedback-textarea:focus {
			border-color: ${config.primaryColor};
			outline: 2px solid ${config.primaryColor};
			outline-offset: 1px;
		}

		.oc-feedback-modal-actions {
			display: flex;
			justify-content: flex-end;
			gap: 8px;
		}

		.oc-feedback-modal-btn {
			min-height: 36px;
			padding: 6px 12px;
			font-size: 11px;
			border-radius: 6px;
			cursor: pointer;
			transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease, opacity 150ms ease;
		}

		.oc-feedback-modal-btn.cancel {
			background: transparent;
			border: 1px solid ${config.theme === "dark" ? "#3f3f46" : "#e4e4e7"};
			color: ${panelMuted};
		}

		.oc-feedback-modal-btn.submit {
			background: #ef4444;
			border: none;
			color: white;
		}

		.oc-feedback-modal-btn:hover {
			opacity: 0.9;
		}

		.oc-suggestions {
			display: flex;
			flex-wrap: wrap;
			gap: 8px;
			margin-top: 8px;
		}

		.oc-pill {
			padding: 8px 12px;
			border-radius: 9999px;
			border: 1px solid ${config.theme === "dark" ? "#27272a" : "#e4e4e7"};
			background: ${config.theme === "dark" ? "#18181b" : "#ffffff"};
			color: ${config.theme === "dark" ? "#d4d4d8" : "#3f3f46"};
			font-family: inherit;
			font-size: 0.857em;
			cursor: pointer;
			transition: all 0.15s ease;
		}

		.oc-pill:hover {
			background: ${config.theme === "dark" ? "#27272a" : "#fafafa"};
			border-color: ${config.theme === "dark" ? "#3f3f46" : "#d4d4d8"};
		}

		.oc-pill-brochure {
			display: inline-flex;
			align-items: center;
			gap: 6px;
			padding: 8px 14px;
			background: ${config.primaryColor};
			border: none;
			border-radius: 9999px;
			color: white;
			font-weight: 500;
			font-size: 13px;
			box-shadow: none;
			cursor: pointer;
			transition: opacity 150ms ease;
		}

		.oc-pill-brochure:hover {
			background: ${config.primaryColor};
			opacity: 0.9;
			transform: none;
			box-shadow: none;
		}

		.oc-pill-brochure svg {
			width: 14px;
			height: 14px;
		}

		/* Document cards for brochure display */
		.oc-documents {
			display: flex;
			flex-direction: column;
			gap: 8px;
			margin-top: 10px;
		}

		.oc-document-card {
			display: flex;
			align-items: center;
			gap: 10px;
			padding: 10px 12px;
			border-radius: 8px;
			border: 1px solid ${panelBorder};
			background: ${panelSubtleBg};
			box-shadow: none;
			transition: border-color 150ms ease, background-color 150ms ease;
		}

		@media (hover: hover) and (pointer: fine) {
			.oc-document-card:hover {
				border-color: ${panelBorder};
				background: ${panelHoverBg};
				box-shadow: none;
			}
		}

		.oc-document-icon {
			display: flex;
			align-items: center;
			justify-content: center;
			width: 28px;
			height: 28px;
			border-radius: 6px;
			background: ${config.theme === "dark" ? "#27272a" : "#e4e4e7"};
			color: ${config.primaryColor};
			flex-shrink: 0;
		}

		.oc-document-icon svg {
			width: 16px;
			height: 16px;
		}

		.oc-document-info {
			flex: 1;
			min-width: 0;
		}

		.oc-document-name {
			font-size: 13px;
			font-weight: 500;
			color: ${panelText};
			margin: 0;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}

		.oc-document-desc {
			font-size: 12px;
			color: ${panelMuted};
			margin: 0;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}

		.oc-document-download {
			display: flex;
			align-items: center;
			justify-content: center;
			width: 28px;
			height: 28px;
			border-radius: 6px;
			border: 1px solid ${panelBorder};
			background: ${panelBg};
			color: ${panelMuted};
			cursor: pointer;
			transition: color 150ms ease, border-color 150ms ease, background-color 150ms ease;
			flex-shrink: 0;
			box-shadow: none;
		}

		.oc-document-download:hover {
			color: ${panelText};
			border-color: ${config.primaryColor};
			background: ${panelHoverBg};
			box-shadow: none;
		}

		.oc-document-download:focus-visible {
			outline: 2px solid ${config.primaryColor};
			outline-offset: 2px;
		}

		.oc-document-download svg {
			width: 14px;
			height: 14px;
		}

		@media (prefers-reduced-motion: reduce) {
			.oc-document-card,
			.oc-document-download {
				transition: none;
			}
		}

		.oc-footer {
			padding: 16px;
			border-top: 1px solid ${config.theme === "dark" ? "#27272a" : "#e4e4e7"};
			background: ${config.theme === "dark" ? "#09090b" : "#ffffff"};
		}

		.oc-privacy {
			font-size: 11px;
			color: ${panelMuted};
			text-align: center;
			margin-bottom: 8px;
		}

		.oc-privacy a {
			color: inherit;
			text-decoration: underline;
		}

		.oc-input-container {
			display: flex;
			align-items: center;
			gap: 8px;
			padding: 8px 16px;
			border-radius: 9999px;
			border: 1px solid ${config.theme === "dark" ? "#27272a" : "#e4e4e7"};
			background: ${config.theme === "dark" ? "#09090b" : "#ffffff"};
			transition: border-color 0.15s ease;
		}

		.oc-input-container:focus-within {
			border-color: ${config.theme === "dark" ? "#ffffff" : "#000000"};
		}

		.oc-input {
			flex: 1;
			border: none;
			background: transparent;
			font-family: inherit;
			font-size: 1em;
			outline: none;
			color: ${config.theme === "dark" ? "#fafafa" : "#18181b"};
		}

		.oc-input::placeholder {
			color: ${panelMuted};
		}

		.oc-upload-btn {
			background: none;
			border: none;
			color: ${panelMuted};
			cursor: pointer;
			padding: 0;
			display: flex;
			align-items: center;
			justify-content: center;
			transition: color 0.15s ease;
		}

		.oc-upload-btn:hover {
			color: ${config.theme === "dark" ? "#fafafa" : "#18181b"};
		}

		.oc-upload-btn svg {
			width: 16px;
			height: 16px;
		}

		.oc-send-btn {
			background: none;
			border: none;
			color: ${config.primaryColor};
			cursor: pointer;
			padding: 0;
			display: flex;
			align-items: center;
			justify-content: center;
			transition: opacity 0.15s ease;
		}

		.oc-send-btn:hover {
			opacity: 0.7;
		}

		.oc-send-btn:disabled {
			opacity: 0.3;
			cursor: not-allowed;
		}

		.oc-send-btn svg {
			width: 20px;
			height: 20px;
		}

		.oc-branding {
			text-align: center;
			font-size: 10px;
			color: ${panelMuted};
			margin-top: 12px;
		}

		.oc-branding a {
			color: inherit;
			text-decoration: underline;
		}

		.oc-branding a:hover {
			color: ${panelText};
		}

		.oc-typing-bubble {
			display: flex;
			align-items: center;
			gap: 4px;
			padding: 16px 16px;
		}

		.oc-typing-dot {
			display: inline-block;
			width: 6px;
			height: 6px;
			border-radius: 50%;
			background: ${panelMuted};
			animation: oc-bounce 1.4s infinite ease-in-out both;
		}

		.oc-typing-dot:nth-child(1) { animation-delay: -0.3s; }
		.oc-typing-dot:nth-child(2) { animation-delay: -0.15s; }
		.oc-typing-dot:nth-child(3) { animation-delay: 0s; }

		@keyframes oc-bounce {
			0%, 80%, 100% { transform: scale(0); }
			40% { transform: scale(1); }
		}

		.oc-preview-container {
			${previewBubbleStyles}
			display: flex;
			flex-direction: column;
			gap: 8px;
			z-index: 10;
		}

		#widget-container:has(.oc-window.is-open) .oc-preview-container {
			display: none !important;
		}

		.oc-preview-message {
			max-width: 100%;
			background: ${config.theme === "dark" ? "#18181b" : "#ffffff"};
			border: 1px solid ${config.theme === "dark" ? "#27272a" : "#e4e4e7"};
			border-radius: ${config.borderRadius === "full" ? "16px" : config.borderRadius === "none" ? "0" : "12px"};
			padding: 16px;
			font-family: inherit;
			font-size: 1em;
			color: ${config.theme === "dark" ? "#e4e4e7" : "#18181b"};
			box-shadow: ${config.shadowSize === "lg" ? "0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)" : config.shadowSize === "none" ? "none" : "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)"};
			cursor: pointer;
			animation: oc-slideIn 0.3s ease;
			transition: box-shadow 0.2s ease;
		}

		.oc-preview-message:hover {
			box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1);
		}

		@keyframes oc-slideIn {
			from {
				opacity: 0;
				transform: translateX(${config.position === "bottom-left" ? "-20px" : "20px"});
			}
			to {
				opacity: 1;
				transform: translateX(0);
			}
		}

		.oc-preview-close {
			position: absolute;
			top: -8px;
			${config.position === "bottom-left" ? "left: -8px;" : "right: -8px;"}
			width: 24px;
			height: 24px;
			border-radius: 50%;
			background: ${config.theme === "dark" ? "#27272a" : "#e4e4e7"};
			border: none;
			cursor: pointer;
			display: flex;
			align-items: center;
			justify-content: center;
			color: ${panelMuted};
			z-index: 10;
			transition: background 0.15s ease;
		}

		.oc-preview-close:hover {
			background: ${config.theme === "dark" ? "#3f3f46" : "#d4d4d8"};
		}

		.oc-preview-close svg {
			width: 12px;
			height: 12px;
		}

		.oc-menu-dropdown {
			position: absolute;
			top: 100%;
			right: 16px;
			margin-top: 4px;
			background: ${config.theme === "dark" ? "#27272a" : "#ffffff"};
			border: 1px solid ${config.theme === "dark" ? "#3f3f46" : "#e4e4e7"};
			border-radius: 12px;
			box-shadow: 0 8px 24px rgba(0,0,0,0.15);
			overflow: hidden;
			z-index: 1000;
			min-width: 180px;
			display: none;
			padding: 4px 0;
		}

		.oc-menu-dropdown.is-open {
			display: block;
			animation: oc-fadeIn 0.15s ease;
		}

		@keyframes oc-fadeIn {
			from { opacity: 0; transform: translateY(-4px); }
			to { opacity: 1; transform: translateY(0); }
		}

		@media (prefers-reduced-motion: reduce) {
			#widget-container *,
			#widget-container *::before,
			#widget-container *::after {
				animation: none !important;
				transition-duration: 0.01ms !important;
				scroll-behavior: auto !important;
			}
		}

		.oc-menu-item {
			display: flex;
			align-items: center;
			gap: 8px;
			width: 100%;
			padding: 10px 14px;
			border: none;
			background: transparent;
			color: ${config.theme === "dark" ? "#fafafa" : "#18181b"};
			font-size: 13px;
			text-align: left;
			cursor: pointer;
			transition: background 0.15s;
		}

		.oc-menu-item:hover {
			background: ${config.theme === "dark" ? "#3f3f46" : "#f4f4f5"};
		}

		.oc-menu-item svg {
			width: 16px;
			height: 16px;
			opacity: 0.7;
		}

		.oc-window.is-panel-view .oc-header.is-hidden,
		.oc-window.is-panel-view .oc-footer.is-hidden {
			display: none !important;
		}

		.oc-window.is-panel-view .oc-body {
			flex: 1;
			display: flex;
			flex-direction: column;
			padding: 0;
			overflow: hidden;
			min-height: 0;
		}

		.oc-panel-view {
			display: flex;
			flex-direction: column;
			height: 100%;
			min-height: 0;
			background: ${panelBg};
		}

		.oc-panel-header {
			background: ${config.headerGradientFrom || config.primaryColor};
			color: #ffffff;
			display: flex;
			align-items: center;
			padding: 14px 12px;
			gap: 4px;
			flex-shrink: 0;
		}

		.oc-panel-back,
		.oc-panel-close {
			display: flex;
			align-items: center;
			justify-content: center;
			width: 32px;
			height: 32px;
			border: none;
			border-radius: 8px;
			background: transparent;
			color: #ffffff;
			cursor: pointer;
			flex-shrink: 0;
			transition: background 0.15s;
		}

		.oc-panel-back:hover,
		.oc-panel-close:hover {
			background: rgba(255, 255, 255, 0.15);
		}

		.oc-panel-back svg,
		.oc-panel-close svg {
			width: 18px;
			height: 18px;
		}

		.oc-panel-title {
			flex: 1;
			display: flex;
			align-items: center;
			justify-content: center;
			gap: 8px;
			font-weight: 600;
			font-size: 15px;
			line-height: 1.2;
			color: #ffffff;
		}

		.oc-panel-title-icon {
			display: flex;
			align-items: center;
			justify-content: center;
			color: #ffffff;
		}

		.oc-panel-title-icon svg {
			width: 18px;
			height: 18px;
		}

		.oc-panel-body {
			flex: 1;
			display: flex;
			flex-direction: column;
			overflow-y: auto;
			min-height: 0;
			background: ${panelBg};
			scrollbar-width: thin;
			scrollbar-color: ${panelBorder} transparent;
		}

		.oc-panel-body::-webkit-scrollbar {
			width: 5px;
			height: 5px;
		}

		.oc-panel-body::-webkit-scrollbar-track {
			background: transparent;
		}

		.oc-panel-body::-webkit-scrollbar-thumb {
			background-color: ${panelBorder};
			border-radius: 9999px;
		}

		.oc-panel-loading {
			flex: 1;
			display: flex;
			align-items: center;
			justify-content: center;
			padding: 32px 16px;
			font-size: 14px;
			color: ${panelMuted};
		}

		.oc-panel-empty {
			flex: 1;
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			padding: 32px 24px;
			text-align: center;
		}

		.oc-panel-empty-icon {
			color: ${panelMuted};
			margin-bottom: 16px;
		}

		.oc-panel-empty-icon svg {
			width: 48px;
			height: 48px;
		}

		.oc-panel-empty-title {
			font-size: 18px;
			font-weight: 700;
			color: ${panelText};
			margin-bottom: 8px;
		}

		.oc-panel-empty-subtitle {
			font-size: 14px;
			color: ${panelMuted};
			max-width: 260px;
			line-height: 1.5;
		}

		.oc-panel-footer {
			padding: 16px;
			flex-shrink: 0;
			border-top: 1px solid ${panelBorder};
			background: ${panelBg};
		}

		.oc-panel-primary-btn {
			width: 100%;
			display: flex;
			align-items: center;
			justify-content: center;
			gap: 8px;
			padding: 12px 16px;
			background: ${config.primaryColor};
			color: ${config.userBubbleTextColor || "#ffffff"};
			border: none;
			border-radius: 8px;
			font-size: 14px;
			font-weight: 500;
			cursor: pointer;
			transition: opacity 0.15s;
			box-shadow: none;
		}

		.oc-panel-primary-btn:hover {
			opacity: 0.9;
			box-shadow: none;
		}

		.oc-panel-primary-btn svg {
			width: 16px;
			height: 16px;
		}

		.oc-panel-tabs {
			display: flex;
			margin: 16px 16px 0;
			padding: 4px;
			background: ${panelSubtleBg};
			border-radius: 999px;
			flex-shrink: 0;
		}

		.oc-panel-tab {
			flex: 1;
			padding: 8px 16px;
			border: none;
			background: transparent;
			border-radius: 999px;
			font-size: 14px;
			font-weight: 500;
			color: ${panelMuted};
			cursor: pointer;
			transition: all 0.15s;
		}

		.oc-panel-tab.is-active {
			background: ${panelBg};
			box-shadow: ${config.shadowSize === "none" ? "none" : "0 1px 3px rgba(0, 0, 0, 0.1)"};
			color: ${panelText};
		}

		.oc-panel-list {
			display: flex;
			flex-direction: column;
		}

		.oc-panel-list-item {
			display: flex;
			flex-direction: column;
			align-items: flex-start;
			gap: 4px;
			width: 100%;
			padding: 16px;
			border: none;
			border-bottom: 1px solid ${panelBorder};
			background: transparent;
			text-align: left;
			cursor: pointer;
			transition: background 0.15s;
		}

		.oc-panel-list-item:hover {
			background: ${panelHoverBg};
		}

		.oc-panel-list-item.is-current {
			background: ${panelCurrentBg};
		}

		.oc-panel-list-preview {
			font-size: 14px;
			line-height: 1.45;
			color: ${panelText};
			display: -webkit-box;
			-webkit-line-clamp: 2;
			-webkit-box-orient: vertical;
			overflow: hidden;
		}

		.oc-panel-list-meta {
			display: flex;
			align-items: center;
			gap: 8px;
			font-size: 12px;
			color: ${panelMuted};
		}

		.oc-panel-list-badge {
			font-size: 11px;
			font-weight: 600;
			color: ${config.primaryColor};
		}

		.oc-header-actions {
			position: relative;
			display: flex;
			align-items: center;
			gap: 4px;
		}

		.oc-call-btn {
			background: none;
			border: none;
			color: white;
			cursor: pointer;
			padding: 8px;
			border-radius: 8px;
			opacity: 0.8;
			transition: all 0.2s ease;
			display: flex;
			align-items: center;
			justify-content: center;
		}

		.oc-call-btn svg {
			width: 18px;
			height: 18px;
		}

		.oc-call-btn.copied {
			opacity: 1;
			color: #22c55e;
		}

		/* Conversational Lead Capture Styles */
		.oc-lead-question {
			margin: 8px 0;
			display: flex;
			flex-direction: column;
			align-items: flex-start;
			max-width: 85%;
			animation: oc-slideUp 0.2s ease;
		}

		.oc-lead-input-container {
			display: flex;
			align-items: center;
			gap: 8px;
			padding: 10px 14px;
			border-radius: 20px;
			border: 1px solid ${config.theme === "dark" ? "#3f3f46" : "#d4d4d8"};
			background: ${config.theme === "dark" ? "#18181b" : "#ffffff"};
			width: 100%;
			max-width: 280px;
			transition: border-color 0.2s;
		}

		.oc-lead-input-container:focus-within {
			border-color: ${config.theme === "dark" ? "#fafafa" : "#18181b"};
		}

		.oc-lead-input {
			flex: 1;
			border: none;
			background: transparent;
			font-size: 14px;
			outline: none;
			color: ${config.theme === "dark" ? "#fafafa" : "#18181b"};
			font-family: inherit;
		}

		.oc-lead-input::placeholder {
			color: ${panelMuted};
		}

		.oc-lead-prefix {
			color: ${panelMuted};
			font-size: 14px;
			font-weight: 500;
			white-space: nowrap;
		}

		.oc-lead-submit-btn {
			background: ${config.theme === "dark" ? "#fafafa" : "#18181b"};
			color: ${config.theme === "dark" ? "#18181b" : "#fafafa"};
			border: none;
			border-radius: 50%;
			width: 32px;
			height: 32px;
			display: flex;
			align-items: center;
			justify-content: center;
			cursor: pointer;
			transition: opacity 0.2s;
			flex-shrink: 0;
		}

		.oc-lead-submit-btn:hover {
			opacity: 0.8;
		}

		.oc-lead-submit-btn:focus-visible,
		.oc-lead-skip-btn:focus-visible {
			outline: 2px solid ${config.primaryColor};
			outline-offset: 2px;
		}

		.oc-lead-submit-btn:disabled {
			opacity: 0.4;
			cursor: not-allowed;
		}

		.oc-lead-submit-btn svg {
			width: 16px;
			height: 16px;
		}

		.oc-lead-error {
			font-size: 12px;
			color: ${config.theme === "dark" ? "#fca5a5" : "#b91c1c"};
			margin-top: 4px;
			padding: 0 4px;
			display: none;
		}

		.oc-lead-error:not(:empty) {
			display: block;
		}

		.oc-lead-input-container.has-error {
			border-color: ${config.theme === "dark" ? "#ef4444" : "#dc2626"};
		}

		.oc-lead-skip-btn {
			background: transparent;
			border: 1px solid ${config.theme === "dark" ? "#3f3f46" : "#d4d4d8"};
			color: ${panelMuted};
			padding: 6px 14px;
			border-radius: 16px;
			font-size: 12px;
			cursor: pointer;
			margin-top: 8px;
			transition: all 0.2s;
		}

		.oc-lead-skip-btn:hover {
			background: ${config.theme === "dark" ? "#27272a" : "#f4f4f5"};
			color: ${panelText};
		}

		.oc-window.is-panel-view .oc-header.is-hidden,
		.oc-window.is-panel-view .oc-footer.is-hidden {
			display: none;
		}

		.oc-panel-view {
			display: flex;
			flex-direction: column;
			height: 100%;
			min-height: 0;
		}

		.oc-panel-header {
			display: flex;
			align-items: center;
			gap: 8px;
			padding: 12px 14px;
			border-bottom: 1px solid ${config.theme === "dark" ? "#3f3f46" : "#e4e4e7"};
		}

		.oc-panel-back,
		.oc-panel-close {
			display: flex;
			align-items: center;
			justify-content: center;
			width: 32px;
			height: 32px;
			border: none;
			background: transparent;
			color: ${config.theme === "dark" ? "#fafafa" : "#18181b"};
			cursor: pointer;
			border-radius: 8px;
		}

		.oc-panel-title {
			display: flex;
			align-items: center;
			gap: 8px;
			flex: 1;
			font-size: 15px;
			font-weight: 600;
			color: ${config.theme === "dark" ? "#fafafa" : "#18181b"};
		}

		.oc-panel-body {
			flex: 1;
			overflow-y: auto;
			padding: 12px;
		}

		.oc-panel-footer {
			padding: 12px;
			border-top: 1px solid ${config.theme === "dark" ? "#3f3f46" : "#e4e4e7"};
		}

		.oc-panel-primary-btn {
			display: flex;
			align-items: center;
			justify-content: center;
			gap: 8px;
			width: 100%;
			padding: 10px 14px;
			border: none;
			border-radius: 10px;
			background: ${config.primaryColor};
			color: #fff;
			font-size: 14px;
			font-weight: 500;
			cursor: pointer;
		}

		.oc-panel-list {
			display: flex;
			flex-direction: column;
			gap: 8px;
		}

		.oc-panel-list-item {
			display: block;
			width: 100%;
			text-align: left;
			padding: 12px;
			border: 1px solid ${config.theme === "dark" ? "#3f3f46" : "#e4e4e7"};
			border-radius: 12px;
			background: ${config.theme === "dark" ? "#27272a" : "#ffffff"};
			cursor: pointer;
		}

		.oc-panel-list-item.is-current {
			border-color: ${config.primaryColor};
		}

		.oc-panel-list-preview {
			font-size: 14px;
			color: ${config.theme === "dark" ? "#fafafa" : "#18181b"};
			margin-bottom: 6px;
		}

		.oc-panel-list-meta {
			display: flex;
			align-items: center;
			justify-content: space-between;
			font-size: 12px;
			color: ${panelMuted};
		}

		.oc-panel-list-badge {
			font-size: 11px;
			font-weight: 600;
			color: ${config.primaryColor};
		}

		.oc-panel-loading,
		.oc-panel-empty {
			padding: 24px 12px;
			text-align: center;
			color: ${panelMuted};
			font-size: 14px;
		}

		/* Mobile viewport responsive adjustments (320px - 480px) */
		@media (max-width: 480px) {
			#widget-container:not(.oc-preview-container) .oc-window {
				width: calc(100vw - 20px);
				max-width: calc(100vw - 20px);
				right: 10px;
				left: 10px;
				margin: 0 auto;
				bottom: ${config.launcherSize === "lg" ? "72px" : config.launcherSize === "sm" ? "52px" : "62px"};
				max-height: calc(100vh - 90px);
			}

			.oc-body {
				padding: 12px 10px;
				gap: 10px;
			}

			.oc-bubble {
				padding: 9px 12px;
				font-size: 13.5px;
			}

			.oc-message {
				max-width: 90%;
			}

			.oc-input-container {
				padding: 8px 10px;
			}
		}

		@media (max-width: 360px) {
			#widget-container:not(.oc-preview-container) .oc-window {
				width: calc(100vw - 12px);
				max-width: calc(100vw - 12px);
				right: 6px;
				left: 6px;
			}

			.oc-body {
				padding: 10px 8px;
			}

			.oc-bubble {
				padding: 8px 10px;
				font-size: 13px;
			}

			.oc-message {
				max-width: 94%;
			}
		}

	`;
  document.head.appendChild(style);
}
