import Link from "next/link";
import { Compass, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";

export default function NotFound() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
        Page not found
      </h1>
      <Card>
        <EmptyState
          icon={Compass}
          title="That page doesn't exist"
          description="The link may be out of date, or the record it pointed at has been removed from this workspace."
          action={
            <Button asChild>
              <Link href="/">
                <LayoutDashboard />
                Back to dashboard
              </Link>
            </Button>
          }
        />
      </Card>
    </div>
  );
}
