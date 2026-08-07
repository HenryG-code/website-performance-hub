"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { useAppStore } from "@/lib/store/app-store";
import { fieldErrors, websiteInputSchema } from "@/lib/validation";
import { displayUrl } from "@/lib/format";
import type { Environment } from "@/types";

interface FormState {
  name: string;
  url: string;
  team: string;
  environment: Environment;
  tags: string;
}

type Errors = Partial<Record<keyof FormState, string>>;

const EMPTY: FormState = {
  name: "",
  url: "",
  team: "",
  environment: "production",
  tags: "",
};

function toInput(values: FormState) {
  return {
    name: values.name.trim(),
    url: values.url.trim(),
    team: values.team.trim(),
    environment: values.environment,
    tags: values.tags
      .split(",")
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 5),
  };
}

/**
 * Client-side validation mirrors the server schema so mistakes surface before a
 * round-trip. The duplicate check is best-effort here — the authoritative one
 * is the `(owner_id, url)` unique constraint, whose violation the action maps
 * back onto the URL field.
 */
function validate(values: FormState, existingUrls: string[]): Errors {
  const parsed = websiteInputSchema.safeParse(toInput(values));
  const errors: Errors = parsed.success ? {} : fieldErrors(parsed.error);

  if (!errors.url && values.url.trim()) {
    const candidate = displayUrl(values.url.trim()).toLowerCase();
    if (existingUrls.some((url) => displayUrl(url).toLowerCase() === candidate)) {
      errors.url = "That website is already being monitored.";
    }
  }

  return errors;
}

export function AddWebsiteDialog({ trigger }: { trigger?: React.ReactNode }) {
  const { state, addWebsite, runAudit } = useAppStore();
  const { toast } = useToast();
  const router = useRouter();

  const [open, setOpen] = React.useState(false);
  const [values, setValues] = React.useState<FormState>(EMPTY);
  const [errors, setErrors] = React.useState<Errors>({});
  const [touched, setTouched] = React.useState<
    Partial<Record<keyof FormState, boolean>>
  >({});
  const [auditNow, setAuditNow] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);

  const existingUrls = React.useMemo(
    () => state.websites.map((w) => w.url),
    [state.websites],
  );

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    const next = { ...values, [key]: value };
    setValues(next);
    if (touched[key]) setErrors(validate(next, existingUrls));
  }

  function blur(key: keyof FormState) {
    setTouched((prev) => ({ ...prev, [key]: true }));
    setErrors(validate(values, existingUrls));
  }

  function reset() {
    setValues(EMPTY);
    setErrors({});
    setTouched({});
    setAuditNow(true);
    setSubmitting(false);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const nextErrors = validate(values, existingUrls);
    setErrors(nextErrors);
    setTouched({ name: true, url: true, team: true });
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    const result = await addWebsite(toInput(values));

    if (!result.ok) {
      setSubmitting(false);
      if (result.errors) {
        setErrors(result.errors as Errors);
      } else {
        toast({ tone: "warning", title: "Couldn't add website", description: result.error });
      }
      return;
    }

    const id = result.data!.id;
    const name = values.name.trim();

    if (auditNow) void runAudit(id, state.settings.defaultDevice);

    toast({
      tone: "success",
      title: `${name} added`,
      description: auditNow
        ? "A first audit is running now — scores appear in a moment."
        : "Run an audit when you're ready to collect its first scores.",
    });

    setOpen(false);
    reset();
    router.push(`/websites/${id}`);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus />
            Add website
          </Button>
        )}
      </DialogTrigger>

      <DialogContent>
        <form onSubmit={handleSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>Add a website</DialogTitle>
            <DialogDescription>
              PerformanceHub will track its scores, uptime and open findings
              alongside the rest of your portfolio.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <Field
              label="Website name"
              htmlFor="website-name"
              required
              error={touched.name ? errors.name : undefined}
              hint="How it appears in lists and reports."
            >
              <Input
                id="website-name"
                value={values.name}
                onChange={(event) => set("name", event.target.value)}
                onBlur={() => blur("name")}
                placeholder="Acme Storefront"
                aria-invalid={Boolean(touched.name && errors.name)}
                autoComplete="off"
              />
            </Field>

            <Field
              label="URL"
              htmlFor="website-url"
              required
              error={touched.url ? errors.url : undefined}
              hint="https:// is added automatically if you leave it out."
            >
              <Input
                id="website-url"
                value={values.url}
                onChange={(event) => set("url", event.target.value)}
                onBlur={() => blur("url")}
                placeholder="www.acme.com"
                inputMode="url"
                aria-invalid={Boolean(touched.url && errors.url)}
                autoComplete="off"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Owning team"
                htmlFor="website-team"
                error={touched.team ? errors.team : undefined}
                hint="Optional."
              >
                <Input
                  id="website-team"
                  value={values.team}
                  onChange={(event) => set("team", event.target.value)}
                  onBlur={() => blur("team")}
                  placeholder="Marketing"
                  autoComplete="off"
                />
              </Field>

              <Field label="Environment" htmlFor="website-environment">
                <Select
                  value={values.environment}
                  onValueChange={(value) => set("environment", value as Environment)}
                >
                  <SelectTrigger id="website-environment">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="production">Production</SelectItem>
                    <SelectItem value="staging">Staging</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field
              label="Tags"
              htmlFor="website-tags"
              hint="Comma separated, up to five. Used for filtering."
            >
              <Input
                id="website-tags"
                value={values.tags}
                onChange={(event) => set("tags", event.target.value)}
                placeholder="storefront, revenue"
                autoComplete="off"
              />
            </Field>

            <label className="flex items-start gap-3 rounded-lg border border-border bg-surface p-3">
              <Switch
                checked={auditNow}
                onCheckedChange={setAuditNow}
                aria-label="Run a first audit immediately"
              />
              <span className="space-y-0.5">
                <span className="block text-sm font-medium text-foreground">
                  Run a first audit immediately
                </span>
                <span className="block text-xs text-muted-foreground">
                  Otherwise the site is added without scores until you run one.
                </span>
              </span>
            </label>
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="animate-spin" /> : <Plus />}
              {submitting ? "Adding…" : "Add website"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
