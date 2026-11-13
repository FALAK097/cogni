"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { queryKeys } from "@/lib/query-keys";
import { useActiveWorkspaceId } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export type BookingSettings = {
  enabled: boolean;
  timezone: string;
  durationMinutes: number;
  bufferMinutes: number;
  minimumNoticeMinutes: number;
  allowedDays?: number[];
  workingHours: { start: string; end: string; weekdays: number[] };
  handoffFallback: string;
  notificationChannel: "INBOX" | "EMAIL" | "SLACK";
};

const DAY_NAMES = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

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
  if (!query.data) {
    return (
      <div
        role="alert"
        className="flex flex-col items-start gap-4 rounded-xl border border-border bg-background p-5 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h2 className="text-sm font-semibold text-foreground">Booking settings unavailable</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            We couldn’t load booking settings. Check your connection and try again.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
        >
          {query.isFetching ? "Trying again…" : "Try again"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {query.isError ? (
        <output className="flex flex-col items-start gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>Couldn’t refresh booking settings. Showing the last loaded settings.</p>
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
    </div>
  );
}

function BookingSettingsSkeleton() {
  return (
    <output
      aria-busy="true"
      aria-label="Loading booking settings"
      className="block space-y-4 rounded-xl border border-border bg-background p-5"
    >
      <div aria-hidden="true" className="space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>
      <div
        aria-hidden="true"
        className="flex h-12 items-center justify-between rounded-lg border border-border p-3"
      >
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-5 w-9 rounded-full" />
      </div>
      <div aria-hidden="true" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
        ))}
      </div>
      <Skeleton aria-hidden="true" className="h-9 w-28 rounded-md" />
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
      void queryClient.invalidateQueries({ queryKey: queryKeys.integrations.bookingSettings() });
    },
  });

  const form = useForm({
    defaultValues: {
      ...initial,
      bufferMinutes: initial.bufferMinutes ?? 15,
      allowedDays: initial.allowedDays ?? initial.workingHours.weekdays ?? [1, 2, 3, 4, 5],
      handoffFallback:
        initial.handoffFallback ||
        "No slots currently available. A team member will follow up with you directly in this chat.",
      notificationChannel: initial.notificationChannel || "INBOX",
    },
    onSubmit: async ({ value }) => {
      const allowed = value.allowedDays ?? value.workingHours.weekdays;
      await mutation.mutateAsync({
        ...value,
        workingHours: {
          ...value.workingHours,
          weekdays: allowed,
        },
      });
    },
  });

  return (
    <form
      className="space-y-5 rounded-xl border border-border bg-background p-4 sm:p-5"
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <div>
        <h2 className="text-sm font-semibold text-foreground">Appointment booking</h2>
        <p className="text-xs text-muted-foreground">
          Offer automated calendar bookings through your widget with team approvals and
          notifications.
        </p>
      </div>

      <form.Field name="enabled">
        {(field) => (
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-3">
            <div className="space-y-0.5">
              <Label htmlFor="booking-enabled" className="text-xs font-medium cursor-pointer">
                Enable booking workflow
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Allows customers to check availability and book meetings inside the chat widget.
              </p>
            </div>
            <Switch
              id="booking-enabled"
              checked={field.state.value}
              onCheckedChange={field.handleChange}
            />
          </div>
        )}
      </form.Field>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <form.Field name="timezone">
          {(field) => (
            <Field
              label="Timezone"
              htmlFor="booking-timezone"
              hint="IANA timezone, e.g. America/New_York or UTC"
            >
              <Input
                id="booking-timezone"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                placeholder="UTC"
                className="h-9 text-xs"
              />
            </Field>
          )}
        </form.Field>

        <form.Field name="durationMinutes">
          {(field) => (
            <Field
              label="Meeting length (min)"
              htmlFor="booking-duration"
              hint="Duration for each appointment"
            >
              <Input
                id="booking-duration"
                type="number"
                min={15}
                max={240}
                value={field.state.value}
                onChange={(event) => field.handleChange(Number(event.target.value))}
                className="h-9 text-xs"
              />
            </Field>
          )}
        </form.Field>

        <form.Field name="bufferMinutes">
          {(field) => (
            <Field
              label="Buffer between meetings (min)"
              htmlFor="booking-buffer"
              hint="Padding between consecutive slots"
            >
              <Input
                id="booking-buffer"
                type="number"
                min={0}
                max={120}
                value={field.state.value}
                onChange={(event) => field.handleChange(Number(event.target.value))}
                className="h-9 text-xs"
              />
            </Field>
          )}
        </form.Field>

        <form.Field name="workingHours.start">
          {(field) => (
            <Field label="Day start time" htmlFor="booking-start" hint="Earliest bookable slot">
              <Input
                id="booking-start"
                type="time"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                className="h-9 text-xs"
              />
            </Field>
          )}
        </form.Field>

        <form.Field name="workingHours.end">
          {(field) => (
            <Field label="Day end time" htmlFor="booking-end" hint="Latest appointment ending time">
              <Input
                id="booking-end"
                type="time"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                className="h-9 text-xs"
              />
            </Field>
          )}
        </form.Field>

        <form.Field name="notificationChannel">
          {(field) => (
            <Field
              label="Notification channel"
              htmlFor="booking-notification-channel"
              hint="Where the team receives alerts"
            >
              <select
                id="booking-notification-channel"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value as "INBOX" | "EMAIL" | "SLACK")}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <option value="INBOX">Inbox (Dashboard)</option>
                <option value="EMAIL">Email</option>
                <option value="SLACK">Slack</option>
              </select>
            </Field>
          )}
        </form.Field>
      </div>

      <form.Field name="allowedDays">
        {(field) => {
          const selected = field.state.value ?? [1, 2, 3, 4, 5];
          const toggleDay = (day: number) => {
            const next = selected.includes(day)
              ? selected.filter((d) => d !== day)
              : [...selected, day].sort();
            if (next.length > 0) {
              field.handleChange(next);
            }
          };

          return (
            <div className="space-y-2">
              <Label className="text-xs font-medium">Allowed days</Label>
              <div className="flex flex-wrap gap-1.5">
                {DAY_NAMES.map((day) => {
                  const active = selected.includes(day.value);
                  return (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleDay(day.value)}
                      className={cn(
                        "h-8 min-w-10 rounded-md border px-2.5 text-xs font-medium transition-colors",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                      )}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Days of the week when appointments can be scheduled.
              </p>
            </div>
          );
        }}
      </form.Field>

      <form.Field name="handoffFallback">
        {(field) => (
          <Field
            label="Handoff fallback message"
            htmlFor="booking-fallback"
            hint="Message shown to customers if no slots are available or booking cannot complete"
          >
            <Textarea
              id="booking-fallback"
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              rows={2}
              className="resize-none text-xs"
            />
          </Field>
        )}
      </form.Field>

      {mutation.isError ? (
        <p className="text-xs text-destructive">{mutation.error.message}</p>
      ) : null}
      {mutation.isSuccess ? (
        <p className="text-xs text-emerald-600 dark:text-emerald-400">Booking settings saved.</p>
      ) : null}

      <div className="pt-2">
        <Button type="submit" size="sm" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving…" : "Save booking settings"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-xs font-medium">
        {label}
      </Label>
      {children}
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
