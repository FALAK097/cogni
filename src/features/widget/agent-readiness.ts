export type AgentReadinessAction = "publish" | "resume" | "domain" | null;

export type AgentPublicationReadiness = {
  complete: boolean;
  title: string;
  description: string;
  action: string | null;
  actionType: AgentReadinessAction;
};

export type ReadinessStepId = "knowledge" | "test" | "publish" | "install";
export type ReadinessStepStatus = "complete" | "in_progress" | "action_required" | "pending";
export type ReadinessActionType = "navigate" | "publish" | "resume" | "domain";

export interface ReadinessStep {
  id: ReadinessStepId;
  title: string;
  description: string;
  status: ReadinessStepStatus;
  actionLabel: string | null;
  actionType: ReadinessActionType | null;
  targetTab: "build" | "test" | "deploy";
}

export interface AgentLaunchChecklist {
  complete: boolean;
  completedCount: number;
  totalCount: number;
  percent: number;
  currentStep: ReadinessStep | null;
  steps: ReadinessStep[];
}

export function getAgentPublicationReadiness(input: {
  isEnabled: boolean;
  hasPublishedVersion: boolean;
  hasUnpublishedChanges: boolean;
  authorizedDomainCount: number;
  isSavingConfiguration: boolean;
}): AgentPublicationReadiness {
  if (input.isSavingConfiguration) {
    return {
      complete: false,
      title: "Saving your changes",
      description: "Your latest settings are being saved. This usually takes a moment.",
      action: null,
      actionType: null,
    };
  }
  if (!input.hasPublishedVersion) {
    return {
      complete: false,
      title: "Publish your agent",
      description: "Publish your agent before installing it on your website.",
      action: "Review and publish",
      actionType: "publish",
    };
  }
  if (input.hasUnpublishedChanges) {
    return {
      complete: false,
      title: "Publish your latest changes",
      description: "Saved draft changes are not included in the published agent yet.",
      action: "Review and publish",
      actionType: "publish",
    };
  }
  if (!input.isEnabled) {
    return {
      complete: false,
      title: "Visitor access is paused",
      description: "Visitors cannot start or continue conversations while the widget is paused.",
      action: "Resume visitor access",
      actionType: "resume",
    };
  }
  if (input.authorizedDomainCount === 0) {
    return {
      complete: false,
      title: "Authorize your website",
      description: "Add at least one authorized domain before installing the widget.",
      action: "Add a domain",
      actionType: "domain",
    };
  }
  return {
    complete: true,
    title: "Ready to install",
    description: "Your published agent can serve visitors from an authorized website.",
    action: null,
    actionType: null,
  };
}

