import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  getOrCreateActiveCommissionConfig,
  type ActiveCommissionConfig,
} from "@/lib/commissionConfig";
import type {
  CommissionConfigResponse,
  UpdateCommissionConfigRequestDto,
} from "@/types/api";

const canManageCommission = (roleName?: string) => {
  const role = roleName?.toLowerCase();
  return role === "admin" || role === "operator";
};

const toDto = (config: ActiveCommissionConfig): CommissionConfigResponse["data"] => ({
  configId: config.configId,
  sameDayRate: Number((config.sameDayRate * 100).toFixed(4)),
  rangeMinDays: config.rangeMinDays,
  rangeMaxDays: config.rangeMaxDays,
  rangeRate: Number((config.rangeRate * 100).toFixed(4)),
  overRangeRate: Number((config.overRangeRate * 100).toFixed(4)),
});

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canManageCommission(user.role?.role_name)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const cfg = await getOrCreateActiveCommissionConfig();
    const response: CommissionConfigResponse = { data: toDto(cfg) };
    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to load commission config", error);
    return NextResponse.json({ error: "Failed to load commission config." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canManageCommission(user.role?.role_name)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as UpdateCommissionConfigRequestDto;
    const sameDayRate = Number(body.sameDayRate) / 100;
    const rangeRate = Number(body.rangeRate) / 100;
    const overRangeRate = Number(body.overRangeRate) / 100;
    const rangeMinDays = Number(body.rangeMinDays);
    const rangeMaxDays = Number(body.rangeMaxDays);

    if (
      !Number.isFinite(sameDayRate) ||
      !Number.isFinite(rangeRate) ||
      !Number.isFinite(overRangeRate) ||
      sameDayRate < 0 ||
      rangeRate < 0 ||
      overRangeRate < 0
    ) {
      return NextResponse.json({ error: "Invalid commission rates." }, { status: 400 });
    }
    if (
      !Number.isInteger(rangeMinDays) ||
      !Number.isInteger(rangeMaxDays) ||
      rangeMinDays < 1 ||
      rangeMaxDays < rangeMinDays
    ) {
      return NextResponse.json({ error: "Invalid day range." }, { status: 400 });
    }

    await prisma.commissionConfig.updateMany({
      where: { is_active: true },
      data: { is_active: false },
    });

    const created = await prisma.commissionConfig.create({
      data: {
        same_day_rate: sameDayRate,
        range_min_days: rangeMinDays,
        range_max_days: rangeMaxDays,
        range_rate: rangeRate,
        over_range_rate: overRangeRate,
        is_active: true,
      },
    });

    const response: CommissionConfigResponse = {
      data: {
        configId: created.config_id,
        sameDayRate: Number((Number(created.same_day_rate) * 100).toFixed(4)),
        rangeMinDays: created.range_min_days,
        rangeMaxDays: created.range_max_days,
        rangeRate: Number((Number(created.range_rate) * 100).toFixed(4)),
        overRangeRate: Number((Number(created.over_range_rate) * 100).toFixed(4)),
      },
    };
    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to update commission config", error);
    return NextResponse.json({ error: "Failed to update commission config." }, { status: 500 });
  }
}

