"use client";

import type { RefObject } from "react";
import { useCallback, useState } from "react";

import { ChevronLeft, Upload } from "@/components/icons";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type AddFileModalProps = {
  open: boolean;
  onClose: () => void;
  onBack: () => void;
  onUpload: (file: File) => Promise<void>;
  fileInputRef: RefObject<HTMLInputElement | null>;
};

export function AddFileModal({ open, onClose, onBack, onUpload, fileInputRef }: AddFileModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return;
      setIsUploading(true);
      try {
        await onUpload(file);
      } finally {
        setIsUploading(false);
      }
    },
    [onUpload],
  );

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg rounded-2xl" showCloseButton>
        <DialogHeader className="flex-row items-center gap-3 space-y-0">
          <button
            type="button"
            onClick={onBack}
            className="flex size-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
          >
            <ChevronLeft className="size-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-gray-100 text-sm">
              📄
            </span>
            <DialogTitle className="text-base font-semibold">Add File</DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2.5 text-sm text-orange-800">
          <span className="mt-0.5">ⓘ</span>
          <span>If you are uploading a PDF, make sure you can select/highlight the text.</span>
        </div>

        <button
          type="button"
          tabIndex={0}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            void handleFiles(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              fileInputRef.current?.click();
            }
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 transition-colors",
            isDragging ? "border-gray-400 bg-gray-50" : "border-gray-200 bg-gray-50/50",
          )}
        >
          <Upload className="mb-3 size-8 text-gray-400" />
          <p className="text-sm font-medium text-gray-600">
            {isUploading ? "Uploading…" : "Drag & drop files here, or click to select files"}
          </p>
          <p className="mt-1 text-xs text-gray-400">Supported file types: pdf, doc, docx, txt</p>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />
      </DialogContent>
    </Dialog>
  );
}
