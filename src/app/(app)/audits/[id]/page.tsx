import { getUser } from "@/lib/supabase/server";
import { getAuditRawResponse } from "@/lib/data/workspace";
import { mapPassedChecks } from "@/lib/pagespeed/map";
import type { PsiResponse } from "@/lib/pagespeed/types";
import { AuditDetailView } from "./audit-detail-view";

/**
 * Audit detail.
 *
 * A server component so the verbatim provider response can be read for this one
 * run without shipping it — or every other run's copy — to the browser. The
 * passed-check list is derived from that stored response, so it reflects what
 * Lighthouse actually verified rather than a fixed list.
 */
export default async function AuditDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // RLS scopes this to the caller; a stranger's audit id simply returns null.
  const user = await getUser();
  const raw = user ? await getAuditRawResponse(id) : null;

  const passedChecks = raw
    ? mapPassedChecks(raw as PsiResponse).slice(0, 40)
    : [];

  return <AuditDetailView auditId={id} passedChecks={passedChecks} />;
}
