import { NextResponse } from "next/server";
import * as z from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createCustomerSchema = z.object({
  name: z.string().trim().min(1, "Customer name is required."),
  phone: z.string().trim().min(1, "Phone is required."),
  address: z.string().trim().optional(),
  assignedRepId: z.coerce.number().int().positive("Sales rep is required."),
});

function getValidationError(error: z.ZodError) {
  const issue = error.issues[0];
  if (!issue) {
    return "Invalid input";
  }
  return issue.message;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Internal error";
}

type CustomerWithRep = {
  customer_id: number;
  assigned_rep_id: number;
  name: string;
  address: string | null;
  phone: string | null;
  created_at: Date;
  updated_at: Date;
  assigned_rep: {
    rep_id: number;
    full_name: string;
    phone: string;
  } | null;
};

function serializeCustomer(customer: CustomerWithRep) {
  return {
    customer_id: customer.customer_id,
    assigned_rep_id: customer.assigned_rep_id,
    name: customer.name,
    address: customer.address,
    phone: customer.phone,
    created_at: customer.created_at.toISOString(),
    updated_at: customer.updated_at.toISOString(),
    sales_rep: customer.assigned_rep,
  };
}

async function ensureSalesRepExists(assignedRepId: number) {
  const salesRep = await prisma.salesRep.findUnique({
    where: { rep_id: assignedRepId },
    select: { rep_id: true },
  });

  return !!salesRep;
}

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customers = await prisma.customer.findMany({
      orderBy: { customer_id: "desc" },
      select: {
        customer_id: true,
        assigned_rep_id: true,
        name: true,
        address: true,
        phone: true,
        created_at: true,
        updated_at: true,
        assigned_rep: {
          select: {
            rep_id: true,
            full_name: true,
            phone: true,
          },
        },
      },
    });

    const serializedCustomers = customers.map((customer) =>
      serializeCustomer(customer),
    );

    return NextResponse.json({
      customers: serializedCustomers,
      // Backward-compatible shape used by customer dropdown consumers.
      data: serializedCustomers
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((customer) => ({
          id: customer.customer_id,
          label: customer.name,
          assignedRepId: customer.assigned_rep_id,
        })),
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createCustomerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: getValidationError(parsed.error) },
      { status: 400 },
    );
  }

  const hasSalesRep = await ensureSalesRepExists(parsed.data.assignedRepId);
  if (!hasSalesRep) {
    return NextResponse.json(
      { error: "Selected sales rep does not exist." },
      { status: 400 },
    );
  }

  try {
    const customer = await prisma.customer.create({
      data: {
        assigned_rep_id: parsed.data.assignedRepId,
        name: parsed.data.name,
        phone: parsed.data.phone,
        address: parsed.data.address?.trim() ? parsed.data.address.trim() : null,
      },
      select: {
        customer_id: true,
        assigned_rep_id: true,
        name: true,
        address: true,
        phone: true,
        created_at: true,
        updated_at: true,
        assigned_rep: {
          select: {
            rep_id: true,
            full_name: true,
            phone: true,
          },
        },
      },
    });

    return NextResponse.json(
      { customer: serializeCustomer(customer) },
      { status: 201 },
    );
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
