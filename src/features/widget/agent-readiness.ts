export type AgentReadinessAction = "publish" | "resume" | "domain" | null;

export type AgentPublicationReadiness = {
  complete: boolean;
  title: string;
  description: string;
  action: string | null;
  actionType: AgentReadinessAction;
};

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
