"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { useRef } from "react";

import { Check, Copy, Moon, RotateCcw, Sun, Trash2 } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { WidgetPosition, WidgetTheme, WidgetModelProvider } from "@/features/widget/domain";
import { normalizeLogoUrl, widgetModelOptions } from "@/features/widget/domain";
import { WIDGET_BRAND_COLOR } from "@/lib/widget-accent";
import { cn } from "@/lib/utils";

export const APPEARANCE_DEFAULTS = {
  primaryColor: WIDGET_BRAND_COLOR,
  backgroundColor: "#FFFFFF",
  headerGradientFrom: WIDGET_BRAND_COLOR,
  headerGradientTo: WIDGET_BRAND_COLOR,
  userBubbleColor: WIDGET_BRAND_COLOR,
  userBubbleTextColor: "#FFFFFF",
  botBubbleColor: "#F2F4F7",
  botBubbleTextColor: "#667085",
  textColor: "#101828",
  secondaryTextColor: "#667085",
  borderColor: "#EAECF0",
  linkColor: WIDGET_BRAND_COLOR,
  position: "bottom-right" as const,
  theme: "light" as const,
  welcomeMessage: "Hi! 👋 How can I help you today?",
  showBranding: true,
  logoUrl: "",
  fontFamily: "Inter" as const,
  fontSize: "14px" as const,
  agentName: "Acme Assistant",
};

const FONT_FAMILIES = ["Inter", "Geist", "System UI", "Roboto", "Open Sans"] as const;
const FONT_SIZES = ["12px", "13px", "14px", "15px", "16px"] as const;
const WELCOME_MESSAGE_MAX = 80;

export type AppearanceConfig = {
  logoUrl: string;
  primaryColor: string;
  backgroundColor: string;
  headerGradientFrom: string;
  userBubbleColor: string;
  botBubbleColor: string;
  textColor: string;
  secondaryTextColor: string;
  borderColor: string;
  linkColor: string;
  position: WidgetPosition;
  theme: WidgetTheme;
  showBranding: boolean;
  welcomeMessage: string;
  fontFamily: string;
  fontSize: string;
};

const FIELD_CLASS = cn("h-10 rounded-lg border border-border bg-card px-3 text-sm shadow-xs");
const TEXTAREA_FIELD_CLASS = cn(
  "resize-y rounded-lg border border-border bg-card px-3 py-2.5 text-sm shadow-xs",
);
const INPUT_NO_RING_CLASS = cn(
  "h-8 flex-1 border-0 bg-transparent px-1 text-sm text-foreground shadow-none focus-visible:ring-0",
);

function SettingsPanelHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex items-start justify-between gap-4 border-b border-border pb-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

function WidgetColorInput({
  id,
  label,
  value,
  onChange,
  className,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </Label>
      <div className="flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-2 shadow-xs transition-colors focus-within:border-[var(--widget-accent)] focus-within:ring-2 focus-within:ring-[var(--widget-accent)]/20">
        <label htmlFor={`${id}-picker`} className="relative shrink-0 cursor-pointer">
          <span
            className="block size-6 rounded border border-border"
            style={{ backgroundColor: value }}
          />
          <input
            id={`${id}-picker`}
            type="color"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
            aria-label={`${label} color picker`}
          />
        </label>
        <Input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={INPUT_NO_RING_CLASS}
        />
      </div>
    </div>
  );
}

