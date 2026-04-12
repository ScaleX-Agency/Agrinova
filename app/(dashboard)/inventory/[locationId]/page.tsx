import LocationStockPage from "@/components/LocationStockPage"; 
import { getStockByLocation, getMovementsByLocation } from "@/lib/inventoryService"; 
import { notFound } from "next/navigation"; 
import type { Metadata } from "next"; 
import { prisma } from "@/lib/prisma"; 
interface Props { params: Promise<{ locationId: string }> } 
 
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locationId } = await params;
  const loc = await prisma.inventoryLocation.findUnique({ where: { location_id: Number(locationId) } });
  return { title: loc ? `${loc.name} Stock` : "Location" };
}
 
export default async function LocationStockRoute({ params }: Props) { 
const { locationId } = await params; 
const loc = await prisma.inventoryLocation.findUnique({ where: { location_id: Number(locationId) } }); 
if (!loc) notFound(); 
 
const [stock, movements] = await Promise.all([ 
getStockByLocation(Number(locationId)), 
getMovementsByLocation(Number(locationId)), 
]); 
 
return ( 
<LocationStockPage
  locationId={Number(locationId)}
  locationCode={loc.code}
  locationName={loc.name}
  initialStock={stock}
  initialMovements={movements}
/>
); 
} 
