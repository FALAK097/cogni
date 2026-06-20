"use client";
import * as React from "react";
import { Toaster as SonnerToaster, toast as sonnerToast } from "sonner";

const Toaster = SonnerToaster;

const toast = {
  ...sonnerToast,
  success: (message: string, options?: object) => sonnerToast.success(message, options),
  error: (message: string, options?: object) => sonnerToast.error(message, options),
  info: (message: string, options?: object) => sonnerToast.info(message, options),
  warning: (message: string, options?: object) => sonnerToast.warning(message, options),
};

export { toast, Toaster };
