import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { SalesRepsResponse } from "@/types/api";

export async function GET() {
	try {
		const salesReps = await prisma.salesRep.findMany({
			orderBy: { full_name: "asc" },
			select: {
				rep_id: true,
				full_name: true,
			},
		});

		const responseBody: SalesRepsResponse = {
			data: salesReps.map((rep) => ({
				id: rep.rep_id,
				label: rep.full_name,
			})),
		};

		return NextResponse.json(responseBody);
	} catch (error) {
		console.error("Failed to load sales reps", error);
		return NextResponse.json({ error: "Failed to load sales reps." }, { status: 500 });
	}
}
