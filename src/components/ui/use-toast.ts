"use client";
import * as React from "react";
import { Toaster as SonnerToaster, toast as sonnerToast } from "sonner";

export const Toaster = SonnerToaster;

interface ToastOptions {
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: string;
  duration?: number;
}

const toastFn = (
  message: string | { title: string; description?: string; variant?: string },
  options?: ToastOptions,
) => {
  if (typeof message === "object") {
    const obj = message;
    if (obj.variant === "destructive") {
      return sonnerToast.error(obj.title, {
        description: obj.description,
        duration: options?.duration,
      });
    }
    return sonnerToast(obj.title, { description: obj.description, duration: options?.duration });
  }
  if (options?.variant === "destructive") {
    return sonnerToast.error(message, {
      description: options.description as string | undefined,
      duration: options.duration,
    });
  }
  return sonnerToast(message, {
    description: options?.description as string | undefined,
    duration: options?.duration,
  });
};

export const toast = Object.assign(toastFn, {
  success: (message: string, options?: Omit<ToastOptions, "variant">) =>
    sonnerToast.success(message, { description: options?.description as string | undefined }),
  error: (message: string, options?: Omit<ToastOptions, "variant">) =>
    sonnerToast.error(message, { description: options?.description as string | undefined }),
  info: (message: string, options?: Omit<ToastOptions, "variant">) =>
    sonnerToast.info(message, { description: options?.description as string | undefined }),
  warning: (message: string, options?: Omit<ToastOptions, "variant">) =>
    sonnerToast.warning(message, { description: options?.description as string | undefined }),
  promise: <T>(
    promise: () => Promise<T>,
    options: {
      loading: React.ReactNode;
      success: ((data: T) => React.ReactNode) | React.ReactNode;
      error: ((error: unknown) => React.ReactNode) | React.ReactNode;
    },
  ) => sonnerToast.promise(promise, { ...options, description: undefined }),
});

export const useToast = () => {
  return { toasts: [], toast, dismiss: sonnerToast.dismiss };
};

export type ToastProps = {
  id?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>;
