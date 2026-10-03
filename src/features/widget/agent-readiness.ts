export type AgentPublicationReadiness = {
  complete: boolean;
  title: string;
  description: string;
  action: string;
};

export function getAgentPublicationReadiness(input: {
  isEnabled: boolean;
  hasPublishedVersion: boolean;
  hasUnpublishedChanges: boolean;
}): AgentPublicationReadiness {
  if (!input.isEnabled) {
    return {
      complete: false,
      title: "Resume visitor access",
      description: "Your widget is paused, so visitors cannot start or continue conversations.",
      action: "Resume widget",
    };
  }
  if (!input.hasPublishedVersion) {
    return {
      complete: false,
      title: "Publish your agent",
      description: "Preview looks right? Publish an agent version before visitors can use it.",
      action: "Review and publish",
    };
  }
  if (input.hasUnpublishedChanges) {
    return {
      complete: false,
      title: "Publish your changes",
      description: "Saved draft changes are not live until you publish them.",
      action: "Review and publish",
    };
  }
  return {
    complete: true,
    title: "Agent published",
    description: "Your current agent version is published and available to visitors.",
    action: "Review deployment",
  };
}
