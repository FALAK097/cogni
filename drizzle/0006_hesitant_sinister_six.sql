PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_widget` (
	`id` text PRIMARY KEY NOT NULL,
	`publicKey` text NOT NULL,
	`displayName` text DEFAULT 'Support' NOT NULL,
	`welcomeMessage` text DEFAULT 'Hi! How can we help?' NOT NULL,
	`inputPlaceholder` text DEFAULT 'Ask a question…' NOT NULL,
	`primaryColor` text DEFAULT '#7c3aed' NOT NULL,
	`backgroundColor` text DEFAULT '#ffffff' NOT NULL,
	`textColor` text DEFAULT '#171717' NOT NULL,
	`borderColor` text DEFAULT '#EAECF0' NOT NULL,
	`fontFamily` text DEFAULT 'Inter' NOT NULL,
	`fontSize` text DEFAULT '14px' NOT NULL,
	`position` text DEFAULT 'bottom-right' NOT NULL,
	`launcherSize` text DEFAULT 'md' NOT NULL,
	`panelWidth` integer DEFAULT 380 NOT NULL,
	`panelHeight` integer DEFAULT 640 NOT NULL,
	`borderRadius` integer DEFAULT 20 NOT NULL,
	`borderRadiusStyle` text DEFAULT 'default' NOT NULL,
	`logoUrl` text,
	`instructions` text DEFAULT 'Answer clearly and only use information you know is reliable. If you are unsure, say so.' NOT NULL,
	`escalationKeywords` text DEFAULT 'human,agent,person,representative,support team' NOT NULL,
	`modelProvider` text DEFAULT 'OPENAI' NOT NULL,
	`modelName` text DEFAULT 'gpt-4o-mini' NOT NULL,
	`isEnabled` integer DEFAULT true NOT NULL,
	`theme` text DEFAULT 'light' NOT NULL,
	`userBubbleColor` text DEFAULT '#7c3aed' NOT NULL,
	`userBubbleTextColor` text DEFAULT '#ffffff' NOT NULL,
	`botBubbleColor` text DEFAULT '#f2f2f8' NOT NULL,
	`botBubbleTextColor` text DEFAULT '#171717' NOT NULL,
	`headerGradientFrom` text DEFAULT '#7c3aed' NOT NULL,
	`headerGradientTo` text DEFAULT '#7c3aed' NOT NULL,
	`shadowSize` text DEFAULT 'md' NOT NULL,
	`suggestions` text DEFAULT '["What services do you offer?","How can I get started?","Tell me more about pricing"]' NOT NULL,
	`hideSuggestionsOnInteract` integer DEFAULT true NOT NULL,
	`previewMessages` text DEFAULT '["Hi there! 👋","Need help with anything?"]' NOT NULL,
	`autoShowPreviewDelay` integer DEFAULT 3000 NOT NULL,
	`showBranding` integer DEFAULT true NOT NULL,
	`privacyPolicyUrl` text DEFAULT '/privacy-policy' NOT NULL,
	`enableLeadCapture` integer DEFAULT false NOT NULL,
	`leadCaptureKeywords` text DEFAULT '["contact","contact me","call me","reach me","get in touch"]' NOT NULL,
	`leadCaptureMinutesThreshold` integer DEFAULT 5 NOT NULL,
	`leadCaptureMessageThreshold` integer DEFAULT 4 NOT NULL,
	`enableBrochure` integer DEFAULT false NOT NULL,
	`brochureSuggestionText` text DEFAULT 'Receive Brochure' NOT NULL,
	`authorizedDomains` text DEFAULT '[]' NOT NULL,
	`createdAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` numeric NOT NULL,
	`workspaceId` text NOT NULL,
	FOREIGN KEY (`workspaceId`) REFERENCES `workspace`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_widget`("id", "publicKey", "displayName", "welcomeMessage", "inputPlaceholder", "primaryColor", "backgroundColor", "textColor", "borderColor", "fontFamily", "fontSize", "position", "launcherSize", "panelWidth", "panelHeight", "borderRadius", "borderRadiusStyle", "logoUrl", "instructions", "escalationKeywords", "modelProvider", "modelName", "isEnabled", "theme", "userBubbleColor", "userBubbleTextColor", "botBubbleColor", "botBubbleTextColor", "headerGradientFrom", "headerGradientTo", "shadowSize", "suggestions", "hideSuggestionsOnInteract", "previewMessages", "autoShowPreviewDelay", "showBranding", "privacyPolicyUrl", "enableLeadCapture", "leadCaptureKeywords", "leadCaptureMinutesThreshold", "leadCaptureMessageThreshold", "enableBrochure", "brochureSuggestionText", "authorizedDomains", "createdAt", "updatedAt", "workspaceId") SELECT "id", "publicKey", "displayName", "welcomeMessage", "inputPlaceholder", "primaryColor", "backgroundColor", "textColor", "borderColor", "fontFamily", "fontSize", "position", "launcherSize", "panelWidth", "panelHeight", "borderRadius", "borderRadiusStyle", "logoUrl", "instructions", "escalationKeywords", "modelProvider", "modelName", "isEnabled", "theme", "userBubbleColor", "userBubbleTextColor", "botBubbleColor", "botBubbleTextColor", "headerGradientFrom", "headerGradientTo", "shadowSize", "suggestions", "hideSuggestionsOnInteract", "previewMessages", "autoShowPreviewDelay", "showBranding", "privacyPolicyUrl", "enableLeadCapture", "leadCaptureKeywords", "leadCaptureMinutesThreshold", "leadCaptureMessageThreshold", "enableBrochure", "brochureSuggestionText", "authorizedDomains", "createdAt", "updatedAt", "workspaceId" FROM `widget`;--> statement-breakpoint
DROP TABLE `widget`;--> statement-breakpoint
ALTER TABLE `__new_widget` RENAME TO `widget`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `widget_workspaceId_key` ON `widget` (`workspaceId`);--> statement-breakpoint
CREATE UNIQUE INDEX `widget_publicKey_key` ON `widget` (`publicKey`);