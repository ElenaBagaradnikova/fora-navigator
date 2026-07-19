import { IntakeWizard } from "@/components/intake/intake-wizard";
import { SiteHeader } from "@/components/site-header";

export default function IntakePage() {
  return (
    <>
      <SiteHeader minimal />
      <main className="page-shell"><IntakeWizard /></main>
    </>
  );
}
