// app/(dashboard)/inventory/[locationId]/page.tsx

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LocationStockPage from "@/components/LocationStockPage";

// ── Static location metadata ──────────────────────────────────
const LOCATIONS: Record<string, { code: string; name: string }> = {
  "1": { code: "IGRN1", name: "Head Office" },
  "2": { code: "IGRN2", name: "Kuliyapitiya" },
  "3": { code: "IGRN3", name: "Nuwara Eliya" },
  "4": { code: "IGRN4", name: "Peradeniya" },
};

interface Props {
  params: Promise<{ locationId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locationId } = await params;
  const loc = LOCATIONS[locationId];
  return { title: loc ? `${loc.name} Stock` : "Location" };
}

export default async function LocationStockRoute({ params }: Props) {
  const { locationId } = await params;

  // Validate locationId — redirect to 404 for unknown locations
  if (!LOCATIONS[locationId]) notFound();

  const loc = LOCATIONS[locationId];

  // ── Uncomment when DB is connected ──
  // const [stock, movements] = await Promise.all([
  //   getStockByLocation(Number(locationId)),
  //   getMovementsByLocation(Number(locationId)),
  // ]);

  return (
    <LocationStockPage
      locationId={Number(locationId)}
      locationCode={loc.code}
      locationName={loc.name}
      initialStock={[]}
      initialMovements={[]}
    />
  );
}
