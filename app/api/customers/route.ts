import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
	try {
		const customers = await prisma.customer.findMany({
			orderBy: { name: "asc" },
			select: {
				customer_id: true,
				name: true,
				assigned_rep_id: true,
			},
		});

		return NextResponse.json({
			data: customers.map((customer) => ({
				id: customer.customer_id,
				label: customer.name,
				assignedRepId: customer.assigned_rep_id,
			})),
		});
	} catch (error) {
		console.error("Failed to load customers", error);
		return NextResponse.json({ error: "Failed to load customers." }, { status: 500 });
	}
}