export function getAgentLaunchChecklist(input: {
  readySourcesCount: number;
  processingSourcesCount: number;
  testCasesCount: number;
  hasTestRun: boolean;
  isEnabled: boolean;
  hasPublishedVersion: boolean;
  hasUnpublishedChanges: boolean;
  authorizedDomainCount: number;
  hasObservedSession: boolean;
  isSavingConfiguration: boolean;
}): AgentLaunchChecklist {
  const steps: ReadinessStep[] = [];

  // Step 1: Knowledge Base
  if (input.processingSourcesCount > 0) {
    steps.push({
      id: "knowledge",
      title: "Index knowledge sources",
      description: `${input.processingSourcesCount} source(s) are currently processing. Grounded answers will activate once indexed.`,
      status: "in_progress",
      actionLabel: "View knowledge",
      actionType: "navigate",
      targetTab: "build",
    });
  } else if (input.readySourcesCount > 0) {
    steps.push({
      id: "knowledge",
      title: "Index knowledge sources",
      description: `${input.readySourcesCount} indexed source(s) ready for grounded answers.`,
      status: "complete",
      actionLabel: null,
      actionType: null,
      targetTab: "build",
    });
  } else {
    steps.push({
      id: "knowledge",
      title: "Index knowledge sources",
      description:
        "Add help docs, website pages, or FAQs so your agent can provide grounded answers.",
      status: "action_required",
      actionLabel: "Add knowledge",
      actionType: "navigate",
      targetTab: "build",
    });
  }

  // Step 2: Testing & Evaluation
  if (input.hasTestRun) {
    steps.push({
      id: "test",
      title: "Verify test suite",
      description: `${input.testCasesCount} regression test case(s) verified in preview.`,
      status: "complete",
      actionLabel: null,
      actionType: null,
      targetTab: "test",
    });
  } else if (input.testCasesCount > 0) {
    steps.push({
      id: "test",
      title: "Verify test suite",
      description: `${input.testCasesCount} saved test case(s) ready to run against preview.`,
      status: "action_required",
      actionLabel: "Run tests",
      actionType: "navigate",
      targetTab: "test",
    });
  } else {
    steps.push({
      id: "test",
      title: "Verify test suite",
      description:
        "Create test cases to confirm grounded answers, missing knowledge handling, and handoffs.",
      status: input.readySourcesCount > 0 ? "action_required" : "pending",
      actionLabel: "Add test case",
      actionType: "navigate",
      targetTab: "test",
    });
  }

  // Step 3: Publish Configuration
  if (input.isSavingConfiguration) {
    steps.push({
      id: "publish",
      title: "Publish agent configuration",
      description: "Saving configuration changes...",
      status: "in_progress",
      actionLabel: null,
      actionType: null,
      targetTab: "build",
    });
  } else if (!input.isEnabled) {
    steps.push({
      id: "publish",
      title: "Publish agent configuration",
      description: "Visitor access is paused. Resume access to allow live conversations.",
      status: "action_required",
      actionLabel: "Resume access",
      actionType: "resume",
      targetTab: "deploy",
    });
  } else if (!input.hasPublishedVersion) {
    steps.push({
      id: "publish",
      title: "Publish agent configuration",
      description: "Publish your agent to activate current instructions and knowledge.",
      status: "action_required",
      actionLabel: "Review and publish",
      actionType: "publish",
      targetTab: "build",
    });
  } else if (input.hasUnpublishedChanges) {
    steps.push({
      id: "publish",
      title: "Publish agent configuration",
      description: "Saved draft changes are pending publication.",
      status: "action_required",
      actionLabel: "Publish changes",
      actionType: "publish",
      targetTab: "build",
    });
  } else {
    steps.push({
      id: "publish",
      title: "Publish agent configuration",
      description: "Agent version is published and active.",
      status: "complete",
      actionLabel: null,
      actionType: null,
      targetTab: "deploy",
    });
  }

  // Step 4: Domain & Installation
  if (input.authorizedDomainCount === 0) {
    steps.push({
      id: "install",
      title: "Authorize domain and install",
      description: "Add at least one authorized domain before installing the widget snippet.",
      status: "action_required",
      actionLabel: "Add domain",
      actionType: "domain",
      targetTab: "deploy",
    });
  } else if (!input.hasObservedSession) {
    steps.push({
      id: "install",
      title: "Authorize domain and install",
      description: `Authorized on ${input.authorizedDomainCount} domain(s). Embed the widget snippet to observe first visitor conversation.`,
      status: input.hasPublishedVersion && input.isEnabled ? "action_required" : "pending",
      actionLabel: "Copy embed code",
      actionType: "navigate",
      targetTab: "deploy",
    });
  } else {
    steps.push({
      id: "install",
      title: "Authorize domain and install",
      description: "Widget verified on authorized domain(s) with live visitor activity.",
      status: "complete",
      actionLabel: null,
      actionType: null,
      targetTab: "deploy",
    });
  }

  const completedCount = steps.filter((s) => s.status === "complete").length;
  const totalCount = steps.length;
  const percent = Math.round((completedCount / totalCount) * 100);
  const complete = completedCount === totalCount;
  const currentStep = steps.find((s) => s.status !== "complete") ?? null;

  return {
    complete,
    completedCount,
    totalCount,
    percent,
    currentStep,
    steps,
  };
}
