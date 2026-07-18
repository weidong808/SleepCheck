import { Analytics as VercelAnalytics } from "@vercel/analytics/next";

/** Vercel Web Analytics — privacy-friendly page views. */
export function Analytics() {
  return <VercelAnalytics />;
}
