import { WidgetCustomizerSkeleton } from "@/components/widget/widget-customizer";

export default function AgentLoading() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <WidgetCustomizerSkeleton />
    </div>
  );
}