function WidgetSegmentedControl<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: { value: T; label: string; icon?: ReactNode }[];
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex gap-2", className)}>
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium transition-all duration-150",
              isActive
                ? "border-[var(--widget-accent)] bg-[var(--widget-accent-muted)] text-[var(--widget-accent)] shadow-xs"
                : "border-border bg-card text-foreground hover:bg-muted",
            )}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function getAppearanceDefaults(): AppearanceConfig {
  return {
    logoUrl: APPEARANCE_DEFAULTS.logoUrl,
    primaryColor: APPEARANCE_DEFAULTS.primaryColor,
    backgroundColor: APPEARANCE_DEFAULTS.backgroundColor,
    headerGradientFrom: APPEARANCE_DEFAULTS.headerGradientFrom,
    userBubbleColor: APPEARANCE_DEFAULTS.userBubbleColor,
    botBubbleColor: APPEARANCE_DEFAULTS.botBubbleColor,
    textColor: APPEARANCE_DEFAULTS.textColor,
    secondaryTextColor: APPEARANCE_DEFAULTS.secondaryTextColor,
    borderColor: APPEARANCE_DEFAULTS.borderColor,
    linkColor: APPEARANCE_DEFAULTS.linkColor,
    position: APPEARANCE_DEFAULTS.position,
    theme: APPEARANCE_DEFAULTS.theme,
    showBranding: APPEARANCE_DEFAULTS.showBranding,
    welcomeMessage: APPEARANCE_DEFAULTS.welcomeMessage,
    fontFamily: APPEARANCE_DEFAULTS.fontFamily,
    fontSize: APPEARANCE_DEFAULTS.fontSize,
  };
}

