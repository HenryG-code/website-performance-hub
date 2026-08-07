"use client";

import * as React from "react";
import {
  Bell,
  Database,
  Info,
  Loader2,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardToolbar } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { PageHeader } from "@/components/shared/page-header";
import { useAppStore } from "@/lib/store/app-store";
import { SimulatedDataPanel } from "@/components/settings/simulated-data-panel";
import { profileSchema } from "@/lib/validation";
import type {
  Device,
  NotificationPreferences,
  Settings,
  SettingsPatch,
  UserProfile,
} from "@/types";

const TIMEZONES = [
  "UTC",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Singapore",
  "Australia/Sydney",
];

const NOTIFICATION_COPY: Record<
  keyof NotificationPreferences,
  { label: string; description: string }
> = {
  auditCompleted: {
    label: "Audit completed",
    description: "Every time a scheduled or manual audit finishes.",
  },
  criticalIssues: {
    label: "Critical issues",
    description: "As soon as a critical severity finding is opened.",
  },
  auditFailed: {
    label: "Audit failures",
    description:
      "When a run cannot complete, so you know the scores on screen are stale.",
  },
  scoreDrops: {
    label: "Score drops",
    description: "When any category falls more than 5 points between runs.",
  },
  weeklyDigest: {
    label: "Weekly digest",
    description: "A Monday summary of scores, trends and outstanding work.",
  },
  productUpdates: {
    label: "Product updates",
    description: "Occasional notes about new PerformanceHub features.",
  },
};

const NOTIFICATION_ORDER = Object.keys(
  NOTIFICATION_COPY,
) as (keyof NotificationPreferences)[];

