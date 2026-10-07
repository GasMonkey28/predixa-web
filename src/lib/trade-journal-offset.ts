import { isOpenPosition, type TradeJournalEntry } from "./trade-journal-types";

type OffsetPosition = Pick<
  TradeJournalEntry,
  "buyPrice" | "soldPrice" | "positionSize"
>;

/** Quantities are positive; the signed buy price identifies the side. Use one underlying. */
export function calcPositionOffset(entries: OffsetPosition[]) {
  let longSize = 0;
  let shortSize = 0;
  let longCost = 0;
  let shortCost = 0;
  for (const entry of entries) {
    if (
      !isOpenPosition(entry) ||
      !Number.isFinite(entry.buyPrice) ||
      !Number.isFinite(entry.positionSize) ||
      entry.positionSize <= 0
    )
      continue;
    if (entry.buyPrice! > 0) {
      longSize += entry.positionSize;
      longCost += entry.buyPrice! * entry.positionSize;
    } else {
      shortSize += entry.positionSize;
      shortCost += -entry.buyPrice! * entry.positionSize;
    }
  }
  const netSize = longSize - shortSize;
  const costDifference = longCost - shortCost;
  const rawPrice = netSize === 0 ? null : costDifference / netSize;
  const breakEvenPrice =
    rawPrice != null && Number.isFinite(rawPrice) && rawPrice >= 0
      ? rawPrice
      : null;
  const status =
    longSize + shortSize === 0
      ? "empty"
      : netSize === 0
        ? Math.abs(costDifference) < 1e-8
          ? "always"
          : "never"
        : breakEvenPrice == null
          ? "unreachable"
          : "price";
  return {
    longSize,
    shortSize,
    netSize,
    longCost,
    shortCost,
    breakEvenPrice,
    status,
    longAverage: longSize > 0 ? longCost / longSize : null,
    shortAverage: shortSize > 0 ? shortCost / shortSize : null,
  };
}

export function calcOffsetPnL(
  offset: ReturnType<typeof calcPositionOffset>,
  price: number,
  multiplier: number,
) {
  if (
    !Number.isFinite(price) ||
    price < 0 ||
    !Number.isFinite(multiplier) ||
    multiplier <= 0
  )
    return null;
  const longProfit = (offset.longSize * price - offset.longCost) * multiplier;
  const shortProfit =
    (offset.shortCost - offset.shortSize * price) * multiplier;
  const total = longProfit + shortProfit;
  return { longProfit, shortProfit, total: Math.abs(total) < 1e-8 ? 0 : total };
}
