"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { queryKeys } from "@/lib/query-keys";

type BookingSettings = {
  enabled: boolean;
  timezone: string;
  durationMinutes: number;
  minimumNoticeMinutes: number;
  workingHours: { start: string; end: string; weekdays: number[] };
};

export function BookingSettingsCard() {
  const query = useQuery<{ settings: BookingSettings }>({
    queryKey: queryKeys.integrations.bookingSettings(),
    queryFn: async () => {
      const response = await fetch("/api/dashboard/booking");
      if (!response.ok) throw new Error("Could not load booking settings.");
      return response.json() as Promise<{ settings: BookingSettings }>;
    },
  });
  if (query.isLoading) return <div className="h-48 animate-pulse rounded-2xl border bg-muted/30" />;
  if (!query.data)
    return <p className="text-sm text-destructive">Could not load booking settings.</p>;
  return <BookingForm key={JSON.stringify(query.data.settings)} initial={query.data.settings} />;
}

function BookingForm({ initial }: { initial: BookingSettings }) {
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