export default function SettingsPage() {
  const { state, updateSettings } = useAppStore();
  const { toast } = useToast();

  const [profile, setProfile] = React.useState<UserProfile>(state.settings.profile);
  const [profileError, setProfileError] = React.useState<string | null>(null);
  const [savingProfile, setSavingProfile] = React.useState(false);

  // The form edits a local draft. If the stored profile is replaced underneath
  // it — a reset, or a save from another tab — discard the draft and start
  // again from the new value. Adjusting during render (rather than in an
  // effect) avoids rendering a stale form for one frame.
  const [syncedProfile, setSyncedProfile] = React.useState(state.settings.profile);
  if (syncedProfile !== state.settings.profile) {
    setSyncedProfile(state.settings.profile);
    setProfile(state.settings.profile);
    setProfileError(null);
  }

  const dirty =
    JSON.stringify(profile) !== JSON.stringify(state.settings.profile);

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();

    const parsed = profileSchema.safeParse({
      name: profile.name,
      role: profile.role,
      company: profile.company,
      timezone: profile.timezone,
    });

    if (!parsed.success) {
      setProfileError(parsed.error.issues[0]?.message ?? "Check the form.");
      return;
    }

    setProfileError(null);
    setSavingProfile(true);
    const result = await updateSettings({ profile: parsed.data });
    setSavingProfile(false);

    if (!result.ok) {
      setProfileError(result.error);
      return;
    }
    toast({ tone: "success", title: "Profile saved" });
  }

  async function toggleNotification(
    key: keyof NotificationPreferences,
    value: boolean,
  ) {
    const result = await updateSettings({ notifications: { [key]: value } });

    toast(
      result.ok
        ? {
            tone: "info",
            title: `${NOTIFICATION_COPY[key].label} ${value ? "enabled" : "disabled"}`,
          }
        : {
            tone: "warning",
            title: "Couldn't save that preference",
            description: result.error,
          },
    );
  }

  async function updateAuditDefaults(patch: SettingsPatch) {
    const result = await updateSettings(patch);

    toast(
      result.ok
        ? { tone: "success", title: "Audit defaults updated" }
        : {
            tone: "warning",
            title: "Couldn't save that setting",
            description: result.error,
          },
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Preferences for your signed-in workspace, stored securely with your private account."
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          {/* Profile */}
          <Card>
            <form onSubmit={saveProfile}>
              <CardToolbar
                title="Profile"
                description="Used on reports and in the account menu"
                action={<UserRound className="size-4 text-subtle-foreground" />}
              />
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Full name" htmlFor="profile-name" required>
                    <Input
                      id="profile-name"
                      value={profile.name}
                      onChange={(event) =>
                        setProfile({ ...profile, name: event.target.value })
                      }
                      autoComplete="name"
                    />
                  </Field>
                  {/*
                    Email is the account identifier, owned by Supabase Auth.
                    Changing it needs a confirmation round-trip to both the old
                    and new address, so it is read-only until that flow exists.
                  */}
                  <Field
                    label="Email"
                    htmlFor="profile-email"
                    hint="Used to sign in. Contact support to change it."
                  >
                    <Input
                      id="profile-email"
                      type="email"
                      value={profile.email}
                      readOnly
                      disabled
                      autoComplete="email"
                    />
                  </Field>
                  <Field label="Role" htmlFor="profile-role">
                    <Input
                      id="profile-role"
                      value={profile.role}
                      onChange={(event) =>
                        setProfile({ ...profile, role: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="Organisation" htmlFor="profile-company">
                    <Input
                      id="profile-company"
                      value={profile.company}
                      onChange={(event) =>
                        setProfile({ ...profile, company: event.target.value })
                      }
                      autoComplete="organization"
                    />
                  </Field>
                </div>

                <Field
                  label="Timezone"
                  htmlFor="profile-timezone"
                  hint="Report timestamps are rendered in UTC in this build."
                >
                  <Select
                    value={profile.timezone}
                    onValueChange={(value) =>
                      setProfile({ ...profile, timezone: value })
                    }
                  >
                    <SelectTrigger id="profile-timezone" className="sm:w-64">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((zone) => (
                        <SelectItem key={zone} value={zone}>
                          {zone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                {profileError ? (
                  <p className="text-xs text-danger" role="alert">
                    {profileError}
                  </p>
                ) : null}
              </CardContent>
              <CardFooter className="justify-end">
                <Button type="submit" disabled={!dirty || savingProfile}>
                  {savingProfile ? <Loader2 className="animate-spin" /> : <Save />}
                  {savingProfile ? "Saving…" : "Save changes"}
                </Button>
              </CardFooter>
            </form>
          </Card>

          {/* Notifications */}
          <Card id="notifications" className="scroll-mt-24">
            <CardToolbar
              title="Notification preferences"
              description="Choose what PerformanceHub should tell you about"
              action={<Bell className="size-4 text-subtle-foreground" />}
            />
            <CardContent className="divide-y divide-border p-0">
              {NOTIFICATION_ORDER.map((key) => (
                <div
                  key={key}
                  className="flex items-start justify-between gap-4 px-5 py-4"
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm font-medium text-foreground">
                      {NOTIFICATION_COPY[key].label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {NOTIFICATION_COPY[key].description}
                    </p>
                  </div>
                  <Switch
                    checked={state.settings.notifications[key]}
                    onCheckedChange={(value) => toggleNotification(key, value)}
                    aria-label={NOTIFICATION_COPY[key].label}
                  />
                </div>
              ))}
            </CardContent>
            <CardFooter>
              <p className="flex items-start gap-2 text-xs text-subtle-foreground">
                <Info className="mt-px size-3.5 shrink-0" />
                Preferences are saved to your account. Email and Slack delivery
                arrive with the notification service in a later phase.
              </p>
            </CardFooter>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Audit defaults */}
          <Card>
            <CardToolbar
              title="Audit defaults"
              description="Applied to newly added websites"
              action={
                <SlidersHorizontal className="size-4 text-subtle-foreground" />
              }
            />
            <CardContent className="space-y-4">
              <Field label="Audit frequency" htmlFor="audit-frequency">
                <Select
                  value={state.settings.auditFrequency}
                  onValueChange={(value) =>
                    updateAuditDefaults({
                      auditFrequency: value as Settings["auditFrequency"],
                    })
                  }
                >
                  <SelectTrigger id="audit-frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Every hour</SelectItem>
                    <SelectItem value="daily">Once a day</SelectItem>
                    <SelectItem value="weekly">Once a week</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Default device profile" htmlFor="audit-device">
                <Select
                  value={state.settings.defaultDevice}
                  onValueChange={(value) =>
                    updateAuditDefaults({ defaultDevice: value as Device })
                  }
                >
                  <SelectTrigger id="audit-device">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desktop">Desktop</SelectItem>
                    <SelectItem value="mobile">Mobile</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field
                label={`Health alert threshold — ${state.settings.scoreThreshold}`}
                htmlFor="audit-threshold"
                hint="Sites scoring below this are flagged in the dashboard."
              >
                <input
                  id="audit-threshold"
                  type="range"
                  min={40}
                  max={95}
                  step={5}
                  value={state.settings.scoreThreshold}
                  onChange={(event) =>
                    void updateSettings({
                      scoreThreshold: Number(event.target.value),
                    })
                  }
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-border accent-[var(--color-primary)]"
                />
              </Field>
            </CardContent>
          </Card>

          {/* Report branding */}
          <Card>
            <CardToolbar
              title="Report defaults"
              description="Used on the reports you generate"
              action={<Database className="size-4 text-subtle-foreground" />}
            />
            <CardContent className="space-y-4">
              <Field
                label="Report title"
                htmlFor="report-title"
                hint="Heading shown at the top of every report."
              >
                <Input
                  id="report-title"
                  defaultValue={state.settings.reportTitle}
                  onBlur={(event) => {
                    const value = event.target.value.trim();
                    if (value && value !== state.settings.reportTitle) {
                      void updateAuditDefaults({ reportTitle: value });
                    }
                  }}
                />
              </Field>

              <Field
                label="Brand name"
                htmlFor="report-brand"
                hint="Appears as the organisation preparing the report."
              >
                <Input
                  id="report-brand"
                  defaultValue={state.settings.brandName}
                  placeholder="Your agency"
                  onBlur={(event) => {
                    const value = event.target.value.trim();
                    if (value !== state.settings.brandName) {
                      void updateAuditDefaults({ brandName: value });
                    }
                  }}
                />
              </Field>
            </CardContent>
          </Card>

          {/* Workspace data */}
          <Card>
            <CardToolbar
              title="Workspace data"
              description="Where your data lives"
              action={<ShieldCheck className="size-4 text-subtle-foreground" />}
            />
            <CardContent className="space-y-3 text-xs leading-relaxed text-muted-foreground">
              <p>
                Your websites, audits, issues and preferences are stored in
                Postgres and scoped to your account by Row Level Security — no
                other user can read or change them.
              </p>
              <p>
                This workspace currently holds {state.websites.length} website
                {state.websites.length === 1 ? "" : "s"}, {state.audits.length}{" "}
                audit{state.audits.length === 1 ? "" : "s"} and{" "}
                {state.issues.length} finding
                {state.issues.length === 1 ? "" : "s"}.
              </p>
              <p className="text-subtle-foreground">
                Audits are measured by Google PageSpeed Insights.{" "}
                {state.auditsConfigured
                  ? "The API key is configured."
                  : "No API key is configured, so new audits cannot be run."}
              </p>
            </CardContent>
          </Card>

          <SimulatedDataPanel initialCounts={state.simulatedRowCounts} />
        </div>
      </div>
    </div>
  );
}
