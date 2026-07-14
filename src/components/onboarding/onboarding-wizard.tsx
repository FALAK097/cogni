"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import {
  OnboardingLayout,
  OnboardingNav,
  SelectionGrid,
  MultiSelectGrid,
} from "@/components/onboarding/onboarding-layout";
import { AddFileModal } from "@/components/onboarding/modals/add-file-modal";
import { AddSourceModal } from "@/components/onboarding/modals/add-source-modal";
import { BookOpen, File, Info, LinkIcon } from "@/components/icons";
import { ThemeLogo } from "@/components/theme-logo";
import { Textarea } from "@/components/ui/textarea";
import {
  addWebsiteSourceAction,
  completeOnboardingAction,
  uploadOnboardingFileAction,
} from "@/features/onboarding/actions";
import {
  AGENT_TYPE_OPTIONS,
  COMPANY_SIZE_OPTIONS,
  DEFAULT_INSTRUCTIONS,
  DEPLOYMENT_OPTIONS,
  PRICING_PLANS,
  REFERRAL_OPTIONS,
  TOOL_OPTIONS,
} from "@/features/onboarding/constants";
import type {
  AgentType,
  CompanySize,
  DeploymentChannel,
  OnboardingData,
  ReferralSource,
} from "@/features/onboarding/types";
import { cn } from "@/lib/utils";

type WizardStep =
  | "hear-about"
  | "company-size"
  | "train-agent"
  | "customize-agent"
  | "tools"
  | "deploy"
  | "analyzing"
  | "setup"
  | "pricing";

const STEP_ORDER: WizardStep[] = [
  "hear-about",
  "company-size",
  "train-agent",
  "customize-agent",
  "tools",
  "deploy",
  "analyzing",
  "setup",
  "pricing",
];

function getProgressStep(step: WizardStep): number {
  const formSteps: WizardStep[] = [
    "hear-about",
    "company-size",
    "train-agent",
    "customize-agent",
    "tools",
    "deploy",
  ];
  const index = formSteps.indexOf(step);
  return index >= 0 ? index + 1 : 7;
}

function getTestimonialIndex(step: WizardStep): number {
  const map: Partial<Record<WizardStep, number>> = {
    "hear-about": 0,
    "company-size": 1,
    "train-agent": 2,
    "customize-agent": 2,
    tools: 3,
    deploy: 4,
  };
  return map[step] ?? 0;
}

type OnboardingWizardProps = {
  workspaceName: string;
  canExitSetup?: boolean;
};

