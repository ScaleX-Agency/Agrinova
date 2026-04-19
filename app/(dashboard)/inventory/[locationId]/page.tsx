// app/(dashboard)/inventory/[locationId]/page.tsx

import LocationStockPage from "@/components/LocationStockPage";
import { getStockByLocation, getMovementsByLocation } from "@/lib/inventoryService";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

interface Props {
  params: Promise<{ locationId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locationId } = await params;
  const loc = await prisma.inventoryLocation.findUnique({
    where: { location_id: Number(locationId) },
  });
  return { title: loc ? `${loc.name} Stock` : "Location" };
}

export default async function LocationStockRoute({ params }: Props) {
  const { locationId } = await params;
  const id = Number(locationId);

  const loc = await prisma.inventoryLocation.findUnique({
    where: { location_id: id },
  });
  if (!loc) notFound();

  // Both calls hit unstable_cache — fast on repeated visits
  const stock = await getStockByLocation(id);
  const movementsResult = await getMovementsByLocation(id);

  return (
    <LocationStockPage
      locationId={id}
      locationCode={loc.code}
      locationName={loc.name}
      initialStock={stock as any}
      initialMovements={movementsResult as any}
    />
  );
}
