import { InspectionDetailView } from "./InspectionDetailView";

// No data is fetched here — the view reads the client store — so each id's
// page is rendered once, cached, and reused (no server work per visit).
export function generateStaticParams() {
  return [];
}

export default function Page() {
  return <InspectionDetailView />;
}
