import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { CustomersByRepResponse } from "@/types/api";

export async function GET(
	_req: Request,
	{ params }: { params: Promise<{ repId: string }> },
) {
	try {
		const repId = Number((await params).repId);
		if (!Number.isInteger(repId) || repId <= 0) {
			return NextResponse.json({ error: "Invalid repId." }, { status: 400 });
		}

		const customers = await prisma.customer.findMany({
			where: { assigned_rep_id: repId },
			orderBy: { name: "asc" },
			select: {
				customer_id: true,
				name: true,
			},
		});

		const responseBody: CustomersByRepResponse = {
			data: customers.map((customer) => ({
				id: customer.customer_id,
				label: customer.name,
			})),
		};

		return NextResponse.json(responseBody);
	} catch (error) {
		console.error("Failed to load customers for sales rep", error);
		return NextResponse.json(
			{ error: "Failed to load customers for selected sales rep." },
			{ status: 500 },
		);
	}
}
