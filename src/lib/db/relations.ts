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
  widget,
  lead,
  widgetLeadCapture,
  attachment,
  document,
  documentChunk,
  workspaceInvite,
  integration,
  notification,
  domainEvent,
  workflowRun,
  integrationAction,
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
  widgets: many(widget),
  leads: many(lead),
  attachments: many(attachment),
  documents: many(document),
  workspaceInvites: many(workspaceInvite),
  integrations: many(integration),
  notifications: many(notification),
  domainEvents: many(domainEvent),
  workflowRuns: many(workflowRun),
  integrationActions: many(integrationAction),
}));

export const contactRelations = relations(contact, ({ one, many }) => ({
  workspace: one(workspace, {
    fields: [contact.workspaceId],
    references: [workspace.id],
  }),
  contactNotes: many(contactNote),
  conversations: many(conversation),
  visitorSessions: many(visitorSession),
  leads: many(lead),
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
  widgetLeadCaptures: many(widgetLeadCapture),
}));

export const widgetRelations = relations(widget, ({ one, many }) => ({
  conversations: many(conversation),
  workspace: one(workspace, {
    fields: [widget.workspaceId],
    references: [workspace.id],
  }),
  visitorSessions: many(visitorSession),
}));

export const leadRelations = relations(lead, ({ one, many }) => ({
  contact: one(contact, {
    fields: [lead.contactId],
    references: [contact.id],
  }),
  workspace: one(workspace, {
    fields: [lead.workspaceId],
    references: [workspace.id],
  }),
  widgetLeadCaptures: many(widgetLeadCapture),
}));

export const widgetLeadCaptureRelations = relations(widgetLeadCapture, ({ one }) => ({
  lead: one(lead, {
    fields: [widgetLeadCapture.leadId],
    references: [lead.id],
  }),
  visitorSession: one(visitorSession, {
    fields: [widgetLeadCapture.visitorSessionId],
    references: [visitorSession.id],
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

export const integrationActionRelations = relations(integrationAction, ({ one }) => ({
  workspace: one(workspace, {
    fields: [integrationAction.workspaceId],
    references: [workspace.id],
  }),
}));
