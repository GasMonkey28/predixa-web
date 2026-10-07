import { calcOffsetPnL, calcPositionOffset } from "../trade-journal-offset";
import { applyJournalClosePatch, normalizeEntry } from "../trade-journal-types";

const lot = (
  buyPrice: number,
  positionSize: number,
  soldPrice: number | null = null,
) => normalizeEntry({ buyPrice, positionSize, soldPrice }, 0);

describe("journal position offset", () => {
  it("balances 4 shorts at 5000 and 8 longs at 5500 at 6000", () => {
    const offset = calcPositionOffset([lot(-5000, 4), lot(5500, 8)]);
    expect(offset).toMatchObject({
      status: "price",
      breakEvenPrice: 6000,
      longSize: 8,
      shortSize: 4,
    });
    expect(calcOffsetPnL(offset, 6000, 5)).toEqual({
      longProfit: 20000,
      shortProfit: -20000,
      total: 0,
    });
    expect(calcOffsetPnL(offset, 6100, 5)?.total).toBe(2000);
    expect(calcOffsetPnL(offset, 5900, 5)?.total).toBe(-2000);
    expect(calcOffsetPnL(offset, 6000, 50)?.total).toBe(0);
  });
  it("weights multiple lots by quantity, and ignores closed trades", () => {
    const offset = calcPositionOffset([
      lot(5400, 4),
      lot(5600, 4),
      lot(-5000, 4),
      lot(1, 100, 2),
    ]);
    expect(offset.longAverage).toBe(5500);
    expect(offset.breakEvenPrice).toBe(6000);
  });
  it("handles net short exposure and single-sided entries", () => {
    const offset = calcPositionOffset([lot(-5500, 8), lot(5000, 4)]);
    expect(offset.breakEvenPrice).toBe(6000);
    expect(calcOffsetPnL(offset, 5900, 5)?.total).toBe(2000);
    expect(calcPositionOffset([lot(5500, 8)]).breakEvenPrice).toBe(5500);
    expect(calcPositionOffset([lot(-5000, 4)]).breakEvenPrice).toBe(5000);
  });
  it("reports a fixed loss/profit or perpetual break-even with equal sizes", () => {
    const loss = calcPositionOffset([lot(-5000, 4), lot(5500, 4)]);
    expect(loss.status).toBe("never");
    expect(loss.breakEvenPrice).toBeNull();
    expect(calcOffsetPnL(loss, 6000, 5)?.total).toBe(-10000);
    expect(calcOffsetPnL(loss, 4000, 5)?.total).toBe(-10000);
    expect(
      calcOffsetPnL(calcPositionOffset([lot(-5500, 4), lot(5000, 4)]), 6000, 5)
        ?.total,
    ).toBe(10000);
    expect(calcPositionOffset([lot(-5000, 4), lot(5000, 4)]).status).toBe(
      "always",
    );
  });
  it("handles empty selection, impossible positive prices, and invalid inputs", () => {
    expect(calcPositionOffset([]).status).toBe("empty");
    expect(calcPositionOffset([lot(5000, 8), lot(-15000, 4)]).status).toBe(
      "unreachable",
    );
    expect(
      calcPositionOffset([
        lot(0, 4),
        { ...lot(5000, 4), positionSize: NaN },
        lot(Infinity, 4),
      ]).status,
    ).toBe("empty");
    const offset = calcPositionOffset([lot(5000, 1)]);
    expect(calcOffsetPnL(offset, NaN, 5)).toBeNull();
    expect(calcOffsetPnL(offset, -1, 5)).toBeNull();
    expect(calcOffsetPnL(offset, 5000, Infinity)).toBeNull();
  });
  it("uses only the remaining quantity after a partial close", () => {
    const rows = applyJournalClosePatch(
      lot(5500, 12),
      { soldPrice: 5600, positionSize: 4 },
      "remainder",
    );
    expect(calcPositionOffset([...rows, lot(-5000, 4)]).breakEvenPrice).toBe(
      6000,
    );
  });
});
