"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Copy, Loader2, Moon, Save, Sun, Trash2 } from "@/components/icons";

import { WidgetLiveWidgetPreview } from "@/components/widget/widget-live-preview";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useWidgetConfig, useSaveWidgetConfig } from "@/hooks/query";
import type { DashboardWidgetConfig } from "@/hooks/query";
import { getRootHref } from "@/lib/deployment-urls";
import { isValidDomain, sanitizeDomain } from "@/lib/domain-validation";

const VALID_TABS = ["general", "appearance", "content", "lead-capture", "embed"];

type WidgetCustomizerConfig = Pick<
  DashboardWidgetConfig,
  | "publicKey"
  | "position"
  | "theme"
  | "agentName"
  | "welcomeMessage"
  | "logoUrl"
  | "primaryColor"
  | "userBubbleColor"
  | "userBubbleTextColor"
  | "botBubbleColor"
  | "botBubbleTextColor"
  | "headerGradientFrom"
  | "headerGradientTo"
  | "launcherSize"
  | "borderRadius"
  | "shadowSize"
  | "inputPlaceholder"
  | "suggestions"
  | "hideSuggestionsOnInteract"
  | "previewMessages"
  | "autoShowPreviewDelay"
  | "showBranding"
  | "privacyPolicyUrl"
  | "enableLeadCapture"
  | "leadCaptureKeywords"
  | "leadCaptureMinutesThreshold"
  | "leadCaptureMessageThreshold"
  | "enableBrochure"
  | "brochureSuggestionText"
  | "allowedDomains"
> & {
  workspaceId: string;
};

