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
  ticket,
  widget,
  attachment,
  document,
  documentChunk,
  workspaceInvite,
  integration,
  notification,
  domainEvent,
  workflowRun,
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
}));

export const workspaceRelations = relations(workspace, ({ many }) => ({
  workspaceMembers: many(workspaceMember),
  contacts: many(contact),
  conversations: many(conversation),
  tickets: many(ticket),
  widgets: many(widget),
  attachments: many(attachment),
  documents: many(document),
  workspaceInvites: many(workspaceInvite),
  integrations: many(integration),
  notifications: many(notification),
  domainEvents: many(domainEvent),
  workflowRuns: many(workflowRun),
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
  agentRuns: many(agentRun),
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

export const workflowRunRelations = relations(workflowRun, ({ one }) => ({
  workspace: one(workspace, {
    fields: [workflowRun.workspaceId],
    references: [workspace.id],
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
