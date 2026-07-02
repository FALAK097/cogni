"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import type { Hugeicon } from "@/components/icons";
import { ChevronLeft } from "@/components/icons";
import { OnboardingOptionIcon } from "@/components/onboarding/onboarding-option-icon";
import { OnboardingTestimonial } from "@/components/onboarding/onboarding-testimonial";
import { ThemeLogo } from "@/components/theme-logo";
import { cancelAgentSetupAction } from "@/features/onboarding/actions";
import { ONBOARDING_STEP_COUNT } from "@/features/onboarding/constants";
import { cn } from "@/lib/utils";

type OnboardingLayoutProps = {
  children: ReactNode;
  currentStep: number;
  showTestimonial?: boolean;
  testimonialIndex?: number;
  variant?: "split" | "centered" | "full";
  canExitSetup?: boolean;
};

function OnboardingExitButton() {
  return (
    <form action={cancelAgentSetupAction}>
      <button
        type="submit"
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
      >
        <ChevronLeft className="size-4" />
        Back to app
      </button>
    </form>
  );
}

function ProgressDiamonds({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: ONBOARDING_STEP_COUNT }).map((_, index) => (
        <span
          key={index}
          className={cn(
            "size-2 rotate-45 rounded-[1px] transition-colors duration-300",
            index < currentStep ? "bg-primary" : "border border-border bg-transparent",
          )}
        />
      ))}
    </div>
  );
}

export function OnboardingLayout({
  children,
  currentStep,
  showTestimonial = true,
  testimonialIndex = 0,
  variant = "split",
  canExitSetup = false,
}: OnboardingLayoutProps) {
  if (variant === "centered" || variant === "full") {
    return (
      <div className="flex min-h-svh flex-col bg-muted/30">
        {(variant === "centered" || canExitSetup) && (
          <header className="flex items-center justify-between px-6 py-5 sm:px-10">
            {canExitSetup ? (
              <OnboardingExitButton />
            ) : (
              <Link href="/" className="flex items-center gap-2.5">
                <ThemeLogo className="size-8" />
                <span className="text-[15px] font-semibold tracking-tight text-foreground">
                  widget
                </span>
              </Link>
            )}
          </header>
        )}
        <div className="flex flex-1 flex-col">{children}</div>
      </div>
    );
  }

  return (
    <div className="grid min-h-svh bg-background lg:grid-cols-2">
      <div className="flex min-h-svh flex-col px-6 py-6 sm:px-10 lg:px-14 lg:py-8">
        <header className="flex shrink-0 items-center justify-between gap-3">
          {canExitSetup ? (
            <OnboardingExitButton />
          ) : (
            <Link href="/" className="flex items-center gap-2.5">
              <ThemeLogo className="size-8" />
              <span className="text-[15px] font-semibold tracking-tight text-foreground">
                widget
              </span>
            </Link>
          )}
          <ProgressDiamonds currentStep={currentStep} />
        </header>

        <div className="flex flex-1 flex-col justify-center py-8">
          <div className="mx-auto w-full max-w-lg">{children}</div>
        </div>

        <footer className="flex shrink-0 items-center justify-between pt-4 text-xs text-muted-foreground">
          <span>&copy; {new Date().getFullYear()} Widget Inc.</span>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <Link href="/privacy-policy" className="hover:text-foreground">
              Privacy
            </Link>
          </div>
        </footer>
      </div>

      {showTestimonial ? (
        <div className="relative hidden overflow-hidden bg-primary lg:flex lg:flex-col lg:justify-center">
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "linear-gradient(135deg, transparent 48%, rgba(255,255,255,0.15) 49%, rgba(255,255,255,0.15) 51%, transparent 52%)",
              backgroundSize: "60px 60px",
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, transparent, transparent 59px, rgba(255,255,255,0.3) 59px, rgba(255,255,255,0.3) 60px), repeating-linear-gradient(90deg, transparent, transparent 59px, rgba(255,255,255,0.3) 59px, rgba(255,255,255,0.3) 60px)",
            }}
          />
          <OnboardingTestimonial index={testimonialIndex} />
        </div>
      ) : null}
    </div>
  );
}

export function OnboardingNav({
  onBack,
  onContinue,
  continueLabel = "Continue",
  continueDisabled = false,
  showBack = true,
  isPending = false,
}: {
  onBack?: () => void;
  onContinue?: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
  showBack?: boolean;
  isPending?: boolean;
}) {
  return (
    <div className="mt-8 flex items-center gap-3">
      {showBack && onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="h-11 shrink-0 rounded-lg border border-border bg-background px-5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          Back
        </button>
      ) : null}
      <button
        type="button"
        onClick={onContinue}
        disabled={continueDisabled || isPending}
        className={cn(
          "h-11 flex-1 rounded-lg text-sm font-medium text-primary-foreground transition-all",
          continueDisabled || isPending
            ? "cursor-not-allowed bg-muted-foreground/40"
            : "bg-primary hover:opacity-90",
        )}
      >
        {isPending ? "Saving…" : continueLabel}
      </button>
    </div>
  );
}

type IconOption = {
  value: string;
  label: string;
  icon?: Hugeicon;
  logo?: string;
};

export function SelectionGrid({
  options,
  value,
  onChange,
  columns = 3,
}: {
  options: IconOption[];
  value?: string;
  onChange: (value: string) => void;
  columns?: 2 | 3 | 4;
}) {
  return (
    <div
      className={cn(
        "grid gap-2.5",
        columns === 2 && "grid-cols-2",
        columns === 3 && "grid-cols-2 sm:grid-cols-3",
        columns === 4 && "grid-cols-2 sm:grid-cols-4",
      )}
    >
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "flex items-center gap-2.5 rounded-lg border px-3 py-3 text-left text-sm font-medium transition-all",
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-foreground hover:border-primary/40",
            )}
          >
            <OnboardingOptionIcon
              label={option.label}
              logo={option.logo}
              icon={option.icon}
              selected={selected}
              size={20}
            />
            <span className="min-w-0 leading-tight">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function MultiSelectGrid({
  options,
  values,
  onChange,
}: {
  options: IconOption[];
  values: string[];
  onChange: (values: string[]) => void;
}) {
  function toggle(value: string) {
    if (values.includes(value)) {
      onChange(values.filter((v) => v !== value));
    } else {
      onChange([...values, value]);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = values.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => toggle(option.value)}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all",
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-foreground hover:border-primary/40",
            )}
          >
            <OnboardingOptionIcon
              label={option.label}
              logo={option.logo}
              icon={option.icon}
              size={18}
              selected={selected}
            />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