export function OnboardingWizard({ workspaceName, canExitSetup = false }: OnboardingWizardProps) {
  const [step, setStep] = useState<WizardStep>("hear-about");
  const [data, setData] = useState<OnboardingData>({ tools: [], deploymentChannels: [] });
  const [website, setWebsite] = useState("");
  const [agentType, setAgentType] = useState<AgentType>("customer-support");
  const [instructions, setInstructions] = useState(DEFAULT_INSTRUCTIONS["customer-support"]);
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [showFileModal, setShowFileModal] = useState(false);
  const [setupPhase, setSetupPhase] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const agentDisplayName = website
    ? (website
        .replace(/^https?:\/\//, "")
        .replace(/^www\./, "")
        .split(".")[0] ?? workspaceName)
    : workspaceName;

  function goNext() {
    setStep((current) => {
      const currentIndex = STEP_ORDER.indexOf(current);
      if (currentIndex < STEP_ORDER.length - 1) {
        return STEP_ORDER[currentIndex + 1];
      }
      return current;
    });
  }

  const advanceStep = useCallback(() => {
    setStep((current) => {
      const currentIndex = STEP_ORDER.indexOf(current);
      if (currentIndex < STEP_ORDER.length - 1) {
        return STEP_ORDER[currentIndex + 1];
      }
      return current;
    });
  }, []);

  function goBack() {
    const currentIndex = STEP_ORDER.indexOf(step);
    if (currentIndex > 0) {
      setStep(STEP_ORDER[currentIndex - 1]);
    }
  }

  function handleAgentTypeChange(type: AgentType) {
    setAgentType(type);
    setInstructions(DEFAULT_INSTRUCTIONS[type]);
    setData((prev) => ({ ...prev, agentType: type }));
  }

  async function handleTrainContinue() {
    setError(undefined);
    startTransition(async () => {
      if (website.trim()) {
        const formData = new FormData();
        formData.set("website", website);
        const result = await addWebsiteSourceAction({}, formData);
        if (result.error) {
          setError(result.error);
          return;
        }
        setData((prev) => ({ ...prev, website, hasKnowledgeSources: true }));
      }
      goNext();
    });
  }

  async function handleComplete() {
    setError(undefined);
    const finalData: OnboardingData = {
      ...data,
      website: website || data.website,
      instructions,
      agentType,
      hasKnowledgeSources: data.hasKnowledgeSources || Boolean(website),
    };

    startTransition(async () => {
      const formData = new FormData();
      formData.set("data", JSON.stringify(finalData));
      const result = await completeOnboardingAction({}, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      window.location.assign("/backstage");
    });
  }

  async function handleFileUpload(file: File) {
    const formData = new FormData();
    formData.set("file", file);
    const result = await uploadOnboardingFileAction(formData);
    if (result.error) {
      setError(result.error);
      return;
    }
    setData((prev) => ({ ...prev, hasKnowledgeSources: true }));
    setShowFileModal(false);
  }

  useEffect(() => {
    if (step !== "analyzing") return;
    const timer = setTimeout(() => advanceStep(), 3000);
    return () => clearTimeout(timer);
  }, [step, advanceStep]);

  useEffect(() => {
    if (step !== "setup") {
      setSetupPhase(0);
      return;
    }
    if (setupPhase >= 3) {
      const timer = setTimeout(() => advanceStep(), 800);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setSetupPhase((p) => p + 1), 1200);
    return () => clearTimeout(timer);
  }, [step, setupPhase, advanceStep]);

  const progressStep = getProgressStep(step);
  const isFormStep = [
    "hear-about",
    "company-size",
    "train-agent",
    "customize-agent",
    "tools",
    "deploy",
  ].includes(step);

  if (step === "analyzing") {
    return (
      <OnboardingLayout
        variant="centered"
        currentStep={7}
        showTestimonial={false}
        canExitSetup={canExitSetup}
      >
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="mb-6 flex size-14 items-center justify-center rounded-xl bg-card shadow-sm">
            <ThemeLogo className="size-10" />
          </div>
          <h1 className="max-w-lg text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Widget will help you build a customer experience agent for{" "}
            <span className="inline-flex items-center gap-1">
              <span className="inline-block size-3 rounded-sm bg-primary" />
              {agentDisplayName.charAt(0).toUpperCase() + agentDisplayName.slice(1)}
            </span>
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">Analyzing your site…</p>
        </div>
      </OnboardingLayout>
    );
  }

  if (step === "setup") {
    const cards = [
      { title: "Training knowledge base", desc: "Processing your content sources" },
      { title: "Configuring agent", desc: "Setting up personality and instructions" },
      { title: "Preparing deployment", desc: "Getting your channels ready" },
    ];

    return (
      <OnboardingLayout
        variant="full"
        currentStep={7}
        showTestimonial={false}
        canExitSetup={canExitSetup}
      >
        <div className="flex flex-1 flex-col items-center justify-center px-6">
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            We are creating your agent
          </h1>
          <div className="mt-12 flex w-full max-w-md flex-col gap-3">
            {cards.map((card, index) => (
              <div
                key={card.title}
                className={cn(
                  "rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-700",
                  index < setupPhase ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
                  index < setupPhase - 1 && "blur-[2px] opacity-40",
                )}
              >
                <p className="font-semibold text-foreground">{card.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{card.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-block size-4 animate-spin rounded-full border-2 border-border border-t-primary" />
            Initializing…
          </div>
        </div>
      </OnboardingLayout>
    );
  }

  if (step === "pricing") {
    return (
      <div className="min-h-svh bg-muted/30">
        <header className="flex items-center justify-between border-b border-border bg-background px-6 py-4 sm:px-10">
          <div className="flex items-center gap-2.5">
            <ThemeLogo className="size-8" />
            <span className="text-[15px] font-semibold text-foreground">widget</span>
          </div>
          <button
            type="button"
            onClick={handleComplete}
            disabled={isPending}
            className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            {isPending ? "Setting up…" : "Continue for free"}
          </button>
        </header>

        <div className="mx-auto max-w-6xl px-6 py-10 sm:px-10">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <h1 className="text-3xl font-bold text-foreground">Choose your plan</h1>
            <div className="flex items-center gap-2 text-sm">
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                Yearly
              </span>
              <span className="rounded bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                20% off
              </span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PRICING_PLANS.map((plan) => (
              <div
                key={plan.id}
                className={cn(
                  "relative flex flex-col rounded-xl border border-border bg-card p-6 border-t-4",
                  plan.borderColor,
                )}
              >
                {plan.popular ? (
                  <span className="absolute -top-3 right-4 rounded-full bg-primary px-3 py-0.5 text-xs font-medium text-primary-foreground">
                    Popular
                  </span>
                ) : null}
                <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
                {plan.price !== null ? (
                  <p className="mt-2 text-2xl font-bold text-foreground">
                    ${plan.price}
                    <span className="text-sm font-normal text-muted-foreground">
                      {" "}
                      /m billed yearly
                    </span>
                  </p>
                ) : (
                  <p className="mt-2 text-2xl font-bold text-foreground">Let&apos;s talk</p>
                )}
                {plan.savings ? (
                  <span className="mt-2 inline-block w-fit rounded bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                    {plan.savings}
                  </span>
                ) : null}
                {plan.credits ? (
                  <p className="mt-3 text-sm text-muted-foreground">{plan.credits}</p>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Power at your pace with custom solutions.
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleComplete}
                  disabled={isPending}
                  className={cn(
                    "mt-5 w-full rounded-lg py-2.5 text-sm font-medium transition-colors",
                    plan.popular
                      ? "bg-primary text-primary-foreground hover:opacity-90"
                      : "border border-border bg-background text-foreground hover:bg-muted",
                  )}
                >
                  {plan.id === "enterprise" ? "Contact us" : "Subscribe"}
                </button>
                <ul className="mt-5 flex-1 space-y-2 border-t border-border pt-5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="text-sm text-muted-foreground">
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {error ? <p className="mt-4 text-center text-sm text-red-600">{error}</p> : null}
        </div>
      </div>
    );
  }

  return (
    <>
      <OnboardingLayout
        currentStep={progressStep}
        testimonialIndex={getTestimonialIndex(step)}
        showTestimonial={isFormStep}
        variant="split"
        canExitSetup={canExitSetup}
      >
        {step === "hear-about" && (
          <>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              How did you hear about us?
            </h1>
            <div className="mt-6">
              <SelectionGrid
                options={REFERRAL_OPTIONS}
                value={data.referralSource}
                onChange={(value) =>
                  setData((prev) => ({ ...prev, referralSource: value as ReferralSource }))
                }
                columns={3}
              />
            </div>
            <OnboardingNav
              onContinue={goNext}
              continueDisabled={!data.referralSource}
              showBack={false}
            />
          </>
        )}

        {step === "company-size" && (
          <>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              What&apos;s your company size?
            </h1>
            <div className="mt-6">
              <SelectionGrid
                options={COMPANY_SIZE_OPTIONS}
                value={data.companySize}
                onChange={(value) =>
                  setData((prev) => ({ ...prev, companySize: value as CompanySize }))
                }
                columns={2}
              />
            </div>
            <OnboardingNav
              onBack={goBack}
              onContinue={goNext}
              continueDisabled={!data.companySize}
            />
          </>
        )}

        {step === "train-agent" && (
          <>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              How would you like to train your AI Agent?
            </h1>
            <div className="mt-6 space-y-5">
              <div>
                <p className="text-sm text-gray-500">Your website (recommended)</p>
                <div className="mt-1.5 flex overflow-hidden rounded-lg border border-gray-200">
                  <span className="flex items-center border-r border-gray-200 bg-gray-50 px-3 text-sm text-gray-500">
                    https://
                  </span>
                  <input
                    id="onboarding-website"
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="www.example.com"
                    className="flex-1 px-3 py-2.5 text-sm outline-none"
                  />
                </div>
                <div className="mt-2 flex items-start gap-2 rounded-lg bg-gray-50 px-3 py-2.5 text-xs text-gray-500">
                  <Info className="mt-0.5 size-3.5 shrink-0" />
                  We&apos;ll extract info from all pages in this domain to train your AI Agent.
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500">Other sources</p>
                <button
                  type="button"
                  onClick={() => setShowSourceModal(true)}
                  className="mt-1.5 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/50"
                >
                  <File className="size-4" />
                  <LinkIcon className="size-4" />
                  <BookOpen className="size-4" />
                  <span>Add Notion, Files, Text and more</span>
                </button>
              </div>
            </div>
            {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
            <OnboardingNav onBack={goBack} onContinue={handleTrainContinue} isPending={isPending} />
          </>
        )}

        {step === "customize-agent" && (
          <>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Customize your agent&apos;s personality
            </h1>
            <div className="mt-6 space-y-4">
              <div>
                <label htmlFor="onboarding-instructions" className="text-sm text-gray-500">
                  What will your agent do?
                </label>
                <Textarea
                  id="onboarding-instructions"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={4}
                  className="mt-1.5 resize-none rounded-lg border-gray-200 text-sm"
                />
              </div>
              <div>
                <p className="text-sm text-gray-500">Agent type</p>
                <div className="mt-1.5 space-y-1">
                  {AGENT_TYPE_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleAgentTypeChange(option.value)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all",
                          agentType === option.value
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/40",
                        )}
                      >
                        <Icon
                          size={18}
                          className={cn(
                            "shrink-0",
                            agentType === option.value ? "text-primary" : "text-muted-foreground",
                          )}
                        />
                        <span className="text-sm font-medium text-foreground">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <OnboardingNav
              onBack={goBack}
              onContinue={goNext}
              continueDisabled={!instructions.trim()}
            />
          </>
        )}

        {step === "tools" && (
          <>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Select the tools in your tech stack
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              We&apos;ll note it down and walk you through how to integrate them later.
            </p>
            <div className="mt-6 space-y-5">
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                  Actions
                </p>
                <MultiSelectGrid
                  options={TOOL_OPTIONS.actions}
                  values={data.tools ?? []}
                  onChange={(tools) => setData((prev) => ({ ...prev, tools }))}
                />
              </div>
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                  Helpdesk tools
                </p>
                <MultiSelectGrid
                  options={TOOL_OPTIONS.helpdesk}
                  values={data.tools ?? []}
                  onChange={(tools) => setData((prev) => ({ ...prev, tools }))}
                />
              </div>
            </div>
            <OnboardingNav onBack={goBack} onContinue={goNext} continueLabel="Continue" />
          </>
        )}

        {step === "deploy" && (
          <>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Where will you be deploying your AI agents?
            </h1>
            <div className="mt-6">
              <MultiSelectGrid
                options={DEPLOYMENT_OPTIONS}
                values={data.deploymentChannels ?? []}
                onChange={(channels) =>
                  setData((prev) => ({
                    ...prev,
                    deploymentChannels: channels as DeploymentChannel[],
                  }))
                }
              />
            </div>
            <OnboardingNav onBack={goBack} onContinue={goNext} />
          </>
        )}
      </OnboardingLayout>

      <AddSourceModal
        open={showSourceModal}
        onClose={() => setShowSourceModal(false)}
        onSelectFile={() => {
          setShowSourceModal(false);
          setShowFileModal(true);
        }}
      />

      <AddFileModal
        open={showFileModal}
        onClose={() => setShowFileModal(false)}
        onBack={() => {
          setShowFileModal(false);
          setShowSourceModal(true);
        }}
        onUpload={handleFileUpload}
        fileInputRef={fileInputRef}
      />
    </>
  );
}
