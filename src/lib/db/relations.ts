import { relations } from "drizzle-orm/relations";
import {
  user,
  session,
  account,
  workspace,
  workspaceMember,
  contact,
  contactNote,
  visitorSession,
  conversation,
  conversationQaState,
  conversationQaEvaluation,
  conversationEvent,
  inboxSavedView,
  inboxMacro,
  agentTestCase,
  agentTestRun,
  agentTestImprovement,
  agentTestComparison,
  agentTestPublishCheck,
  ticket,
  widget,
  widgetPublication,
  attachment,
  document,
  documentRevision,
  searchItemCleanup,
  documentChunk,
  workspaceInvite,
  integration,
  notification,
  domainEvent,
  workflowRun,
  workflowStep,
  approvalRequest,
  agentRun,
  integrationAction,
  knowledgeGapReview,
} from "./schema";

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  workspaceMembers: many(workspaceMember),
  contactNotes: many(contactNote),
  notifications: many(notification),
  knowledgeGapReviews: many(knowledgeGapReview),
  widgetPublications: many(widgetPublication),
  decidedApprovals: many(approvalRequest),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const workspaceMemberRelations = relations(workspaceMember, ({ one, many }) => ({
  workspace: one(workspace, {
    fields: [workspaceMember.workspaceId],
    references: [workspace.id],
  }),
  user: one(user, {
    fields: [workspaceMember.userId],
    references: [user.id],
  }),
  conversations: many(conversation),
  assignedTickets: many(ticket, { relationName: "ticketAssignee" }),
  createdTickets: many(ticket, { relationName: "ticketCreator" }),
  inboxSavedViews: many(inboxSavedView),
  inboxMacros: many(inboxMacro),
  agentTestCases: many(agentTestCase),
  agentTestRuns: many(agentTestRun),
  createdImprovements: many(agentTestImprovement, { relationName: "improvementCreator" }),
  reviewedImprovements: many(agentTestImprovement, { relationName: "improvementReviewer" }),
  agentTestComparisons: many(agentTestComparison),
  agentTestPublishChecks: many(agentTestPublishCheck),
}));

export const workspaceRelations = relations(workspace, ({ many }) => ({
  workspaceMembers: many(workspaceMember),
  contacts: many(contact),
  conversations: many(conversation),
  conversationQaStates: many(conversationQaState),
  conversationQaEvaluations: many(conversationQaEvaluation),
  conversationEvents: many(conversationEvent),
  inboxSavedViews: many(inboxSavedView),
  inboxMacros: many(inboxMacro),
  agentTestCases: many(agentTestCase),
  agentTestRuns: many(agentTestRun),
  agentTestImprovements: many(agentTestImprovement),
  agentTestComparisons: many(agentTestComparison),
  agentTestPublishChecks: many(agentTestPublishCheck),
  tickets: many(ticket),
  widgets: many(widget),
  attachments: many(attachment),
  documents: many(document),
  documentRevisions: many(documentRevision),
  searchItemCleanups: many(searchItemCleanup),
  workspaceInvites: many(workspaceInvite),
  integrations: many(integration),
  notifications: many(notification),
  domainEvents: many(domainEvent),
  workflowRuns: many(workflowRun),
  workflowSteps: many(workflowStep),
  approvalRequests: many(approvalRequest),
  agentRuns: many(agentRun),
  integrationActions: many(integrationAction),
  knowledgeGapReviews: many(knowledgeGapReview),
}));

export const knowledgeGapReviewRelations = relations(knowledgeGapReview, ({ one }) => ({
  workspace: one(workspace, {
    fields: [knowledgeGapReview.workspaceId],
    references: [workspace.id],
  }),
  reviewedBy: one(user, {
    fields: [knowledgeGapReview.reviewedByUserId],
    references: [user.id],
  }),
}));

