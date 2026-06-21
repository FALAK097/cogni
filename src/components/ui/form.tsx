"use client";
import * as React from "react";
import {
  Controller,
  type ControllerProps,
  type FieldValues,
  FormProvider,
  type Path,
  useFormContext,
} from "react-hook-form";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const Form = FormProvider;

type FormFieldContextValue = {
  name: Path<FieldValues>;
};

const FormFieldContext = React.createContext<FormFieldContextValue | null>(null);

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends Path<TFieldValues> = Path<TFieldValues>,
>(
  props: ControllerProps<TFieldValues, TName>,
) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
};

const useFormField = () => {
  const fieldContext = React.use(FormFieldContext);
  const itemContext = React.use(FormItemContext);
  const { getFieldState, formState } = useFormContext();

  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>");
  }
  if (!itemContext) {
    throw new Error("useFormField should be used within <FormItem>");
  }

  const fieldState = getFieldState(fieldContext.name, formState);
  const { id } = itemContext;

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  };
};

type FormItemContextValue = {
  id: string;
};

const FormItemContext = React.createContext<FormItemContextValue | null>(null);

function FormItem({ className, ref, ...props }: React.ComponentPropsWithRef<"div">) {
  const id = React.useId();

  return (
    <FormItemContext.Provider value={{ id }}>
      <div ref={ref} className={cn("space-y-2", className)} {...props} />
    </FormItemContext.Provider>
  );
}

function FormLabel({ className, ref, ...props }: React.ComponentPropsWithRef<typeof Label>) {
  const { error, formItemId } = useFormField();

  return (
    <Label
      ref={ref}
      className={cn(error && "text-destructive", className)}
      htmlFor={formItemId}
      {...props}
    />
  );
}

interface FormControlProps extends React.HTMLAttributes<HTMLElement> {
  render?: React.ReactElement;
}

function FormControl({
  render,
  className,
  ref,
  ...props
}: FormControlProps & { ref?: React.Ref<HTMLElement> }) {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField();

  const childProps = mergeProps<"div">(
    {
      id: formItemId,
      "aria-describedby": !error ? `${formDescriptionId}` : `${formDescriptionId} ${formMessageId}`,
      "aria-invalid": !!error,
    },
    { className },
    props,
  );

  return useRender({
    defaultTagName: "div",
    render,
    props: childProps,
    ref,
  });
}

function FormDescription({ className, ref, ...props }: React.ComponentPropsWithRef<"p">) {
  const { formDescriptionId } = useFormField();

  return (
    <p
      ref={ref}
      id={formDescriptionId}
      className={cn("text-[0.8rem] text-muted-foreground", className)}
      {...props}
    />
  );
}

function FormMessage({ className, children, ref, ...props }: React.ComponentPropsWithRef<"p">) {
  const { error, formMessageId } = useFormField();
  const body = error ? String(error?.message) : children;

  if (!body) {
    return null;
  }

  return (
    <p
      ref={ref}
      id={formMessageId}
      className={cn("text-[0.8rem] font-medium text-destructive", className)}
      {...props}
    >
      {body}
    </p>
  );
}

export {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField,
};