export function WidgetAppearancePanel({
  config,
  onUpdate,
  onBatchUpdate,
  onReset,
}: {
  config: AppearanceConfig;
  onUpdate: <K extends keyof AppearanceConfig>(key: K, value: AppearanceConfig[K]) => void;
  onBatchUpdate?: (updates: Partial<AppearanceConfig>) => void;
  onReset: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resolvedLogoUrl = normalizeLogoUrl(config.logoUrl);
  const fontFamily = config.fontFamily || APPEARANCE_DEFAULTS.fontFamily;
  const fontSize = config.fontSize || APPEARANCE_DEFAULTS.fontSize;

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onUpdate("logoUrl", reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      <SettingsPanelHeader
        title="Appearance"
        description="Customize the look and feel of your widget."
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onReset}
            className="h-8 shrink-0 gap-1.5 rounded-lg border-border bg-card px-3 text-xs font-medium text-muted-foreground shadow-none hover:bg-muted hover:text-foreground"
          >
            <RotateCcw className="size-3.5" />
            Reset to defaults
          </Button>
        }
      />

      <div className="space-y-8">
        <section className="space-y-4">
          <h3 className="text-sm font-medium text-foreground">Widget Design</h3>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-foreground">Widget Icon</Label>
            <div className="flex items-center gap-3">
              <div
                className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border"
                style={{ backgroundColor: resolvedLogoUrl ? "transparent" : config.primaryColor }}
              >
                {resolvedLogoUrl ? (
                  <Image
                    src={resolvedLogoUrl}
                    alt="Widget icon"
                    width={48}
                    height={48}
                    unoptimized
                    className="size-full object-cover"
                  />
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    className="size-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
                  </svg>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="h-9 rounded-lg border-border bg-card px-4 text-sm font-medium text-foreground shadow-xs"
              >
                Change
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onUpdate("logoUrl", "")}
                disabled={!resolvedLogoUrl}
                className="h-9 rounded-lg px-4 text-sm font-medium text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                Remove
              </Button>
            </div>
          </div>

          <WidgetColorInput
            id="widget-color"
            label="Widget Color"
            value={config.primaryColor}
            onChange={(value) => {
              if (onBatchUpdate) {
                onBatchUpdate({
                  primaryColor: value,
                  linkColor: value,
                  userBubbleColor: value,
                  headerGradientFrom: value,
                });
                return;
              }
              onUpdate("primaryColor", value);
              onUpdate("linkColor", value);
              onUpdate("userBubbleColor", value);
              onUpdate("headerGradientFrom", value);
            }}
          />

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">Position on screen</Label>
              <WidgetSegmentedControl
                value={config.position}
                onChange={(value) => onUpdate("position", value)}
                options={[
                  { value: "bottom-right", label: "Bottom right" },
                  { value: "bottom-left", label: "Bottom left" },
                ]}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">Theme</Label>
              <WidgetSegmentedControl
                value={config.theme}
                onChange={(value) => onUpdate("theme", value)}
                options={[
                  { value: "light", label: "Light", icon: <Sun className="size-4" /> },
                  { value: "dark", label: "Dark", icon: <Moon className="size-4" /> },
                ]}
              />
            </div>
          </div>
        </section>

        <section className="space-y-4 border-t border-border pt-8">
          <h3 className="text-sm font-medium text-foreground">Customize Colors</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <WidgetColorInput
              id="bg-color"
              label="Background color (Widget)"
              value={config.backgroundColor}
              onChange={(value) => onUpdate("backgroundColor", value)}
            />
            <WidgetColorInput
              id="header-bg"
              label="Header background"
              value={config.headerGradientFrom}
              onChange={(value) => onUpdate("headerGradientFrom", value)}
            />
            <WidgetColorInput
              id="user-msg"
              label="User message color"
              value={config.userBubbleColor}
              onChange={(value) => onUpdate("userBubbleColor", value)}
            />
            <WidgetColorInput
              id="ai-msg-bg"
              label="AI message background"
              value={config.botBubbleColor}
              onChange={(value) => onUpdate("botBubbleColor", value)}
            />
            <WidgetColorInput
              id="text-color"
              label="Text color"
              value={config.textColor}
              onChange={(value) => onUpdate("textColor", value)}
            />
            <WidgetColorInput
              id="secondary-text"
              label="Secondary text color"
              value={config.secondaryTextColor}
              onChange={(value) => onUpdate("secondaryTextColor", value)}
            />
            <WidgetColorInput
              id="border-color"
              label="Border color"
              value={config.borderColor}
              onChange={(value) => onUpdate("borderColor", value)}
            />
            <WidgetColorInput
              id="link-color"
              label="Link color"
              value={config.linkColor}
              onChange={(value) => {
                if (onBatchUpdate) {
                  onBatchUpdate({ linkColor: value, primaryColor: value });
                  return;
                }
                onUpdate("linkColor", value);
                onUpdate("primaryColor", value);
              }}
            />
          </div>
        </section>

        <section className="space-y-4 border-t border-border pt-8">
          <h3 className="text-sm font-medium text-foreground">Typography</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">Font family</Label>
              <Select
                value={fontFamily}
                onValueChange={(value) => value && onUpdate("fontFamily", value)}
              >
                <SelectTrigger className={FIELD_CLASS}>
                  <SelectValue placeholder={APPEARANCE_DEFAULTS.fontFamily} />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  {FONT_FAMILIES.map((font) => (
                    <SelectItem key={font} value={font}>
                      {font}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">Font size</Label>
              <Select
                value={fontSize}
                onValueChange={(value) => value && onUpdate("fontSize", value)}
              >
                <SelectTrigger className={FIELD_CLASS}>
                  <SelectValue placeholder={APPEARANCE_DEFAULTS.fontSize} />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  {FONT_SIZES.map((size) => (
                    <SelectItem key={size} value={size}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted px-4 py-3.5">
          <div>
            <p className="text-sm font-medium text-foreground">Remove branding</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Remove &apos;Powered by Acme&apos; from the widget
            </p>
          </div>
          <Switch
            checked={!config.showBranding}
            onCheckedChange={(checked) => onUpdate("showBranding", !checked)}
            className="data-checked:bg-[var(--widget-accent)]"
          />
        </section>
      </div>
    </>
  );
}

export function WidgetAgentPanel({
  agentName,
  instructions,
  escalationKeywords,
  modelProvider,
  modelName,
  onUpdate,
}: {
  agentName: string;
  instructions: string;
  escalationKeywords: string;
  modelProvider: string | null;
  modelName: string | null;
  onUpdate: (
    key: "agentName" | "instructions" | "escalationKeywords" | "modelProvider" | "modelName",
    value: any,
  ) => void;
}) {
  const provider = (modelProvider === "GOOGLE" ? "GOOGLE" : "OPENAI") as WidgetModelProvider;
  const models = widgetModelOptions[provider];

  return (
    <>
      <SettingsPanelHeader
        title="Agent"
        description="Configure your AI assistant's identity and behavior instructions."
      />
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="model-provider" className="text-sm font-medium text-foreground">
              Model Provider
            </Label>
            <Select
              value={provider}
              onValueChange={(value) => {
                onUpdate("modelProvider", value);
                const defaultModel =
                  widgetModelOptions[value as WidgetModelProvider][0]?.value ?? "";
                onUpdate("modelName", defaultModel);
              }}
            >
              <SelectTrigger id="model-provider" className={FIELD_CLASS}>
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent className="rounded-lg">
                <SelectItem value="OPENAI">OpenAI</SelectItem>
                <SelectItem value="GOOGLE">Google Gemini</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="model-name" className="text-sm font-medium text-foreground">
              Model Name
            </Label>
            <Select value={modelName} onValueChange={(value) => onUpdate("modelName", value)}>
              <SelectTrigger id="model-name" className={FIELD_CLASS}>
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent className="rounded-lg">
                {models.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="agent-name" className="text-sm font-medium text-foreground">
            Agent name
          </Label>
          <Input
            id="agent-name"
            value={agentName}
            onChange={(event) => onUpdate("agentName", event.target.value)}
            placeholder="Acme Assistant"
            className={FIELD_CLASS}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="instructions" className="text-sm font-medium text-foreground">
            Instructions
          </Label>
          <p className="text-sm text-muted-foreground">
            System prompt that guides how your assistant responds.
          </p>
          <Textarea
            id="instructions"
            value={instructions}
            onChange={(event) => onUpdate("instructions", event.target.value)}
            rows={8}
            className={cn(TEXTAREA_FIELD_CLASS, "min-h-[160px] leading-6")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="escalation-keywords" className="text-sm font-medium text-foreground">
            Escalation keywords
          </Label>
          <p className="text-sm text-muted-foreground">
            Comma-separated keywords that trigger human handoff.
          </p>
          <Input
            id="escalation-keywords"
            value={escalationKeywords}
            onChange={(event) => onUpdate("escalationKeywords", event.target.value)}
            placeholder="human, agent, person, representative"
            className={FIELD_CLASS}
          />
        </div>
      </div>
    </>
  );
}

type BehaviourConfigKeys =
  | "inputPlaceholder"
  | "autoShowPreviewDelay"
  | "hideSuggestionsOnInteract"
  | "enableLeadCapture"
  | "leadCaptureMinutesThreshold"
  | "leadCaptureMessageThreshold"
  | "enableBrochure"
  | "brochureSuggestionText"
  | "privacyPolicyUrl";

export function WidgetBehaviourPanel({
  inputPlaceholder,
  autoShowPreviewDelay,
  hideSuggestionsOnInteract,
  enableLeadCapture,
  leadCaptureMinutesThreshold,
  leadCaptureMessageThreshold,
  leadCaptureKeywords,
  enableBrochure,
  brochureSuggestionText,
  privacyPolicyUrl,
  onUpdate,
  onKeywordsChange,
}: {
  inputPlaceholder: string;
  autoShowPreviewDelay: number;
  hideSuggestionsOnInteract: boolean;
  enableLeadCapture: boolean;
  leadCaptureMinutesThreshold: number;
  leadCaptureMessageThreshold: number;
  leadCaptureKeywords: string[];
  enableBrochure: boolean;
  brochureSuggestionText: string;
  privacyPolicyUrl: string;
  onUpdate: <K extends BehaviourConfigKeys>(key: K, value: string | number | boolean) => void;
  onKeywordsChange: (value: string) => void;
}) {
  return (
    <>
      <SettingsPanelHeader
        title="Behaviour"
        description="Control how your widget interacts with visitors."
      />
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="input-placeholder" className="text-sm font-medium text-foreground">
              Input placeholder
            </Label>
            <Input
              id="input-placeholder"
              value={inputPlaceholder}
              onChange={(event) => onUpdate("inputPlaceholder", event.target.value)}
              className={FIELD_CLASS}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="auto-show-delay" className="text-sm font-medium text-foreground">
              Auto show delay (ms)
            </Label>
            <Input
              id="auto-show-delay"
              type="number"
              value={autoShowPreviewDelay}
              onChange={(event) =>
                onUpdate("autoShowPreviewDelay", parseInt(event.target.value, 10) || 0)
              }
              className={FIELD_CLASS}
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-4">
          <div>
            <p className="text-sm font-medium text-foreground">Hide suggestions on interact</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Hide suggested questions after the user sends a message
            </p>
          </div>
          <Switch
            checked={hideSuggestionsOnInteract}
            onCheckedChange={(checked) => onUpdate("hideSuggestionsOnInteract", checked)}
            className="data-checked:bg-[var(--widget-accent)]"
          />
        </div>
        <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-4">
          <div>
            <p className="text-sm font-medium text-foreground">Enable lead capture</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Prompt visitors for contact info when they show buying intent
            </p>
          </div>
          <Switch
            checked={enableLeadCapture}
            onCheckedChange={(checked) => onUpdate("enableLeadCapture", checked)}
            className="data-checked:bg-[var(--widget-accent)]"
          />
        </div>
        {enableLeadCapture ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">
                Session duration (minutes)
              </Label>
              <Input
                type="number"
                min={1}
                max={60}
                value={leadCaptureMinutesThreshold}
                onChange={(event) =>
                  onUpdate("leadCaptureMinutesThreshold", parseInt(event.target.value, 10) || 1)
                }
                className={FIELD_CLASS}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">Message count threshold</Label>
              <Input
                type="number"
                min={1}
                max={50}
                value={leadCaptureMessageThreshold}
                onChange={(event) =>
                  onUpdate("leadCaptureMessageThreshold", parseInt(event.target.value, 10) || 1)
                }
                className={FIELD_CLASS}
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-sm font-medium text-foreground">
                Trigger keywords (one per line)
              </Label>
              <Textarea
                value={leadCaptureKeywords.join("\n")}
                onChange={(event) => onKeywordsChange(event.target.value)}
                rows={4}
                className={cn(TEXTAREA_FIELD_CLASS, "min-h-[100px]")}
              />
            </div>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-4">
          <div>
            <p className="text-sm font-medium text-foreground">Enable brochure feature</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Let visitors request downloadable documents in chat
            </p>
          </div>
          <Switch
            checked={enableBrochure}
            onCheckedChange={(checked) => onUpdate("enableBrochure", checked)}
            className="data-checked:bg-[var(--widget-accent)]"
          />
        </div>
        {enableBrochure ? (
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-foreground">Brochure button text</Label>
            <Input
              value={brochureSuggestionText}
              onChange={(event) => onUpdate("brochureSuggestionText", event.target.value)}
              className={FIELD_CLASS}
            />
          </div>
        ) : null}
        <div className="space-y-1.5">
          <Label htmlFor="privacy-url" className="text-sm font-medium text-foreground">
            Privacy policy URL
          </Label>
          <Input
            id="privacy-url"
            value={privacyPolicyUrl}
            onChange={(event) => onUpdate("privacyPolicyUrl", event.target.value)}
            className={FIELD_CLASS}
          />
        </div>
      </div>
    </>
  );
}

export function WidgetConversationStarterPanel({
  welcomeMessage,
  previewMessages,
  onUpdateWelcome,
  onPreviewMessagesChange,
}: {
  welcomeMessage: string;
  previewMessages: string[];
  onUpdateWelcome: (value: string) => void;
  onPreviewMessagesChange: (value: string) => void;
}) {
  return (
    <>
      <SettingsPanelHeader
        title="Conversation Starter"
        description="Set the opening message and preview bubbles shown before chat opens."
      />
      <div className="space-y-6">
        <div className="space-y-1.5">
          <Label htmlFor="starter-welcome" className="text-sm font-medium text-foreground">
            Welcome message
          </Label>
          <p className="text-sm text-muted-foreground">The first message users will see.</p>
          <div className="relative">
            <Textarea
              id="starter-welcome"
              value={welcomeMessage}
              onChange={(event) =>
                onUpdateWelcome(event.target.value.slice(0, WELCOME_MESSAGE_MAX))
              }
              rows={3}
              className={cn(TEXTAREA_FIELD_CLASS, "min-h-[88px] resize-none")}
            />
            <span className="absolute right-3 bottom-2.5 text-xs text-muted-foreground">
              {welcomeMessage.length}/{WELCOME_MESSAGE_MAX}
            </span>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="preview-messages" className="text-sm font-medium text-foreground">
            Preview messages
          </Label>
          <p className="text-sm text-muted-foreground">
            One message per line, shown in the launcher preview.
          </p>
          <Textarea
            id="preview-messages"
            value={previewMessages.join("\n")}
            onChange={(event) => onPreviewMessagesChange(event.target.value)}
            rows={4}
            placeholder={"Hi there! 👋\nNeed help with anything?"}
            className={cn(TEXTAREA_FIELD_CLASS, "min-h-[120px]")}
          />
        </div>
      </div>
    </>
  );
}

export function WidgetSuggestedQuestionsPanel({
  suggestions,
  onChange,
}: {
  suggestions: string[];
  onChange: (value: string) => void;
}) {
  return (
    <>
      <SettingsPanelHeader
        title="Suggested Questions"
        description="Quick-reply chips shown to help visitors start a conversation."
      />
      <div className="space-y-1.5">
        <Label htmlFor="suggestions" className="text-sm font-medium text-foreground">
          Questions (one per line)
        </Label>
        <Textarea
          id="suggestions"
          value={suggestions.join("\n")}
          onChange={(event) => onChange(event.target.value)}
          rows={6}
          placeholder={
            "How do I reset my password?\nCan I schedule a demo?\nDo you offer a free trial?"
          }
          className={cn(TEXTAREA_FIELD_CLASS, "min-h-[160px]")}
        />
      </div>
    </>
  );
}

export function WidgetInstallationPanel({
  allowedDomains,
  domainInput,
  copied,
  embedScript,
  onDomainInputChange,
  onAddDomain,
  onRemoveDomain,
  onCopyScript,
}: {
  allowedDomains: string[];
  domainInput: string;
  copied: boolean;
  embedScript: string;
  onDomainInputChange: (value: string) => void;
  onAddDomain: () => void;
  onRemoveDomain: (domain: string) => void;
  onCopyScript: () => void;
}) {
  return (
    <>
      <SettingsPanelHeader
        title="Installation"
        description="Authorize domains and copy the embed code to your website."
      />
      <div className="space-y-8">
        <section className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Authorized domains</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Add each website domain where the widget is embedded (e.g.{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">acme.com</code>).
            </p>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
                https://
              </span>
              <Input
                value={domainInput}
                onChange={(event) => onDomainInputChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    onAddDomain();
                  }
                }}
                placeholder="example.com"
                className={cn(FIELD_CLASS, "pl-[4.5rem]")}
              />
            </div>
            <Button
              type="button"
              onClick={onAddDomain}
              disabled={!domainInput.trim()}
              className="h-10 rounded-lg bg-[var(--widget-accent)] px-4 text-sm font-medium text-primary-foreground hover:bg-[var(--widget-accent-hover)]"
            >
              Add
            </Button>
          </div>
          <div className="space-y-2">
            {allowedDomains.map((domain) => (
              <div
                key={domain}
                className="flex items-center justify-between rounded-lg border border-border bg-muted px-3 py-2.5"
              >
                <span className="text-sm font-medium text-foreground">{domain}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onRemoveDomain(domain)}
                  className="size-8 text-muted-foreground hover:text-destructive"
                  aria-label={`Remove ${domain}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            {allowedDomains.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border py-8">
                <p className="text-sm text-muted-foreground">No domains authorized yet</p>
              </div>
            ) : null}
          </div>
        </section>
        <section className="space-y-4">
          <div>
            <Label className="text-sm font-semibold text-foreground">Embed code</Label>
            <p className="mt-1 text-sm text-muted-foreground">
              Paste this before the closing{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">&lt;/body&gt;</code> tag.
            </p>
          </div>
          <div className="relative">
            <pre className="max-h-48 overflow-x-auto rounded-lg border border-border bg-muted p-4 font-mono text-xs leading-5 text-foreground">
              {embedScript}
            </pre>
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              onClick={onCopyScript}
              className="absolute top-2 right-2 size-8 rounded-lg border-border bg-card"
              aria-label="Copy embed code"
            >
              {copied ? <Check className="size-4 text-primary" /> : <Copy className="size-4" />}
            </Button>
          </div>
        </section>
      </div>
    </>
  );
}
