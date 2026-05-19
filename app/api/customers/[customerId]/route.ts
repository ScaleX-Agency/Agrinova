import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import * as z from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateCustomerSchema = z.object({
  name: z.string().trim().min(1, "Customer name is required."),
  phone: z.string().trim().min(1, "Phone is required."),
  address: z.string().trim().optional(),
  assignedRepId: z.coerce.number().int().positive("Sales rep is required."),
});

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

function parseCustomerId(value: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }
  return id;
}

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

async function findCustomerById(customerId: number) {
  return prisma.customer.findUnique({
    where: { customer_id: customerId },
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
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ customerId: string }> },
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customerId = parseCustomerId((await params).customerId);
    if (!customerId) {
      return NextResponse.json(
        { error: "Invalid customer ID" },
        { status: 400 },
      );
    }

    const customer = await findCustomerById(customerId);
    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ customer: serializeCustomer(customer) });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ customerId: string }> },
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const customerId = parseCustomerId((await params).customerId);
  if (!customerId) {
    return NextResponse.json({ error: "Invalid customer ID" }, { status: 400 });
  }

  const existing = await findCustomerById(customerId);
  if (!existing) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = updateCustomerSchema.safeParse(body);
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
    const customer = await prisma.customer.update({
      where: { customer_id: customerId },
      data: {
        assigned_rep_id: parsed.data.assignedRepId,
        name: parsed.data.name,
        phone: parsed.data.phone,
        address: parsed.data.address?.trim()
          ? parsed.data.address.trim()
          : null,
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

    return NextResponse.json({ customer: serializeCustomer(customer) });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ customerId: string }> },
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const customerId = parseCustomerId((await params).customerId);
  if (!customerId) {
    return NextResponse.json({ error: "Invalid customer ID" }, { status: 400 });
  }

  const existing = await findCustomerById(customerId);
  if (!existing) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const activeInvoiceCount = await prisma.invoice.count({
    where: {
      customer_id: customerId,
      is_active: true,
    },
  });

  if (activeInvoiceCount > 0) {
    return NextResponse.json(
      {
        error:
          "Cannot delete this customer because there are active invoices linked to this customer.",
      },
      { status: 409 },
    );
  }

  try {
    await prisma.customer.delete({ where: { customer_id: customerId } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return NextResponse.json(
        {
          error:
            "Cannot delete this customer because it is linked to existing records.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}