export function WidgetCustomizer({
  workspaceId,
  initialSubtab,
}: {
  workspaceId?: string | null;
  initialSubtab?: string | null;
}) {
  const activeWorkspaceId = workspaceId || "";
  const { toast } = useToast();
  const router = useRouter();
  const [ui, setUi] = useState({
    activeTab: initialSubtab && VALID_TABS.includes(initialSubtab) ? initialSubtab : "general",
    isSaving: false,
    copied: false,
    domainInput: "",
  });
  const { activeTab, isSaving, copied, domainInput } = ui;
  const inboundNumber = "";
  const [configOverrides, setConfigOverrides] = useState<Partial<WidgetCustomizerConfig>>({});
  const defaultConfig: WidgetCustomizerConfig = {
    workspaceId: activeWorkspaceId || "your-workspace-id",
    publicKey: "",
    position: "bottom-right",
    theme: "light",
    agentName: "Support",
    welcomeMessage: "Hi! How can I help you today?",
    logoUrl: "",
    primaryColor: "#14805e",
    userBubbleColor: "#14805e",
    userBubbleTextColor: "#ffffff",
    botBubbleColor: "#f2f2f8",
    botBubbleTextColor: "#171717",
    headerGradientFrom: "#14805e",
    headerGradientTo: "#0f6b4e",
    launcherSize: "md",
    borderRadius: "default",
    shadowSize: "md",
    inputPlaceholder: "Type your message...",
    suggestions: [
      "What services do you offer?",
      "How can I get started?",
      "Tell me more about pricing",
    ],
    hideSuggestionsOnInteract: true,
    previewMessages: ["Hi there! 👋", "Need help with anything?"],
    autoShowPreviewDelay: 3000,
    showBranding: true,
    privacyPolicyUrl: getRootHref("/privacy-policy"),
    enableLeadCapture: false,
    leadCaptureKeywords: ["contact", "contact me", "call me", "reach me", "get in touch"],
    leadCaptureMinutesThreshold: 5,
    leadCaptureMessageThreshold: 4,
    enableBrochure: false,
    brochureSuggestionText: "Receive Brochure",
    allowedDomains: [],
  };

  // Load data from hooks
  const { data: widgetConfigData, isLoading } = useWidgetConfig(activeWorkspaceId);
  const saveWidgetConfigMutation = useSaveWidgetConfig();
  const config: WidgetCustomizerConfig = {
    ...defaultConfig,
    ...(widgetConfigData && typeof widgetConfigData === "object" ? widgetConfigData : {}),
    ...configOverrides,
    workspaceId: activeWorkspaceId || "your-workspace-id",
  };

  const handleSubTabChange = (value: string) => {
    setUi((current) => ({ ...current, activeTab: value }));
    const url = new URL(window.location.href);
    url.searchParams.set("subtab", value);
    router.push(`${url.pathname}?${url.searchParams.toString()}`, { scroll: false });
  };

  const updateConfig = <Key extends keyof WidgetCustomizerConfig>(
    key: Key,
    value: WidgetCustomizerConfig[Key],
  ) => {
    setConfigOverrides((current) => ({ ...current, [key]: value }));
  };

  const handleArrayChange = (
    key: "suggestions" | "previewMessages" | "leadCaptureKeywords",
    value: string,
  ) => {
    const array = value.split("\n");
    updateConfig(key, array);
  };

  const handleSave = () => {
    if (!activeWorkspaceId) {
      toast({
        title: "Error",
        description: "Workspace ID is required to save configuration.",
        variant: "destructive",
      });
      return;
    }

    setUi((current) => ({ ...current, isSaving: true }));
    saveWidgetConfigMutation.mutate(
      {
        workspaceId: activeWorkspaceId,
        body: {
          ...config,
          suggestions: config.suggestions.filter((suggestion) => suggestion.trim()),
          previewMessages: config.previewMessages.filter((message) => message.trim()),
          leadCaptureKeywords: config.leadCaptureKeywords.filter((keyword) => keyword.trim()),
          allowedDomains: config.allowedDomains || [],
        },
      },
      {
        onSuccess: () => {
          toast({
            title: "Configuration saved",
            description: "Your widget configuration has been saved successfully.",
          });
          setUi((current) => ({ ...current, isSaving: false }));
        },
        onError: (error) => {
          toast({
            title: "Error saving configuration",
            description: error.message || "Failed to save configuration. Please try again.",
            variant: "destructive",
          });
          setUi((current) => ({ ...current, isSaving: false }));
        },
      },
    );
  };

  const handleAddDomain = () => {
    const sanitized = sanitizeDomain(domainInput);

    if (!sanitized) {
      toast({
        title: "Invalid domain",
        description: "Please enter a valid domain name",
        variant: "destructive",
      });
      return;
    }

    if (!isValidDomain(domainInput)) {
      toast({
        title: "Invalid domain format",
        description: "Domain must be a valid format (e.g., example.com)",
        variant: "destructive",
      });
      return;
    }

    const existingDomains = config.allowedDomains || [];
    if (existingDomains.includes(sanitized)) {
      toast({
        title: "Domain already exists",
        description: "This domain is already in your allowed list",
        variant: "destructive",
      });
      return;
    }

    updateConfig("allowedDomains", [...existingDomains, sanitized]);
    setUi((current) => ({ ...current, domainInput: "" }));
    toast({
      title: "Domain added",
      description: `${sanitized} has been added to allowed domains`,
    });
  };

  const handleRemoveDomain = (domain: string) => {
    const updatedDomains = config.allowedDomains.filter((item) => item !== domain);
    updateConfig("allowedDomains", updatedDomains);
    toast({
      title: "Domain removed",
      description: `${domain} has been removed from allowed domains`,
    });
  };

  const generateScript = () => {
    const publicKey = config.publicKey ?? "";
    return `<script src="${typeof window !== "undefined" ? window.location.origin : ""}/widget.bundle.js" data-widget-key="${publicKey}" async></script>`;
  };

  const copyScript = () => {
    navigator.clipboard.writeText(generateScript());
    setUi((current) => ({ ...current, copied: true }));
    toast({
      title: "Copied to clipboard",
      description: "Embed code has been copied to your clipboard.",
    });
    setTimeout(() => setUi((current) => ({ ...current, copied: false })), 2000);
  };

  return (
    <div className="relative w-full min-h-[calc(100vh-140px)]">
      {/* Full Width Controls */}
      <div className="w-full">
        <Card className="border-0 ring-0 shadow-none bg-transparent">
          <CardContent className="px-0">
            <Tabs value={activeTab} onValueChange={handleSubTabChange} className="w-full">
              <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
                <TabsList className="grid w-full grid-cols-5 md:max-w-2xl">
                  <TabsTrigger value="general">General</TabsTrigger>
                  <TabsTrigger value="appearance">Style</TabsTrigger>
                  <TabsTrigger value="content">Content</TabsTrigger>
                  <TabsTrigger value="lead-capture">Lead Capture</TabsTrigger>
                  <TabsTrigger value="embed">Embed</TabsTrigger>
                </TabsList>
                <Button
                  variant="outline"
                  onClick={handleSave}
                  disabled={isSaving || isLoading}
                  className="gap-2 md:w-auto"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {isSaving ? "Saving..." : "Save"}
                </Button>
              </div>

              <TabsContent value="general" className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <Label htmlFor="agentName">Agent Name</Label>
                    <Input
                      id="agentName"
                      value={config.agentName}
                      onChange={(e) => updateConfig("agentName", e.target.value)}
                      placeholder="Enter agent name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Position</Label>
                    <Select
                      value={config.position}
                      onValueChange={(value) => {
                        if (value) updateConfig("position", value);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select position" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bottom-right">Bottom Right</SelectItem>
                        <SelectItem value="bottom-left">Bottom Left</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Theme</Label>
                    <div className="flex items-center gap-2 p-1 border rounded-lg w-fit">
                      <Button
                        type="button"
                        variant={config.theme === "light" ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => updateConfig("theme", "light")}
                        className="gap-2"
                      >
                        <Sun className="w-4 h-4" /> Light
                      </Button>
                      <Button
                        type="button"
                        variant={config.theme === "dark" ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => updateConfig("theme", "dark")}
                        className="gap-2"
                      >
                        <Moon className="w-4 h-4" /> Dark
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="welcomeMessage">Welcome Message</Label>
                  <Textarea
                    id="welcomeMessage"
                    value={config.welcomeMessage}
                    onChange={(e) => updateConfig("welcomeMessage", e.target.value)}
                    placeholder="Enter welcome message"
                    rows={2}
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <Label className="text-sm font-medium">Logo Settings</Label>
                  <div className="max-w-md space-y-2">
                    <Label htmlFor="logoUrl">Logo URL</Label>
                    <Input
                      id="logoUrl"
                      value={config.logoUrl ?? ""}
                      onChange={(e) => updateConfig("logoUrl", e.target.value)}
                      placeholder="https://example.com/logo.png"
                    />
                    <p className="text-xs text-muted-foreground">
                      URL for the bot avatar and header logo
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="appearance" className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <Label htmlFor="primaryColor">Primary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="primaryColor"
                        type="color"
                        value={config.primaryColor}
                        onChange={(e) => updateConfig("primaryColor", e.target.value)}
                        className="w-12 h-10 p-1 border-2 cursor-pointer"
                      />
                      <Input
                        value={config.primaryColor}
                        onChange={(e) => updateConfig("primaryColor", e.target.value)}
                        placeholder="#000000"
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Launcher Size</Label>
                    <Select
                      value={config.launcherSize}
                      onValueChange={(value) => {
                        if (value) updateConfig("launcherSize", value);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sm">Small</SelectItem>
                        <SelectItem value="md">Medium</SelectItem>
                        <SelectItem value="lg">Large</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Border Radius</Label>
                    <Select
                      value={config.borderRadius}
                      onValueChange={(value) => {
                        if (value) updateConfig("borderRadius", value);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select radius" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="full">Full</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Shadow</Label>
                    <Select
                      value={config.shadowSize}
                      onValueChange={(value) => {
                        if (value) updateConfig("shadowSize", value);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select shadow" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="md">Medium</SelectItem>
                        <SelectItem value="lg">Large</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <Label className="text-sm font-medium">Header Gradient</Label>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">From</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={config.headerGradientFrom}
                          onChange={(e) => updateConfig("headerGradientFrom", e.target.value)}
                          className="w-12 p-1 border-2 cursor-pointer h-9"
                        />
                        <Input
                          value={config.headerGradientFrom}
                          onChange={(e) => updateConfig("headerGradientFrom", e.target.value)}
                          placeholder="#18181b"
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">To</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={config.headerGradientTo}
                          onChange={(e) => updateConfig("headerGradientTo", e.target.value)}
                          className="w-12 p-1 border-2 cursor-pointer h-9"
                        />
                        <Input
                          value={config.headerGradientTo}
                          onChange={(e) => updateConfig("headerGradientTo", e.target.value)}
                          placeholder="#000000"
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <Label className="text-sm font-medium">User Bubble</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Background</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={config.userBubbleColor}
                            onChange={(e) => updateConfig("userBubbleColor", e.target.value)}
                            className="w-12 p-1 border-2 cursor-pointer h-9"
                          />
                          <Input
                            value={config.userBubbleColor}
                            onChange={(e) => updateConfig("userBubbleColor", e.target.value)}
                            placeholder="#000000"
                            className="flex-1"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Text</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={config.userBubbleTextColor}
                            onChange={(e) => updateConfig("userBubbleTextColor", e.target.value)}
                            className="w-12 p-1 border-2 cursor-pointer h-9"
                          />
                          <Input
                            value={config.userBubbleTextColor}
                            onChange={(e) => updateConfig("userBubbleTextColor", e.target.value)}
                            placeholder="#ffffff"
                            className="flex-1"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-sm font-medium">Bot Bubble</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Background</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={config.botBubbleColor}
                            onChange={(e) => updateConfig("botBubbleColor", e.target.value)}
                            className="w-12 p-1 border-2 cursor-pointer h-9"
                          />
                          <Input
                            value={config.botBubbleColor}
                            onChange={(e) => updateConfig("botBubbleColor", e.target.value)}
                            placeholder="#f4f4f5"
                            className="flex-1"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Text</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={config.botBubbleTextColor}
                            onChange={(e) => updateConfig("botBubbleTextColor", e.target.value)}
                            className="w-12 p-1 border-2 cursor-pointer h-9"
                          />
                          <Input
                            value={config.botBubbleTextColor}
                            onChange={(e) => updateConfig("botBubbleTextColor", e.target.value)}
                            placeholder="#18181b"
                            className="flex-1"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="content" className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="inputPlaceholder">Input Placeholder</Label>
                    <Input
                      id="inputPlaceholder"
                      value={config.inputPlaceholder}
                      onChange={(e) => updateConfig("inputPlaceholder", e.target.value)}
                      placeholder="Type your message..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="autoShowDelay">Auto Show Delay (ms)</Label>
                    <Input
                      id="autoShowDelay"
                      type="number"
                      value={config.autoShowPreviewDelay}
                      onChange={(e) =>
                        updateConfig("autoShowPreviewDelay", parseInt(e.target.value) || 0)
                      }
                      placeholder="3000"
                    />
                    <p className="text-xs text-muted-foreground">
                      Set to 0 to show immediately, or -1 to disable.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="suggestions">Suggested Questions (one per line)</Label>
                    <Textarea
                      id="suggestions"
                      value={(config.suggestions || []).join("\n")}
                      onChange={(e) => handleArrayChange("suggestions", e.target.value)}
                      placeholder={
                        "What services do you offer?\nHow can I get started?\nHow can I contact support?"
                      }
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="previewMessages">Preview Messages (one per line)</Label>
                    <Textarea
                      id="previewMessages"
                      value={(config.previewMessages || []).join("\n")}
                      onChange={(e) => handleArrayChange("previewMessages", e.target.value)}
                      placeholder="Hi! How can I help?"
                      rows={4}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="hideSuggestionsOnInteract">Hide Suggestions on Interact</Label>
                    <p className="text-xs text-muted-foreground">
                      Hide suggested questions after user sends a message
                    </p>
                  </div>
                  <Switch
                    id="hideSuggestionsOnInteract"
                    checked={config.hideSuggestionsOnInteract}
                    onCheckedChange={(val) => updateConfig("hideSuggestionsOnInteract", val)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="showBranding">Show Branding</Label>
                    <p className="text-xs text-muted-foreground">
                      Display &quot;Powered by widget&quot; link in the widget
                    </p>
                  </div>
                  <Switch
                    id="showBranding"
                    checked={config.showBranding}
                    onCheckedChange={(val) => updateConfig("showBranding", val)}
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="privacyPolicyUrl">Privacy Policy URL</Label>
                  <Input
                    id="privacyPolicyUrl"
                    value={config.privacyPolicyUrl}
                    onChange={(e) => updateConfig("privacyPolicyUrl", e.target.value)}
                    placeholder="https://example.com/privacy-policy"
                  />
                  <p className="text-xs text-muted-foreground">
                    Link to your privacy policy shown in the widget footer
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="embed" className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <Label className="text-base font-medium">Authorized Domains</Label>
                    <p className="text-sm text-muted-foreground">
                      Add each website domain where the widget is embedded (for example{" "}
                      <code className="px-1 py-0.5 bg-muted rounded text-xs">acme.com</code>
                      ). Subdomains are included automatically. The widget dashboard is always
                      allowed for preview.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <span className="text-sm text-muted-foreground">https://</span>
                      </div>
                      <Input
                        id="domainInput"
                        placeholder="example.com"
                        value={domainInput}
                        onChange={(event) =>
                          setUi((current) => ({
                            ...current,
                            domainInput: event.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddDomain();
                          }
                        }}
                        className="pl-18"
                      />
                    </div>
                    <Button onClick={handleAddDomain} disabled={!domainInput}>
                      Add
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {(config.allowedDomains || []).map((domain: string) => (
                      <div
                        key={domain}
                        className="flex items-center justify-between px-3 py-2 border rounded-md bg-muted/40"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{domain}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveDomain(domain)}
                          className="w-8 h-8 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    {(!config.allowedDomains || config.allowedDomains.length === 0) && (
                      <div className="flex flex-col items-center justify-center py-6 border-2 border-dashed rounded-lg border-muted/50">
                        <p className="text-sm text-muted-foreground">No domains authorized yet</p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="space-y-1">
                    <Label className="text-base font-medium">Installation</Label>
                    <p className="text-sm text-muted-foreground">
                      Copy this code and paste it before the closing{" "}
                      <code className="px-1 py-0.5 bg-muted rounded text-xs">&lt;/body&gt;</code>{" "}
                      tag.
                    </p>
                  </div>
                  <div className="relative">
                    <pre className="p-4 overflow-x-auto font-mono text-xs border rounded-lg bg-muted/50 max-h-80">
                      {generateScript()}
                    </pre>
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="absolute w-8 h-8 top-2 right-2"
                      onClick={copyScript}
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="lead-capture" className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="enableLeadCapture" className="flex items-center gap-2">
                      <Switch
                        id="enableLeadCapture"
                        checked={config.enableLeadCapture || false}
                        onCheckedChange={(checked) => updateConfig("enableLeadCapture", checked)}
                      />
                      Enable Lead Capture
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically capture visitor information when they show buying intent
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="leadCaptureMinutesThreshold">
                      Session Duration Threshold (minutes)
                    </Label>
                    <Input
                      id="leadCaptureMinutesThreshold"
                      type="number"
                      min="1"
                      max="60"
                      value={config.leadCaptureMinutesThreshold || 5}
                      onChange={(e) =>
                        updateConfig("leadCaptureMinutesThreshold", parseInt(e.target.value))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Show form after visitor has been chatting for this long
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="leadCaptureMessageThreshold">Message Count Threshold</Label>
                    <Input
                      id="leadCaptureMessageThreshold"
                      type="number"
                      min="1"
                      max="50"
                      value={config.leadCaptureMessageThreshold || 4}
                      onChange={(e) =>
                        updateConfig("leadCaptureMessageThreshold", parseInt(e.target.value))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Show form after visitor has sent this many messages
                    </p>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="space-y-2">
                  <Label htmlFor="leadCaptureKeywords">Trigger Keywords (one per line)</Label>
                  <Textarea
                    id="leadCaptureKeywords"
                    placeholder="contact&#10;contact me&#10;call me&#10;reach me&#10;get in touch"
                    rows={5}
                    value={(config.leadCaptureKeywords || []).join("\n")}
                    onChange={(e) => handleArrayChange("leadCaptureKeywords", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Visitors will be prompted to leave their contact info when they mention any of
                    these keywords
                  </p>
                </div>

                {/* Brochure Feature */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="enableBrochure" className="flex items-center gap-2">
                      <Switch
                        id="enableBrochure"
                        checked={config.enableBrochure || false}
                        onCheckedChange={(checked) => updateConfig("enableBrochure", checked)}
                      />
                      Enable Brochure Feature
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Add a brochure suggestion button to the chat. Visitors can click it or type
                      keywords like &quot;send brochure&quot; to receive downloadable documents
                      directly in the chat widget.
                    </p>
                  </div>

                  {config.enableBrochure && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="brochureSuggestionText">Suggestion Button Text</Label>
                        <Input
                          id="brochureSuggestionText"
                          value={config.brochureSuggestionText || "Receive Brochure"}
                          onChange={(e) => updateConfig("brochureSuggestionText", e.target.value)}
                          placeholder="Receive Brochure"
                        />
                        <p className="text-xs text-muted-foreground">
                          The text shown on the suggestion button
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <WidgetLiveWidgetPreview config={config} inboundNumber={inboundNumber} />
    </div>
  );
}
