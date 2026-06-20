/**
 * OutCaller Widget - Styles
 * CSS injection for the widget
 */

import { state } from "./state.js";

/**
 * Inject all widget CSS styles
 */
export function injectStyles() {
  const config = state.config;

  const style = document.createElement("style");
  style.id = "outcaller-widget-styles";
  style.innerHTML = `
		#outcaller-widget-container {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
			position: fixed;
			${config.position === "bottom-left" ? "left: 20px;" : "right: 20px;"}
			bottom: 20px;
			z-index: 999999;
		}

		#outcaller-widget-container * {
			box-sizing: border-box;
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
			position: absolute;
			bottom: ${config.launcherSize === "lg" ? "72px" : config.launcherSize === "sm" ? "52px" : "62px"};
			${config.position === "bottom-left" ? "left: 0;" : "right: 0;"}
			width: 350px;
			max-width: calc(100vw - 40px);
			height: 600px;
			max-height: calc(100vh - 100px);
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
			background: linear-gradient(to right, ${config.headerGradientFrom}, ${config.headerGradientTo});
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
			font-size: 15px;
		}

		.oc-agent-status {
			font-size: 12px;
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
			padding: 20px;
			display: flex;
			flex-direction: column;
			gap: 16px;
			background: ${config.theme === "dark" ? "#18181b" : "#ffffff"};
		}

		.oc-message {
			display: flex;
			flex-direction: column;
			gap: 4px;
			max-width: 85%;
		}

		.oc-message.user {
			align-self: flex-end;
		}

		.oc-message.bot {
			align-self: flex-start;
		}

		.oc-bubble {
			padding: 12px 16px;
			border-radius: 12px;
			font-size: 14px;
			line-height: 1.625;
			box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
		}

		.oc-message.user .oc-bubble {
			background-color: ${config.userBubbleColor};
			color: ${config.userBubbleTextColor};
			border-bottom-right-radius: 2px;
		}

		.oc-message.bot .oc-bubble {
			background-color: ${config.botBubbleColor};
			color: ${config.botBubbleTextColor};
			border-bottom-left-radius: 2px;
		}

		.oc-bubble.oc-streaming::after {
			content: "...";
			animation: blink 1s infinite;
			margin-left: 2px;
			opacity: 0.4;
		}

		@keyframes blink {
			0%, 50% { opacity: 1; }
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

		.oc-bot-name {
			font-size: 12px;
			font-weight: 500;
			color: ${config.theme === "dark" ? "#71717a" : "#71717a"};
		}

		.oc-timestamp {
			font-size: 10px;
			color: ${config.theme === "dark" ? "#71717a" : "#a1a1aa"};
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
			padding: 4px 6px;
			border: 1px solid ${config.theme === "dark" ? "#3f3f46" : "#e4e4e7"};
			border-radius: 6px;
			background: transparent;
			cursor: pointer;
			display: flex;
			align-items: center;
			justify-content: center;
			color: ${config.theme === "dark" ? "#71717a" : "#a1a1aa"};
			transition: all 0.15s ease;
			min-width: 28px;
			min-height: 28px;
		}

		.oc-feedback-btn:hover {
			background: ${config.theme === "dark" ? "#27272a" : "#f4f4f5"};
			color: ${config.theme === "dark" ? "#a1a1aa" : "#71717a"};
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
			color: ${config.theme === "dark" ? "#71717a" : "#a1a1aa"};
			margin-left: 8px;
			opacity: 0;
			transition: opacity 0.2s ease;
		}

		.oc-feedback-thanks.show {
			opacity: 1;
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

		.oc-feedback-modal-options {
			display: flex;
			flex-wrap: wrap;
			gap: 6px;
			margin-bottom: 8px;
		}

		.oc-feedback-option {
			padding: 6px 10px;
			font-size: 11px;
			border: 1px solid ${config.theme === "dark" ? "#3f3f46" : "#e4e4e7"};
			border-radius: 16px;
			background: transparent;
			color: ${config.theme === "dark" ? "#a1a1aa" : "#71717a"};
			cursor: pointer;
			transition: all 0.15s ease;
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
			outline: none;
			border-color: ${config.primaryColor};
		}

		.oc-feedback-modal-actions {
			display: flex;
			justify-content: flex-end;
			gap: 8px;
		}

		.oc-feedback-modal-btn {
			padding: 6px 12px;
			font-size: 11px;
			border-radius: 6px;
			cursor: pointer;
			transition: all 0.15s ease;
		}

		.oc-feedback-modal-btn.cancel {
			background: transparent;
			border: 1px solid ${config.theme === "dark" ? "#3f3f46" : "#e4e4e7"};
			color: ${config.theme === "dark" ? "#a1a1aa" : "#71717a"};
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
			font-size: 12px;
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
			gap: 8px;
			padding: 10px 16px;
			background: linear-gradient(135deg, ${config.primaryColor}, ${config.primaryColor}dd);
			border: none;
			color: white;
			font-weight: 500;
			box-shadow: 0 2px 8px ${config.primaryColor}40;
		}

		.oc-pill-brochure:hover {
			background: linear-gradient(135deg, ${config.primaryColor}ee, ${config.primaryColor}cc);
			transform: translateY(-1px);
			box-shadow: 0 4px 12px ${config.primaryColor}50;
		}

		.oc-pill-brochure svg {
			width: 16px;
			height: 16px;
		}

		/* Document cards for brochure display */
		.oc-documents {
			display: flex;
			flex-direction: column;
			gap: 10px;
			margin-top: 12px;
		}

		.oc-document-card {
			display: flex;
			align-items: center;
			gap: 14px;
			padding: 14px 16px;
			border-radius: 12px;
			border: 1px solid ${config.theme === "dark" ? "#3f3f46" : "#e4e4e7"};
			background: ${config.theme === "dark" ? "linear-gradient(135deg, #1f1f23, #18181b)" : "linear-gradient(135deg, #ffffff, #fafafa)"};
			box-shadow: ${config.theme === "dark" ? "0 2px 8px rgba(0,0,0,0.3)" : "0 2px 8px rgba(0,0,0,0.06)"};
			transition: all 0.2s ease;
		}

		.oc-document-card:hover {
			border-color: ${config.primaryColor}50;
			box-shadow: ${config.theme === "dark" ? `0 4px 16px rgba(0,0,0,0.4), 0 0 0 1px ${config.primaryColor}30` : `0 4px 16px rgba(0,0,0,0.1), 0 0 0 1px ${config.primaryColor}20`};
			transform: translateY(-2px);
		}

		.oc-document-icon {
			display: flex;
			align-items: center;
			justify-content: center;
			width: 44px;
			height: 44px;
			border-radius: 10px;
			background: linear-gradient(135deg, ${config.primaryColor}20, ${config.primaryColor}10);
			color: ${config.primaryColor};
			flex-shrink: 0;
			position: relative;
		}

		.oc-document-icon::after {
			content: '';
			position: absolute;
			inset: 0;
			border-radius: 10px;
			border: 1px solid ${config.primaryColor}25;
		}

		.oc-document-icon svg {
			width: 22px;
			height: 22px;
		}

		.oc-document-info {
			flex: 1;
			min-width: 0;
		}

		.oc-document-name {
			font-size: 14px;
			font-weight: 600;
			color: ${config.theme === "dark" ? "#fafafa" : "#18181b"};
			margin: 0 0 4px 0;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
			letter-spacing: -0.01em;
		}

		.oc-document-desc {
			font-size: 12px;
			color: ${config.theme === "dark" ? "#a1a1aa" : "#71717a"};
			margin: 0;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}

		.oc-document-download {
			display: flex;
			align-items: center;
			justify-content: center;
			width: 36px;
			height: 36px;
			border-radius: 10px;
			border: none;
			background: linear-gradient(135deg, ${config.primaryColor}, ${config.primaryColor}dd);
			color: white;
			cursor: pointer;
			transition: all 0.2s ease;
			flex-shrink: 0;
			box-shadow: 0 2px 6px ${config.primaryColor}30;
		}

		.oc-document-download:hover {
			background: linear-gradient(135deg, ${config.primaryColor}ee, ${config.primaryColor}cc);
			transform: scale(1.08);
			box-shadow: 0 4px 12px ${config.primaryColor}40;
		}

		.oc-document-download svg {
			width: 18px;
			height: 18px;
		}

		.oc-footer {
			padding: 16px;
			border-top: 1px solid ${config.theme === "dark" ? "#27272a" : "#e4e4e7"};
			background: ${config.theme === "dark" ? "#09090b" : "#ffffff"};
		}

		.oc-privacy {
			font-size: 11px;
			color: ${config.theme === "dark" ? "#71717a" : "#a1a1aa"};
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
			font-size: 14px;
			outline: none;
			color: ${config.theme === "dark" ? "#fafafa" : "#18181b"};
		}

		.oc-input::placeholder {
			color: ${config.theme === "dark" ? "#71717a" : "#a1a1aa"};
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
			color: ${config.theme === "dark" ? "#71717a" : "#a1a1aa"};
			margin-top: 12px;
		}

		.oc-branding a {
			color: inherit;
			text-decoration: underline;
		}

		.oc-branding a:hover {
			color: ${config.theme === "dark" ? "#a1a1aa" : "#71717a"};
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
			background: ${config.theme === "dark" ? "#71717a" : "#a1a1aa"};
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
			position: absolute;
			bottom: ${config.launcherSize === "lg" ? "72px" : config.launcherSize === "sm" ? "52px" : "62px"};
			${config.position === "bottom-left" ? "left: 0;" : "right: 0;"}
			display: flex;
			flex-direction: column;
			gap: 8px;
			width: 288px;
			z-index: 10;
			${config.position === "bottom-left" ? "align-items: flex-start;" : "align-items: flex-end;"}
		}

		.oc-preview-message {
			max-width: 100%;
			background: ${config.theme === "dark" ? "#18181b" : "#ffffff"};
			border: 1px solid ${config.theme === "dark" ? "#27272a" : "#e4e4e7"};
			border-radius: ${config.borderRadius === "full" ? "16px" : config.borderRadius === "none" ? "0" : "12px"};
			padding: 16px;
			font-size: 14px;
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
			color: ${config.theme === "dark" ? "#a1a1aa" : "#71717a"};
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

		/* Recent Chats View Styles */
		.oc-recent-chats {
			position: absolute;
			top: 0;
			left: 0;
			right: 0;
			bottom: 0;
			background: ${config.theme === "dark" ? "#09090b" : "#ffffff"};
			z-index: 100;
			display: flex;
			flex-direction: column;
			animation: oc-slideIn 0.2s ease;
		}

		.oc-recent-header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding: 16px 20px;
			background: linear-gradient(135deg, ${config.headerGradientFrom}, ${config.headerGradientTo});
			color: white;
			border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		}

		.oc-recent-header-content {
			display: flex;
			align-items: center;
			gap: 10px;
			flex: 1;
			justify-content: center;
			margin: 0 8px;
		}

		.oc-recent-header-content svg {
			width: 20px;
			height: 20px;
			opacity: 0.9;
		}

		.oc-recent-title {
			font-weight: 600;
			font-size: 17px;
			letter-spacing: -0.01em;
		}

		.oc-recent-back {
			background: none;
			border: none;
			color: white;
			cursor: pointer;
			padding: 8px;
			border-radius: 8px;
			display: flex;
			align-items: center;
			justify-content: center;
			opacity: 0.9;
			transition: all 0.2s ease;
			min-width: 36px;
			min-height: 36px;
		}

		.oc-recent-back:hover {
			opacity: 1;
			background: rgba(255, 255, 255, 0.15);
			transform: translateX(-2px);
		}

		.oc-recent-back:active {
			transform: scale(0.95);
		}

		.oc-recent-back svg {
			width: 20px;
			height: 20px;
		}

		.oc-recent-new {
			background: rgba(255, 255, 255, 0.15);
			border: none;
			color: white;
			cursor: pointer;
			padding: 8px;
			border-radius: 8px;
			display: flex;
			align-items: center;
			justify-content: center;
			transition: all 0.2s ease;
			min-width: 36px;
			min-height: 36px;
		}

		.oc-recent-new:hover {
			background: rgba(255, 255, 255, 0.25);
			transform: scale(1.05);
		}

		.oc-recent-new:active {
			transform: scale(0.95);
		}

		.oc-recent-new svg {
			width: 18px;
			height: 18px;
		}

		.oc-recent-list {
			flex: 1;
			overflow-y: auto;
			padding: 12px;
		}

		.oc-recent-empty {
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			height: 100%;
			color: ${config.theme === "dark" ? "#71717a" : "#a1a1aa"};
			text-align: center;
			padding: 20px;
		}

		.oc-recent-empty svg {
			width: 48px;
			height: 48px;
			margin-bottom: 16px;
			opacity: 0.5;
		}

		.oc-recent-empty-text {
			font-size: 14px;
			margin-bottom: 8px;
		}

		.oc-recent-empty-subtext {
			font-size: 12px;
			opacity: 0.7;
		}

		.oc-recent-item {
			display: flex;
			align-items: center;
			gap: 12px;
			padding: 16px 14px;
			border-radius: 12px;
			margin-bottom: 8px;
			background: ${config.theme === "dark" ? "#18181b" : "#ffffff"};
			border: 1px solid ${config.theme === "dark" ? "#27272a" : "#e4e4e7"};
			cursor: pointer;
			transition: all 0.2s ease;
			box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
		}

		.oc-recent-item:hover {
			background: ${config.theme === "dark" ? "#27272a" : "#f9fafb"};
			border-color: ${config.theme === "dark" ? "#3f3f46" : "#d4d4d8"};
			box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
			transform: translateY(-1px);
		}

		.oc-recent-item:active {
			transform: translateY(0);
		}

		.oc-recent-item:last-child {
			margin-bottom: 0;
		}

		.oc-recent-item-avatar {
			width: 40px;
			height: 40px;
			border-radius: 10px;
			background: ${config.theme === "dark" ? "#27272a" : "#e4e4e7"};
			display: flex;
			align-items: center;
			justify-content: center;
			flex-shrink: 0;
		}

		.oc-recent-item-avatar img {
			width: 24px;
			height: 24px;
			object-fit: contain;
		}

		.oc-recent-item-avatar svg {
			width: 20px;
			height: 20px;
			color: ${config.primaryColor};
		}

		.oc-recent-item-content {
			flex: 1;
			min-width: 0;
			overflow: hidden;
		}

		.oc-recent-item-title {
			font-size: 14px;
			font-weight: 500;
			color: ${config.theme === "dark" ? "#fafafa" : "#18181b"};
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
			margin-bottom: 4px;
		}

		.oc-recent-item-meta {
			display: flex;
			align-items: center;
			gap: 6px;
			font-size: 12px;
			color: ${config.theme === "dark" ? "#71717a" : "#a1a1aa"};
		}

		.oc-recent-item-agent {
			white-space: nowrap;
		}

		.oc-recent-item-dot {
			width: 3px;
			height: 3px;
			border-radius: 50%;
			background: currentColor;
		}

		.oc-recent-item-time {
			white-space: nowrap;
		}

		.oc-recent-item-open {
			display: flex;
			align-items: center;
			gap: 4px;
			padding: 8px 14px;
			border-radius: 8px;
			background: ${config.primaryColor === "#000000" || config.primaryColor === "black" ? "linear-gradient(135deg, #9333ea, #c026d3)" : config.primaryColor};
			color: white;
			font-size: 13px;
			font-weight: 600;
			border: none;
			cursor: pointer;
			transition: all 0.2s ease;
			flex-shrink: 0;
			box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		}

		.oc-recent-item-open:hover {
			transform: scale(1.05);
			box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
		}

		.oc-recent-item-open:active {
			transform: scale(0.98);
		}

		.oc-recent-item-open svg {
			width: 14px;
			height: 14px;
		}

		.oc-recent-loading {
			display: flex;
			align-items: center;
			justify-content: center;
			height: 100%;
			color: ${config.theme === "dark" ? "#71717a" : "#a1a1aa"};
		}

		.oc-recent-loading-spinner {
			width: 24px;
			height: 24px;
			border: 2px solid ${config.theme === "dark" ? "#27272a" : "#e4e4e7"};
			border-top-color: ${config.primaryColor};
			border-radius: 50%;
			animation: oc-spin 0.8s linear infinite;
		}

		@keyframes oc-spin {
			to { transform: rotate(360deg); }
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
			color: ${config.theme === "dark" ? "#71717a" : "#a1a1aa"};
		}

		.oc-lead-prefix {
			color: ${config.theme === "dark" ? "#a1a1aa" : "#71717a"};
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

		.oc-lead-submit-btn:disabled {
			opacity: 0.4;
			cursor: not-allowed;
		}

		.oc-lead-submit-btn svg {
			width: 16px;
			height: 16px;
		}

		.oc-lead-skip-btn {
			background: transparent;
			border: 1px solid ${config.theme === "dark" ? "#3f3f46" : "#d4d4d8"};
			color: ${config.theme === "dark" ? "#a1a1aa" : "#71717a"};
			padding: 6px 14px;
			border-radius: 16px;
			font-size: 12px;
			cursor: pointer;
			margin-top: 8px;
			transition: all 0.2s;
		}

		.oc-lead-skip-btn:hover {
			background: ${config.theme === "dark" ? "#27272a" : "#f4f4f5"};
			color: ${config.theme === "dark" ? "#fafafa" : "#18181b"};
		}

		/* Voice Call Button */
		.oc-voice-call-btn {
			background: none;
			border: none;
			color: white;
			cursor: pointer;
			padding: 6px;
			border-radius: 6px;
			display: flex;
			align-items: center;
			justify-content: center;
			transition: all 0.2s;
		}

		.oc-voice-call-btn:hover {
			background: rgba(255,255,255,0.1);
		}

		.oc-voice-call-btn.active {
			background: #22c55e;
			animation: oc-pulse-green 2s ease-in-out infinite;
		}

		@keyframes oc-pulse-green {
			0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
			50% { box-shadow: 0 0 0 8px rgba(34, 197, 94, 0); }
		}

		/* Voice Call Overlay */
		.oc-voice-call-overlay {
			position: absolute;
			top: 0;
			left: 0;
			right: 0;
			bottom: 0;
			background: linear-gradient(to bottom, ${config.headerGradientFrom}, ${config.headerGradientTo});
			display: flex;
			align-items: center;
			justify-content: center;
			z-index: 100;
			animation: oc-fadeIn 0.3s ease;
		}

		.oc-voice-call-content {
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: 20px;
			text-align: center;
			color: white;
			padding: 24px;
		}

		.oc-voice-call-avatar {
			position: relative;
			width: 100px;
			height: 100px;
		}

		.oc-voice-call-avatar img {
			width: 80px;
			height: 80px;
			border-radius: 50%;
			object-fit: cover;
			position: absolute;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			border: 3px solid white;
			background: white;
		}

		.oc-voice-call-waves {
			position: absolute;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			width: 100%;
			height: 100%;
		}

		.oc-wave {
			position: absolute;
			top: 0;
			left: 0;
			right: 0;
			bottom: 0;
			border-radius: 50%;
			border: 2px solid rgba(255,255,255,0.3);
			animation: oc-wave-pulse 2s ease-out infinite;
		}

		.oc-wave:nth-child(2) {
			animation-delay: 0.4s;
		}

		.oc-wave:nth-child(3) {
			animation-delay: 0.8s;
		}

		@keyframes oc-wave-pulse {
			0% {
				transform: scale(0.8);
				opacity: 1;
			}
			100% {
				transform: scale(1.5);
				opacity: 0;
			}
		}

		.oc-voice-call-info {
			display: flex;
			flex-direction: column;
			gap: 4px;
		}

		.oc-voice-call-name {
			font-size: 20px;
			font-weight: 600;
		}

		.oc-voice-call-status {
			font-size: 14px;
			opacity: 0.8;
		}

		.oc-voice-call-timer {
			font-size: 32px;
			font-weight: 300;
			font-variant-numeric: tabular-nums;
			letter-spacing: 2px;
		}

		.oc-voice-call-actions {
			display: flex;
			gap: 16px;
			margin-top: 20px;
		}

		.oc-voice-end-btn {
			width: 64px;
			height: 64px;
			border-radius: 50%;
			border: none;
			background: #ef4444;
			color: white;
			cursor: pointer;
			display: flex;
			align-items: center;
			justify-content: center;
			transition: all 0.2s;
			box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
		}

		.oc-voice-end-btn:hover {
			background: #dc2626;
			transform: scale(1.05);
		}

		.oc-voice-end-btn svg {
			width: 28px;
			height: 28px;
		}

		.oc-voice-mute-btn {
			width: 56px;
			height: 56px;
			border-radius: 50%;
			border: none;
			background: rgba(255, 255, 255, 0.2);
			color: white;
			cursor: pointer;
			display: flex;
			align-items: center;
			justify-content: center;
			transition: all 0.2s;
		}

		.oc-voice-mute-btn:hover {
			background: rgba(255, 255, 255, 0.3);
			transform: scale(1.05);
		}

		.oc-voice-mute-btn.muted {
			background: rgba(239, 68, 68, 0.3);
		}

		.oc-voice-mute-btn svg {
			width: 24px;
			height: 24px;
		}

		/* Voice connecting animation */
		.oc-voice-call-overlay.connecting .oc-wave {
			border-color: rgba(255, 255, 255, 0.2);
			animation: oc-connecting-pulse 1s ease-in-out infinite;
		}

		@keyframes oc-connecting-pulse {
			0%, 100% { transform: scale(0.9); opacity: 0.5; }
			50% { transform: scale(1.1); opacity: 0.8; }
		}
	`;
  document.head.appendChild(style);
}
