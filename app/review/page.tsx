import { ReviewCase } from "@/components/review/review-case";
import { SiteHeader } from "@/components/site-header";

export default function ReviewPage() {
  return (
    <>
      <SiteHeader minimal />
      <main className="page-shell"><ReviewCase /></main>
    </>
  );
}
