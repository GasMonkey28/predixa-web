"use client";

import { useState } from "react";
import {
  INSTRUMENT_OPTIONS,
  getPointMultiplier,
  isOpenPosition,
  type InstrumentType,
  type TradeJournalEntry,
} from "@/lib/trade-journal-types";
import { calcOffsetPnL, calcPositionOffset } from "@/lib/trade-journal-offset";

const priceFormat = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 4,
});
const moneyFormat = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});
const inputClass =
  "rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-white";

export default function TradeJournalOffsetCalculator({
  entries,
}: {
  entries: TradeJournalEntry[];
}) {
  const [instrument, setInstrument] = useState<InstrumentType>("mini_future");
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [priceInput, setPriceInput] = useState("");
  const openEntries = entries.filter(
    (entry) => entry.instrumentType === instrument && isOpenPosition(entry),
  );
  const selected = openEntries.filter((entry) => !excluded.has(entry.id));
  const offset = calcPositionOffset(selected);
  const previewPrice =
    priceInput.trim() === "" ? offset.breakEvenPrice : Number(priceInput);
  const pnl =
    previewPrice == null
      ? null
      : calcOffsetPnL(offset, previewPrice, getPointMultiplier(instrument));
  const invalidPrice = priceInput.trim() !== "" && pnl == null;
  const label = INSTRUMENT_OPTIONS.find(
    (option) => option.value === instrument,
  )!;

  return (
    <section
      aria-labelledby="offset-heading"
      className="border-b border-zinc-800/80 bg-zinc-950/40 px-4 py-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 id="offset-heading" className="text-sm font-semibold text-white">
            Long / short offset calculator
          </h3>
          <p className="mt-1 text-xs text-zinc-400">
            Price where the selected open positions reach combined break-even,
            before fees.
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs text-zinc-400">
          Instrument
          <select
            value={instrument}
            onChange={(event) => {
              setInstrument(event.target.value as InstrumentType);
              setPriceInput("");
            }}
            className={inputClass}
          >
            {INSTRUMENT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-start gap-x-8 gap-y-3">
        <div>
          <p className="text-xs text-zinc-400">Offset price</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-blue-300">
            {offset.status === "price"
              ? priceFormat.format(offset.breakEvenPrice!)
              : offset.status === "always"
                ? "Every price"
                : "—"}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            {offset.status === "empty"
              ? "Select an open position to calculate."
              : offset.status === "always"
                ? "Equal quantities and entry costs: combined P&L stays zero."
                : offset.status === "never"
                  ? "Equal quantities: combined P&L is fixed; price changes cannot offset it."
                  : offset.status === "unreachable"
                    ? "No break-even at a non-negative price."
                    : `Combined P&L is positive ${offset.netSize > 0 ? "above" : "below"} this price.`}
          </p>
        </div>
        <div className="text-xs leading-6 tabular-nums text-zinc-400">
          <p>
            <span className="text-emerald-300">Long {offset.longSize}</span>
            {offset.longAverage != null &&
              ` @ ${priceFormat.format(offset.longAverage)} average`}
          </p>
          <p>
            <span className="text-red-300">Short {offset.shortSize}</span>
            {offset.shortAverage != null &&
              ` @ ${priceFormat.format(offset.shortAverage)} average`}
          </p>
          <p>
            {label.shortLabel} · ${label.multiplier} per point per{" "}
            {instrument === "stock" ? "share" : "contract"}
          </p>
        </div>
        <div className="space-y-2">
          <label className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
            Preview price
            <input
              type="number"
              min="0"
              step="any"
              value={priceInput}
              onChange={(event) => setPriceInput(event.target.value)}
              placeholder={
                offset.breakEvenPrice == null
                  ? "Enter price"
                  : priceFormat.format(offset.breakEvenPrice)
              }
              aria-invalid={invalidPrice}
              className={`${inputClass} w-36`}
            />
          </label>
          {invalidPrice && (
            <p className="text-xs text-red-300">
              Enter a valid price of zero or higher.
            </p>
          )}
          {pnl && selected.length > 0 && (
            <div
              aria-live="polite"
              className="text-xs leading-6 tabular-nums text-zinc-300"
            >
              <p>
                At {priceFormat.format(previewPrice!)}: long{" "}
                {moneyFormat.format(pnl.longProfit)} + short{" "}
                {moneyFormat.format(pnl.shortProfit)}
              </p>
              <p
                className={`font-semibold ${pnl.total > 0 ? "text-emerald-300" : pnl.total < 0 ? "text-red-300" : "text-zinc-200"}`}
              >
                Combined P&L {moneyFormat.format(pnl.total)}
              </p>
            </div>
          )}
        </div>
      </div>
      {openEntries.length > 0 && (
        <details className="mt-3 text-xs text-zinc-400">
          <summary className="cursor-pointer">
            Included positions ({selected.length} of {openEntries.length})
          </summary>
          <p className="mt-2">
            Choose positions for the same underlying and contract expiry.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {openEntries.map((entry) => (
              <label
                key={entry.id}
                className="flex cursor-pointer items-center gap-2 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5"
              >
                <input
                  type="checkbox"
                  checked={!excluded.has(entry.id)}
                  onChange={() =>
                    setExcluded((current) => {
                      const next = new Set(current);
                      if (next.has(entry.id)) next.delete(entry.id);
                      else next.add(entry.id);
                      return next;
                    })
                  }
                />
                {entry.entryDate} · {entry.buyPrice! < 0 ? "Short" : "Long"}{" "}
                {entry.positionSize} @{" "}
                {priceFormat.format(Math.abs(entry.buyPrice!))}
              </label>
            ))}
          </div>
        </details>
      )}
      <p className="mt-3 text-xs text-zinc-500">
        Example: short 4 @ 5,000 + long 8 @ 5,500 → offset at 6,000. Uses open
        journal entries and their current entry prices; excludes closed trades
        and the Sacrifice pool.
      </p>
    </section>
  );
}