export const contactRelations = relations(contact, ({ one, many }) => ({
  workspace: one(workspace, {
    fields: [contact.workspaceId],
    references: [workspace.id],
  }),
  contactNotes: many(contactNote),
  conversations: many(conversation),
  tickets: many(ticket),
  visitorSessions: many(visitorSession),
  agentRuns: many(agentRun),
}));

export const contactNoteRelations = relations(contactNote, ({ one }) => ({
  user: one(user, {
    fields: [contactNote.authorUserId],
    references: [user.id],
  }),
  contact: one(contact, {
    fields: [contactNote.contactId],
    references: [contact.id],
  }),
}));

export const conversationRelations = relations(conversation, ({ one, many }) => ({
  visitorSession: one(visitorSession, {
    fields: [conversation.visitorSessionId],
    references: [visitorSession.id],
  }),
  widget: one(widget, {
    fields: [conversation.widgetId],
    references: [widget.id],
  }),
  workspaceMember: one(workspaceMember, {
    fields: [conversation.assignedMemberId],
    references: [workspaceMember.id],
  }),
  contact: one(contact, {
    fields: [conversation.contactId],
    references: [contact.id],
  }),
  workspace: one(workspace, {
    fields: [conversation.workspaceId],
    references: [workspace.id],
  }),
  attachments: many(attachment),
  tickets: many(ticket),
  agentRuns: many(agentRun),
  workflowRuns: many(workflowRun),
}));

export const ticketRelations = relations(ticket, ({ one }) => ({
  workspace: one(workspace, { fields: [ticket.workspaceId], references: [workspace.id] }),
  conversation: one(conversation, {
    fields: [ticket.conversationId],
    references: [conversation.id],
  }),
  contact: one(contact, { fields: [ticket.contactId], references: [contact.id] }),
  assignee: one(workspaceMember, {
    fields: [ticket.assignedMemberId],
    references: [workspaceMember.id],
    relationName: "ticketAssignee",
  }),
  createdBy: one(workspaceMember, {
    fields: [ticket.createdByMembershipId],
    references: [workspaceMember.id],
    relationName: "ticketCreator",
  }),
}));

export const visitorSessionRelations = relations(visitorSession, ({ one, many }) => ({
  conversations: many(conversation),
  contact: one(contact, {
    fields: [visitorSession.contactId],
    references: [contact.id],
  }),
  widget: one(widget, {
    fields: [visitorSession.widgetId],
    references: [widget.id],
  }),
  agentRuns: many(agentRun),
}));

export const widgetRelations = relations(widget, ({ one, many }) => ({
  conversations: many(conversation),
  workspace: one(workspace, {
    fields: [widget.workspaceId],
    references: [workspace.id],
  }),
  visitorSessions: many(visitorSession),
  publications: many(widgetPublication),
  agentTestPublishChecks: many(agentTestPublishCheck),
  agentRuns: many(agentRun),
}));

export const widgetPublicationRelations = relations(widgetPublication, ({ one }) => ({
  widget: one(widget, {
    fields: [widgetPublication.widgetId],
    references: [widget.id],
  }),
  createdBy: one(user, {
    fields: [widgetPublication.createdByUserId],
    references: [user.id],
  }),
}));

export const conversationQaStateRelations = relations(conversationQaState, ({ one }) => ({
  workspace: one(workspace, {
    fields: [conversationQaState.workspaceId],
    references: [workspace.id],
  }),
  conversation: one(conversation, {
    fields: [conversationQaState.conversationId],
    references: [conversation.id],
  }),
}));

export const conversationQaEvaluationRelations = relations(conversationQaEvaluation, ({ one }) => ({
  workspace: one(workspace, {
    fields: [conversationQaEvaluation.workspaceId],
    references: [workspace.id],
  }),
  conversation: one(conversation, {
    fields: [conversationQaEvaluation.conversationId],
    references: [conversation.id],
  }),
}));

