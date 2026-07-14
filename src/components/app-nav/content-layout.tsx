import { cn } from "@/lib/utils";

export function ContentLayout({
  children,
  className,
  scrollable = true,
}: {
  children: React.ReactNode;
  className?: string;
  scrollable?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col",
        scrollable ? "overflow-y-auto" : "overflow-hidden",
      )}
    >
      <div
        className={cn(
          "container sm:px-8 px-4 py-4 bg-card max-w-full min-w-[320px] min-h-full overflow-x-auto print:p-0 print:max-w-full print:overflow-visible print:m-0 print:min-h-0",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
