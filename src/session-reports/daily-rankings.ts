import type { Prisma } from '@prisma/client';

export interface DailyRankingRow {
  readonly rank: number;
  readonly staffName: string;
  readonly value: number;
}

export interface DailyRankingsResponse {
  readonly revenue: readonly DailyRankingRow[];
  readonly traffic: readonly DailyRankingRow[];
  readonly retention: readonly DailyRankingRow[];
}

interface StaffTotals {
  staffName: string;
  revenue: number;
  traffic: number;
  retention: number;
}

type RankKey = 'revenue' | 'traffic' | 'retention';

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function rank(rows: readonly StaffTotals[], key: RankKey): DailyRankingRow[] {
  return [...rows]
    .sort((a, b) => b[key] - a[key] || a.staffName.localeCompare(b.staffName, 'vi'))
    .map((row, index) => ({
      rank: index + 1,
      staffName: row.staffName,
      value: row[key],
    }));
}

interface GroupedReport {
  staffName: string;
  _sum: { revenue: Prisma.Decimal | null; viewCount: number | null };
  _avg: { retentionRate: Prisma.Decimal | null };
}

/** Gom theo đúng tên đã điền. Doanh thu và view cộng dồn; giữ chân lấy trung bình các ca. */
export function buildDailyRankings(groups: readonly GroupedReport[]): DailyRankingsResponse {
  const totals: StaffTotals[] = groups.map((group) => ({
    staffName: group.staffName,
    revenue: group._sum.revenue?.toNumber() ?? 0,
    traffic: group._sum.viewCount ?? 0,
    retention: round2(group._avg.retentionRate?.toNumber() ?? 0),
  }));

  return {
    revenue: rank(totals, 'revenue'),
    traffic: rank(totals, 'traffic'),
    retention: rank(totals, 'retention'),
  };
}
