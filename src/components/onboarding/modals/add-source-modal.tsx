"use client";

import { File, FileText, MessageCircle, BookOpen } from "@/components/icons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type AddSourceModalProps = {
  open: boolean;
  onClose: () => void;
  onSelectFile: () => void;
};

const SOURCE_OPTIONS = [
  {
    id: "file",
    title: "File",
    description: "Upload documents to train your AI. Extract text from PDFs, DOCX, and TXT files.",
    icon: File,
  },
  {
    id: "text",
    title: "Text",
    description: "Add and process plain text-based sources to train your AI Agent.",
    icon: FileText,
  },
  {
    id: "qa",
    title: "Q&A",
    description: "Craft responses for key questions, ensuring your AI shares relevant info.",
    icon: MessageCircle,
  },
  {
    id: "notion",
    title: "Notion",
    description: "Add and process Notion sources to train your AI Agent with project pages.",
    icon: BookOpen,
  },
];

export function AddSourceModal({ open, onClose, onSelectFile }: AddSourceModalProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Add source</DialogTitle>
          <DialogDescription>
            Choose the type of knowledge source you want to add.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {SOURCE_OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  if (option.id === "file") {
                    onSelectFile();
                  } else {
                    onClose();
                  }
                }}
                className="flex w-full items-start gap-4 rounded-xl border border-border p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted/40"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Icon size={18} className="text-muted-foreground" />
                </span>
                <div>
                  <p className="font-medium text-foreground">{option.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{option.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
