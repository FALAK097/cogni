import { cn } from "@/lib/utils";

export function ContentLayout({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div>
      <div
        className={cn(
          "container sm:px-8 px-4 py-4 bg-card max-w-full min-w-0 min-h-[calc(100vh-3.5rem)] overflow-x-hidden print:p-0 print:max-w-full print:overflow-visible print:m-0 print:min-h-0",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
