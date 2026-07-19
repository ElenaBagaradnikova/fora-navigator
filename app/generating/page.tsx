import { GeneratingPlan } from "@/components/generating/generating-plan";
import { SiteHeader } from "@/components/site-header";

export default function GeneratingPage() {
  return (
    <>
      <SiteHeader minimal />
      <main className="page-shell"><GeneratingPlan /></main>
    </>
  );
}
