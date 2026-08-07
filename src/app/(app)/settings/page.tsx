"use client";

import * as React from "react";
import {
  Bell,
  Database,
  Info,
  RotateCcw,
  Save,
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
import { STORAGE_KEY } from "@/lib/constants";
import type {
  Device,
  NotificationPreferences,
  Settings,
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
  uptimeIncidents: {
    label: "Uptime incidents",
    description: "When a monitored site starts failing health checks.",
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
  const { state, updateSettings, resetData } = useAppStore();
  const { toast } = useToast();

  const [profile, setProfile] = React.useState<UserProfile>(state.settings.profile);
  const [profileError, setProfileError] = React.useState<string | null>(null);

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

  function saveProfile(event: React.FormEvent) {
    event.preventDefault();

    if (profile.name.trim().length < 2) {
      setProfileError("Enter your name.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim())) {
      setProfileError("Enter a valid email address.");
      return;
    }

    setProfileError(null);
    updateSettings({
      profile: {
        ...profile,
        name: profile.name.trim(),
        email: profile.email.trim(),
      },
    });
    toast({ tone: "success", title: "Profile saved" });
  }

  function toggleNotification(key: keyof NotificationPreferences, value: boolean) {
    updateSettings({ notifications: { [key]: value } });
    toast({
      tone: "info",
      title: `${NOTIFICATION_COPY[key].label} ${value ? "enabled" : "disabled"}`,
    });
  }

  function updateAuditDefaults(patch: Partial<Settings>) {
    updateSettings(patch);
    toast({ tone: "success", title: "Audit defaults updated" });
  }

  function handleReset() {
    resetData();
    toast({
      tone: "success",
      title: "Demo data restored",
      description: "All websites, audits, issues and settings are back to defaults.",
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Preferences for this workspace. Everything here is stored locally in your browser — no account or sign-in required."
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
                  <Field label="Email" htmlFor="profile-email" required>
                    <Input
                      id="profile-email"
                      type="email"
                      value={profile.email}
                      onChange={(event) =>
                        setProfile({ ...profile, email: event.target.value })
                      }
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
                <Button type="submit" disabled={!dirty}>
                  <Save />
                  Save changes
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
                Preferences are saved locally. Email and Slack delivery arrive with
                the notification service in a later phase.
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
                    updateSettings({ scoreThreshold: Number(event.target.value) })
                  }
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-border accent-[var(--color-primary)]"
                />
              </Field>
            </CardContent>
          </Card>

          {/* Data */}
          <Card>
            <CardToolbar
              title="Workspace data"
              description="Where this build keeps your changes"
              action={<Database className="size-4 text-subtle-foreground" />}
            />
            <CardContent className="space-y-3 text-xs leading-relaxed text-muted-foreground">
              <p>
                Websites, audits, issue statuses and these settings are persisted
                to <code className="font-mono text-foreground">localStorage</code>{" "}
                under{" "}
                <code className="font-mono text-foreground">{STORAGE_KEY}</code>.
                Nothing leaves your browser and no credentials are needed.
              </p>
              <p>
                Resetting restores the seeded demo dataset — {state.websites.length}{" "}
                websites, {state.audits.length} audits and {state.issues.length}{" "}
                findings.
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="danger" onClick={handleReset} className="w-full">
                <RotateCcw />
                Reset demo data
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
