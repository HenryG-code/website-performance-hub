"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FlaskConical, Loader2, Trash2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardToolbar } from "@/components/ui/card";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import {
  countSimulatedData,
  deleteSimulatedData,
  type SimulatedDataSummary,
} from "@/app/actions/maintenance";

/**
 * Cleanup path for data left by the retired simulated engine.
 *
 * Deliberately a two-step, typed confirmation. These rows look exactly like
 * real audits in every list, so deleting them is irreversible and easy to
 * regret — the dialog states the count, names any website that would be left
 * with no history at all, and requires the number to be typed back. Website
 * records themselves are never touched.
 */
export function SimulatedDataPanel({
  initialCounts,
}: {
  initialCounts: { audits: number; issues: number };
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [open, setOpen] = React.useState(false);
  const [summary, setSummary] = React.useState<SimulatedDataSummary | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [confirmText, setConfirmText] = React.useState("");

  if (initialCounts.audits === 0 && initialCounts.issues === 0) {
    return null;
  }

  async function review() {
    setLoading(true);
    setConfirmText("");
    const result = await countSimulatedData();
    setLoading(false);

    if (!result.ok) {
      toast({ tone: "warning", title: "Could not check", description: result.error });
      return;
    }

    setSummary(result.data!);
    setOpen(true);
  }

  async function confirmDelete() {
    if (!summary) return;
    setDeleting(true);
    const result = await deleteSimulatedData(summary.audits);
    setDeleting(false);

    if (!result.ok) {
      toast({
        tone: "warning",
        title: "Nothing was deleted",
        description: result.error,
      });
      return;
    }

    setOpen(false);
    toast({
      tone: "success",
      title: "Simulated data removed",
      description: `Deleted ${result.data!.audits} audits and ${result.data!.issues} findings. Your websites were kept.`,
    });
    router.refresh();
  }

  const confirmed =
    summary !== null && confirmText.trim() === String(summary.audits);

  return (
    <>
      <Card className="border-warning/30">
        <CardToolbar
          title="Simulated data"
          description="Left by the retired mock audit engine"
          action={<FlaskConical className="size-4 text-warning" />}
        />
        <CardContent className="space-y-3 text-xs leading-relaxed text-muted-foreground">
          <p>
            This workspace still holds{" "}
            <span className="font-medium text-foreground">
              {initialCounts.audits} generated audit
              {initialCounts.audits === 1 ? "" : "s"}
            </span>{" "}
            and {initialCounts.issues} generated finding
            {initialCounts.issues === 1 ? "" : "s"} from before live PageSpeed
            data. Their scores and metrics were never measured.
          </p>
          <p>
            They are labelled throughout the app, and removing them is safe once
            you have run real audits. Your websites are never deleted.
          </p>
        </CardContent>
        <CardFooter>
          <Button
            variant="outline"
            onClick={review}
            className="w-full"
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin" /> : <Trash2 />}
            {loading ? "Checking…" : "Review and remove"}
          </Button>
        </CardFooter>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Remove simulated data?</DialogTitle>
            <DialogDescription>
              This cannot be undone. Websites and any real PageSpeed audits are
              kept.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <dl className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border bg-surface p-3">
                <dt className="text-xs text-subtle-foreground">
                  Simulated audits
                </dt>
                <dd className="mt-1 font-mono text-2xl font-semibold text-foreground tabular-nums">
                  {summary?.audits ?? 0}
                </dd>
              </div>
              <div className="rounded-lg border border-border bg-surface p-3">
                <dt className="text-xs text-subtle-foreground">
                  Simulated findings
                </dt>
                <dd className="mt-1 font-mono text-2xl font-semibold text-foreground tabular-nums">
                  {summary?.issues ?? 0}
                </dd>
              </div>
            </dl>

            {summary && summary.websitesLeftWithoutHistory.length > 0 ? (
              <div className="flex items-start gap-2.5 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2.5">
                <TriangleAlert className="mt-px size-4 shrink-0 text-warning" />
                <div className="space-y-1 text-xs">
                  <p className="font-medium text-foreground">
                    These sites will be left with no audit history
                  </p>
                  <p className="text-muted-foreground">
                    {summary.websitesLeftWithoutHistory.join(", ")}. Run a real
                    audit on each to restore their scores.
                  </p>
                </div>
              </div>
            ) : null}

            <Field
              label={`Type ${summary?.audits ?? 0} to confirm`}
              htmlFor="confirm-count"
              hint="The exact number of simulated audits shown above."
            >
              <Input
                id="confirm-count"
                value={confirmText}
                onChange={(event) => setConfirmText(event.target.value)}
                inputMode="numeric"
                autoComplete="off"
              />
            </Field>
          </DialogBody>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={confirmDelete}
              disabled={!confirmed || deleting}
            >
              {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
              {deleting ? "Removing…" : "Remove permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
