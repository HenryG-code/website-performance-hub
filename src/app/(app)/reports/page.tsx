import type { Metadata } from "next";
import { ReportsView } from "./reports-view";

export const metadata: Metadata = { title: "Reports" };

/**
 * The report is stamped with a generation time. Reading the clock during a
 * client render is impure and would also drift between the server pass and
 * hydration, so the timestamp is decided here, once, on the server.
 */
export default function ReportsPage() {
  return <ReportsView generatedAt={new Date().toISOString()} />;
}