export const conversationEventRelations = relations(conversationEvent, ({ one }) => ({
  workspace: one(workspace, {
    fields: [conversationEvent.workspaceId],
    references: [workspace.id],
  }),
}));

export const inboxSavedViewRelations = relations(inboxSavedView, ({ one }) => ({
  workspace: one(workspace, {
    fields: [inboxSavedView.workspaceId],
    references: [workspace.id],
  }),
  createdBy: one(workspaceMember, {
    fields: [inboxSavedView.createdByMembershipId],
    references: [workspaceMember.id],
  }),
}));

export const inboxMacroRelations = relations(inboxMacro, ({ one }) => ({
  workspace: one(workspace, {
    fields: [inboxMacro.workspaceId],
    references: [workspace.id],
  }),
  createdBy: one(workspaceMember, {
    fields: [inboxMacro.createdByMembershipId],
    references: [workspaceMember.id],
  }),
}));

export const agentTestCaseRelations = relations(agentTestCase, ({ one }) => ({
  workspace: one(workspace, {
    fields: [agentTestCase.workspaceId],
    references: [workspace.id],
  }),
  createdBy: one(workspaceMember, {
    fields: [agentTestCase.createdByMembershipId],
    references: [workspaceMember.id],
  }),
}));

export const agentTestRunRelations = relations(agentTestRun, ({ one, many }) => ({
  workspace: one(workspace, {
    fields: [agentTestRun.workspaceId],
    references: [workspace.id],
  }),
  createdBy: one(workspaceMember, {
    fields: [agentTestRun.createdByMembershipId],
    references: [workspaceMember.id],
  }),
  improvements: many(agentTestImprovement),
}));

export const agentTestImprovementRelations = relations(agentTestImprovement, ({ one, many }) => ({
  workspace: one(workspace, {
    fields: [agentTestImprovement.workspaceId],
    references: [workspace.id],
  }),
  run: one(agentTestRun, {
    fields: [agentTestImprovement.runId],
    references: [agentTestRun.id],
  }),
  createdBy: one(workspaceMember, {
    fields: [agentTestImprovement.createdByMembershipId],
    references: [workspaceMember.id],
    relationName: "improvementCreator",
  }),
  reviewedBy: one(workspaceMember, {
    fields: [agentTestImprovement.reviewedByMembershipId],
    references: [workspaceMember.id],
    relationName: "improvementReviewer",
  }),
  comparisons: many(agentTestComparison),
}));

export const agentTestComparisonRelations = relations(agentTestComparison, ({ one }) => ({
  workspace: one(workspace, {
    fields: [agentTestComparison.workspaceId],
    references: [workspace.id],
  }),
  improvement: one(agentTestImprovement, {
    fields: [agentTestComparison.improvementId],
    references: [agentTestImprovement.id],
  }),
  createdBy: one(workspaceMember, {
    fields: [agentTestComparison.createdByMembershipId],
    references: [workspaceMember.id],
  }),
}));

export const agentTestPublishCheckRelations = relations(agentTestPublishCheck, ({ one }) => ({
  workspace: one(workspace, {
    fields: [agentTestPublishCheck.workspaceId],
    references: [workspace.id],
  }),
  widget: one(widget, {
    fields: [agentTestPublishCheck.widgetId],
    references: [widget.id],
  }),
  createdBy: one(workspaceMember, {
    fields: [agentTestPublishCheck.createdByMembershipId],
    references: [workspaceMember.id],
  }),
}));

export const attachmentRelations = relations(attachment, ({ one }) => ({
  conversation: one(conversation, {
    fields: [attachment.conversationId],
    references: [conversation.id],
  }),
  workspace: one(workspace, {
    fields: [attachment.workspaceId],
    references: [workspace.id],
  }),
}));

export const documentRelations = relations(document, ({ one, many }) => ({
  workspace: one(workspace, {
    fields: [document.workspaceId],
    references: [workspace.id],
  }),
  documentChunks: many(documentChunk),
}));

