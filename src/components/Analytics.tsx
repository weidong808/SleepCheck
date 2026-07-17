import { Analytics as VercelAnalytics } from "@vercel/analytics/react";

/** Vercel Analytics — privacy-friendly page views. */
export function Analytics() {
  return <VercelAnalytics />;
}
