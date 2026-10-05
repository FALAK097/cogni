"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { queryKeys } from "@/lib/query-keys";
import { useActiveWorkspaceId } from "@/hooks/use-auth";

type BookingSettings = {
  enabled: boolean;
  timezone: string;
  durationMinutes: number;
  minimumNoticeMinutes: number;
  workingHours: { start: string; end: string; weekdays: number[] };
};

export function BookingSettingsCard() {
  const workspaceId = useActiveWorkspaceId();
  const query = useQuery<{ settings: BookingSettings }>({
    queryKey: queryKeys.integrations.bookingSettings(),
    queryFn: async () => {
      const response = await fetch("/api/dashboard/booking");
      if (!response.ok) throw new Error("Could not load booking settings.");
      return response.json() as Promise<{ settings: BookingSettings }>;
    },
  });
  if (query.isLoading) return <BookingSettingsSkeleton />;
  if (!query.data)
    return (
      <div
        role="alert"
        className="flex flex-col items-start gap-4 rounded-2xl border border-border/70 bg-card p-5 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h2 className="font-semibold">Booking settings unavailable</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            We couldn’t load booking settings. Check your connection and try again.
          </p>
        </div>
        <Button variant="outline" onClick={() => void query.refetch()} disabled={query.isFetching}>
          {query.isFetching ? "Trying again…" : "Try again"}
        </Button>
      </div>
    );
  return (
    <>
      {query.isError ? (
        <output className="mb-4 flex flex-col items-start gap-3 rounded-xl border border-border/70 bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Couldn’t refresh booking settings. Showing the last loaded settings.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
          >
            {query.isFetching ? "Trying again…" : "Try again"}
          </Button>
        </output>
      ) : null}
      <BookingForm
        key={JSON.stringify(query.data.settings)}
        initial={query.data.settings}
        workspaceId={workspaceId}
      />
    </>
  );
}

function BookingSettingsSkeleton() {
  return (
    <output
      aria-busy="true"
      aria-label="Loading booking settings"
      className="block space-y-5 rounded-2xl border border-border/60 bg-card p-5"
    >
      <div aria-hidden="true" className="space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>
      <div
        aria-hidden="true"
        className="flex h-12 items-center justify-between rounded-xl border p-3"
      >
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-5 w-9 rounded-full" />
      </div>
      <div aria-hidden="true" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>
      <Skeleton aria-hidden="true" className="h-9 w-24 rounded-lg" />
    </output>
  );
}

function BookingForm({
  initial,
  workspaceId,
}: {
  initial: BookingSettings;
  workspaceId: string | null;
}) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (settings: BookingSettings) => {
      const response = await fetch("/api/dashboard/booking", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Could not save booking settings.");
      return body;
    },
    onSuccess: () => {
      if (workspaceId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.widget.config(workspaceId) });
      }
    },
  });
  const form = useForm({
    defaultValues: initial,
    onSubmit: async ({ value }) => mutation.mutateAsync(value),
  });

  return (
    <form
      className="space-y-5 rounded-2xl border bg-card p-5"
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <div>
        <h2 className="font-semibold">Appointment booking</h2>
        <p className="text-sm text-muted-foreground">
          Offer approved calendar bookings inside widget.
        </p>
      </div>
      <form.Field name="enabled">
        {(field) => (
          <div className="flex items-center justify-between rounded-xl border p-3">
            <Label htmlFor="booking-enabled">Enable booking workflow</Label>
            <Switch
              id="booking-enabled"
              checked={field.state.value}
              onCheckedChange={field.handleChange}
            />
          </div>
        )}
      </form.Field>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <form.Field name="timezone">
          {(field) => (
            <Field label="Timezone" htmlFor="booking-timezone">
              <Input
                id="booking-timezone"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                placeholder="Asia/Kolkata"
              />
            </Field>
          )}
        </form.Field>
        <form.Field name="durationMinutes">
          {(field) => (
            <Field label="Duration (minutes)" htmlFor="booking-duration">
              <Input
                id="booking-duration"
                type="number"
                min={15}
                max={240}
                value={field.state.value}
                onChange={(event) => field.handleChange(Number(event.target.value))}
              />
            </Field>
          )}
        </form.Field>
        <form.Field name="workingHours.start">
          {(field) => (
            <Field label="Start" htmlFor="booking-start">
              <Input
                id="booking-start"
                type="time"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
              />
            </Field>
          )}
        </form.Field>
        <form.Field name="workingHours.end">
          {(field) => (
            <Field label="End" htmlFor="booking-end">
              <Input
                id="booking-end"
                type="time"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
              />
            </Field>
          )}
        </form.Field>
      </div>
      {mutation.isError ? (
        <p className="text-sm text-destructive">{mutation.error.message}</p>
      ) : null}
      {mutation.isSuccess ? (
        <p className="text-sm text-emerald-600">Booking settings saved.</p>
      ) : null}
      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? "Saving…" : "Save booking settings"}
      </Button>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