export const documentRevisionRelations = relations(documentRevision, ({ one }) => ({
  workspace: one(workspace, {
    fields: [documentRevision.workspaceId],
    references: [workspace.id],
  }),
}));

export const searchItemCleanupRelations = relations(searchItemCleanup, ({ one }) => ({
  workspace: one(workspace, {
    fields: [searchItemCleanup.workspaceId],
    references: [workspace.id],
  }),
}));

export const documentChunkRelations = relations(documentChunk, ({ one }) => ({
  document: one(document, {
    fields: [documentChunk.documentId],
    references: [document.id],
  }),
}));

export const workspaceInviteRelations = relations(workspaceInvite, ({ one }) => ({
  workspace: one(workspace, {
    fields: [workspaceInvite.workspaceId],
    references: [workspace.id],
  }),
}));

export const integrationRelations = relations(integration, ({ one }) => ({
  workspace: one(workspace, {
    fields: [integration.workspaceId],
    references: [workspace.id],
  }),
}));

export const notificationRelations = relations(notification, ({ one }) => ({
  user: one(user, {
    fields: [notification.userId],
    references: [user.id],
  }),
  workspace: one(workspace, {
    fields: [notification.workspaceId],
    references: [workspace.id],
  }),
}));

export const domainEventRelations = relations(domainEvent, ({ one }) => ({
  workspace: one(workspace, {
    fields: [domainEvent.workspaceId],
    references: [workspace.id],
  }),
}));

export const workflowRunRelations = relations(workflowRun, ({ one, many }) => ({
  workspace: one(workspace, {
    fields: [workflowRun.workspaceId],
    references: [workspace.id],
  }),
  conversation: one(conversation, {
    fields: [workflowRun.conversationId],
    references: [conversation.id],
  }),
  steps: many(workflowStep),
  approvalRequests: many(approvalRequest),
}));

export const workflowStepRelations = relations(workflowStep, ({ one }) => ({
  workflowRun: one(workflowRun, {
    fields: [workflowStep.workflowRunId],
    references: [workflowRun.id],
  }),
  workspace: one(workspace, {
    fields: [workflowStep.workspaceId],
    references: [workspace.id],
  }),
}));

export const approvalRequestRelations = relations(approvalRequest, ({ one }) => ({
  workspace: one(workspace, {
    fields: [approvalRequest.workspaceId],
    references: [workspace.id],
  }),
  conversation: one(conversation, {
    fields: [approvalRequest.conversationId],
    references: [conversation.id],
  }),
  workflowRun: one(workflowRun, {
    fields: [approvalRequest.workflowRunId],
    references: [workflowRun.id],
  }),
  workflowStep: one(workflowStep, {
    fields: [approvalRequest.workflowStepId],
    references: [workflowStep.id],
  }),
  requestedByAgentRun: one(agentRun, {
    fields: [approvalRequest.requestedByAgentRunId],
    references: [agentRun.id],
  }),
  decidedBy: one(user, {
    fields: [approvalRequest.decidedByUserId],
    references: [user.id],
  }),
}));

export const agentRunRelations = relations(agentRun, ({ one }) => ({
  workspace: one(workspace, {
    fields: [agentRun.workspaceId],
    references: [workspace.id],
  }),
  widget: one(widget, {
    fields: [agentRun.widgetId],
    references: [widget.id],
  }),
  conversation: one(conversation, {
    fields: [agentRun.conversationId],
    references: [conversation.id],
  }),
  contact: one(contact, {
    fields: [agentRun.contactId],
    references: [contact.id],
  }),
  visitorSession: one(visitorSession, {
    fields: [agentRun.visitorSessionId],
    references: [visitorSession.id],
  }),
}));

export const integrationActionRelations = relations(integrationAction, ({ one }) => ({
  workspace: one(workspace, {
    fields: [integrationAction.workspaceId],
    references: [workspace.id],
  }),
}));
