import { prisma } from "@/lib/prisma";

export type ActiveCommissionConfig = {
  configId: number;
  sameDayRate: number;
  rangeMinDays: number;
  rangeMaxDays: number;
  rangeRate: number;
  overRangeRate: number;
};

const DEFAULT_CONFIG = {
  same_day_rate: 0.025,
  range_min_days: 1,
  range_max_days: 59,
  range_rate: 0.02,
  over_range_rate: 0,
};

export const getDaysToPay = (invoiceDate: Date, settledDate: Date) =>
  Math.floor((settledDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24));

export const getOrCreateActiveCommissionConfig = async (): Promise<ActiveCommissionConfig> => {
  const existing = await prisma.commissionConfig.findFirst({
    where: { is_active: true },
    orderBy: { updated_at: "desc" },
  });

  const config =
    existing ??
    (await prisma.commissionConfig.create({
      data: DEFAULT_CONFIG,
    }));

  return {
    configId: config.config_id,
    sameDayRate: Number(config.same_day_rate),
    rangeMinDays: config.range_min_days,
    rangeMaxDays: config.range_max_days,
    rangeRate: Number(config.range_rate),
    overRangeRate: Number(config.over_range_rate),
  };
};

export const resolveCommissionRate = (
  daysToPay: number,
  cfg: ActiveCommissionConfig,
  rateOverride?: number,
) => {
  if (typeof rateOverride === "number" && Number.isFinite(rateOverride) && rateOverride >= 0) {
    return rateOverride;
  }
  if (daysToPay <= 0) return cfg.sameDayRate;
  if (daysToPay >= cfg.rangeMinDays && daysToPay <= cfg.rangeMaxDays) return cfg.rangeRate;
  return cfg.overRangeRate;
};

