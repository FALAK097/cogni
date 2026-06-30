import { cn } from "@/lib/utils";

/**
 * Shared layout wrapper for all landing-page sections.
 * Ensures every section has the same max-width, horizontal padding,
 * and vertical rhythm — no abrupt background changes, no misaligned edges.
 */
export function SectionLayout({
  children,
  className,
  innerClassName,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("bg-white py-24 md:py-32", className)}>
      <div className={cn("mx-auto max-w-7xl px-5 sm:px-8 lg:px-12", innerClassName)}>
        {children}
      </div>
    </section>
  );
}

/**
 * Reusable section header for consistent label → heading → subtext hierarchy.
 */
export function SectionHeader({
  label,
  heading,
  sub,
  center = true,
  className,
}: {
  label?: string;
  heading: React.ReactNode;
  sub?: React.ReactNode;
  center?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("mb-14", center ? "mx-auto max-w-2xl text-center" : "max-w-2xl", className)}>
      {label && (
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
          {label}
        </p>
      )}
      <h2 className="text-3xl font-bold tracking-[-0.025em] text-gray-900 sm:text-4xl">
        {heading}
      </h2>
      {sub && (
        <p
          className={cn("mt-4 text-lg leading-relaxed text-gray-500", center && "mx-auto max-w-xl")}
        >
          {sub}
        </p>
      )}
    </div>
  );
}
