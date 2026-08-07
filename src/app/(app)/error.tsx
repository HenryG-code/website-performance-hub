"use client";

import { useEffect } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Phase 1 has no error reporting service; the console is the sink.
    console.error(error);
  }, [error]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
        Something went wrong
      </h1>
      <Card>
        <EmptyState
          icon={TriangleAlert}
          title="This page failed to render"
          description={
            error.message ||
            "An unexpected error occurred. Retrying usually clears it."
          }
          action={
            <Button onClick={reset}>
              <RefreshCw />
              Try again
            </Button>
          }
        />
      </Card>
    </div>
  );
}
