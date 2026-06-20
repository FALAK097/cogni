"use client";

import { useActionState, useMemo, useState } from "react";
import { CheckmarkCircle02Icon, Copy01Icon, FloppyDiskIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import { saveWidgetSettingsAction, type WidgetActionState } from "@/features/widget/actions";
import {
  type WidgetModelProvider,
  type WidgetSettings,
  widgetModelOptions,
} from "@/features/widget/domain";
import { WidgetShell } from "@/features/widget/components/widget-shell";
import Color from "color";
import {
  ColorPicker,
  ColorPickerFormat,
  ColorPickerHue,
  ColorPickerSelection,
} from "@/components/ui/color-picker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const initialActionState: WidgetActionState = {};
const inputClassName =
  "h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/30";

export function WidgetStudio({
  initialSettings,
  previewSessionToken,
  appUrl,
}: {
  initialSettings: WidgetSettings;
  previewSessionToken: string;
  appUrl: string;
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [copied, setCopied] = useState(false);
  const [actionState, formAction, pending] = useActionState(
    saveWidgetSettingsAction,
    initialActionState,
  );
  const installCode = useMemo(
    () =>
      `<script src="${appUrl}/widget.js" data-widget-key="${settings.publicKey}" async></script>`,
    [appUrl, settings.publicKey],
  );

  function update<K extends keyof WidgetSettings>(key: K, value: WidgetSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_28rem]">
      <form action={formAction} className="space-y-8 divide-y divide-border">
        {/* Brand and behavior */}
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Brand and behavior</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium">
              Assistant name
              <input
                name="displayName"
                value={settings.displayName}
                onChange={(event) => update("displayName", event.currentTarget.value)}
                className={inputClassName}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Logo URL
              <input
                name="logoUrl"
                type="url"
                value={settings.logoUrl ?? ""}
                onChange={(event) => update("logoUrl", event.currentTarget.value || null)}
                placeholder="https://…"
                className={inputClassName}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium sm:col-span-2">
              Welcome message
              <input
                name="welcomeMessage"
                value={settings.welcomeMessage}
                onChange={(event) => update("welcomeMessage", event.currentTarget.value)}
                className={inputClassName}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium sm:col-span-2">
              Input placeholder
              <input
                name="inputPlaceholder"
                value={settings.inputPlaceholder}
                onChange={(event) => update("inputPlaceholder", event.currentTarget.value)}
                className={inputClassName}
              />
            </label>
            {[
              ["primaryColor", "Primary"],
              ["backgroundColor", "Background"],
              ["textColor", "Text"],
            ].map(([key, label]) => {
              const colorValue = settings[key as keyof WidgetSettings] as string;
              return (
                <div key={key} className="grid gap-2 text-sm font-medium">
                  {label} color
                  <input type="hidden" name={key} value={colorValue} />
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <button
                          type="button"
                          className="flex h-10 w-full items-center gap-3 rounded-xl border bg-background px-3 text-left text-sm outline-hidden focus-visible:ring-3 focus-visible:ring-ring/30 cursor-pointer"
                        >
                          <span
                            className="size-5 shrink-0 rounded-md border"
                            style={{ backgroundColor: colorValue }}
                          />
                          <span className="font-mono text-xs">{colorValue}</span>
                        </button>
                      }
                    />
                    <DropdownMenuContent className="w-64 p-3" align="start" sideOffset={6}>
                      <ColorPicker
                        value={colorValue}
                        onChange={(rgba: any) => {
                          const hex = Color.rgb(rgba[0], rgba[1], rgba[2]).hex();
                          update(key as "primaryColor", hex);
                        }}
                      >
                        <ColorPickerSelection className="h-32 rounded-lg" />
                        <ColorPickerHue />
                        <div className="flex items-center gap-2">
                          <ColorPickerFormat className="flex-1" />
                        </div>
                      </ColorPicker>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>
        </div>

        {/* Size and placement */}
        <div className="space-y-4 pt-8">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Size and placement</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium">
              Position
              <select
                name="position"
                value={settings.position}
                onChange={(event) =>
                  update("position", event.currentTarget.value as WidgetSettings["position"])
                }
                className={inputClassName}
              >
                <option value="RIGHT">Bottom right</option>
                <option value="LEFT">Bottom left</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Launcher size
              <select
                name="launcherSize"
                value={settings.launcherSize}
                onChange={(event) =>
                  update(
                    "launcherSize",
                    event.currentTarget.value as WidgetSettings["launcherSize"],
                  )
                }
                className={inputClassName}
              >
                <option value="SMALL">Small</option>
                <option value="MEDIUM">Medium</option>
                <option value="LARGE">Large</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Panel width
              <input
                name="panelWidth"
                type="number"
                min="320"
                max="520"
                value={settings.panelWidth}
                onChange={(event) => update("panelWidth", Number(event.currentTarget.value))}
                className={inputClassName}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Panel height
              <input
                name="panelHeight"
                type="number"
                min="480"
                max="800"
                value={settings.panelHeight}
                onChange={(event) => update("panelHeight", Number(event.currentTarget.value))}
                className={inputClassName}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Corner radius
              <input
                name="borderRadius"
                type="number"
                min="0"
                max="32"
                value={settings.borderRadius}
                onChange={(event) => update("borderRadius", Number(event.currentTarget.value))}
                className={inputClassName}
              />
            </label>
            <label className="flex items-center gap-3 self-end rounded-xl border px-3 py-2.5 text-sm font-medium">
              <input
                name="isEnabled"
                type="checkbox"
                checked={settings.isEnabled}
                onChange={(event) => update("isEnabled", event.currentTarget.checked)}
                className="size-4 accent-primary"
              />
              Widget enabled
            </label>
          </div>
        </div>

        {/* AI behavior */}
        <div className="space-y-4 pt-8">
          <div>
            <h2 className="text-lg font-semibold text-foreground">AI behavior</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium">
              Provider
              <select
                name="modelProvider"
                value={settings.modelProvider}
                onChange={(event) => {
                  const provider = event.currentTarget.value as WidgetModelProvider;
                  setSettings((current) => ({
                    ...current,
                    modelProvider: provider,
                    modelName: widgetModelOptions[provider][0].value,
                  }));
                }}
                className={inputClassName}
              >
                <option value="OPENAI">OpenAI</option>
                <option value="GOOGLE">Gemini</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Model
              <select
                name="modelName"
                value={settings.modelName}
                onChange={(event) => update("modelName", event.currentTarget.value)}
                className={inputClassName}
              >
                {widgetModelOptions[settings.modelProvider].map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium sm:col-span-2">
              Instructions
              <textarea
                name="instructions"
                value={settings.instructions}
                onChange={(event) => update("instructions", event.currentTarget.value)}
                rows={6}
                className="w-full resize-y rounded-xl border bg-background px-3 py-3 text-sm leading-6 outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
              />
            </label>
          </div>
        </div>

        {/* Authorized domains */}
        <div className="space-y-4 pt-8">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Authorized domains</h2>
          </div>
          <div className="space-y-5">
            <textarea
              name="authorizedDomains"
              value={settings.authorizedDomains.join("\n")}
              onChange={(event) =>
                update(
                  "authorizedDomains",
                  event.currentTarget.value.split("\n").map((value) => value.trim()),
                )
              }
              rows={5}
              placeholder={"localhost\nexample.com\n*.example.com"}
              className="w-full resize-y rounded-xl border bg-background px-3 py-3 font-mono text-sm leading-6 outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
            />

            <div>
              <p className="mb-2 text-sm font-medium">Install snippet</p>
              <div className="flex items-center gap-2 rounded-xl border bg-muted/30 p-3">
                <code className="min-w-0 flex-1 overflow-x-auto font-mono text-xs">
                  {installCode}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label="Copy install snippet"
                  onClick={() => {
                    void navigator.clipboard.writeText(installCode);
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1600);
                  }}
                >
                  <HugeiconsIcon icon={copied ? CheckmarkCircle02Icon : Copy01Icon} />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {actionState.error ? (
          <p role="alert" className="text-sm text-destructive pt-4">
            {actionState.error}
          </p>
        ) : null}
        {actionState.savedAt ? (
          <p className="text-sm text-emerald-700 dark:text-emerald-300 pt-4">
            Widget settings saved.
          </p>
        ) : null}
        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={pending}>
            <HugeiconsIcon icon={FloppyDiskIcon} />
            {pending ? "Saving…" : "Save widget"}
          </Button>
        </div>
      </form>

      <aside className="xl:sticky xl:top-6 xl:self-start">
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Live preview</h2>
          </div>
          <div className="flex min-h-[42rem] items-end justify-center overflow-auto rounded-3xl border bg-background/40 p-4">
            <WidgetShell settings={settings} sessionToken={previewSessionToken} />
          </div>
        </div>
      </aside>
    </div>
  );
}
