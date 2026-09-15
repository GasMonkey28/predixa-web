import { getJournalTargetsForFillAction, type TradeStationRecentFill } from '@/lib/tradestation-recent-fills'
import {
  applyJournalClosePatch, calcOpenPositionSummary, calcMonthlyProfitSummaries,
  normalizeEntry, renumberEntries, isOpenPosition,
} from '@/lib/trade-journal-types'

const openLot = (size = 12, price = 6600) => normalizeEntry({
  id: 'original', entryDate: '2026-09-15', positionSize: size, buyPrice: price,
  instrumentType: 'mini_future', targetPrice: 6700, reason: 'Entry signals',
  tradestationBuyFillId: 'buy-12', rating: 'A',
}, 0)
const close = { soldPrice: 6610, positionSize: 11, closeDate: '2026-09-15',
  tradestationSoldFillId: 'sell-11', closeReason: 'Close signals' }

describe('partial journal close', () => {
  it('keeps 1 contract open and books only 11 contracts of profit', () => {
    const original = openLot()
    const rows = renumberEntries(applyJournalClosePatch(original, close, 'remainder'))
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ id: 'original', positionSize: 11, profit: 550 })
    expect(rows[1]).toMatchObject({ id: 'remainder', positionSize: 1, buyPrice: 6600,
      soldPrice: null, profit: null, closeDate: null, closeReason: null,
      reason: 'Entry signals', targetPrice: 6700, rating: 'A',
      tradestationBuyFillId: 'buy-12', tradestationSoldFillId: null })
    expect(calcOpenPositionSummary(rows).netPosition).toBe(1)
    expect(calcMonthlyProfitSummaries(rows)[0].tradeTotal).toBe(550)
    expect(original.positionSize).toBe(12)
    expect(original.soldPrice).toBeNull()
  })
  it('round trips the remainder through persisted normalization', () => {
    const rows = applyJournalClosePatch(openLot(), close, 'remainder')
    const restored = JSON.parse(JSON.stringify(rows)).map(normalizeEntry)
    expect(restored.filter(isOpenPosition)).toHaveLength(1)
    expect(calcOpenPositionSummary(restored).netPosition).toBe(1)
  })
  it('can close the final contract without duplicating realized profit', () => {
    const rows = applyJournalClosePatch(openLot(), close, 'remainder')
    const final = [rows[0], ...applyJournalClosePatch(rows[1], {
      ...close, positionSize: 1, soldPrice: 6620, tradestationSoldFillId: 'sell-1',
    }, 'unused')]
    expect(final).toHaveLength(2)
    expect(calcOpenPositionSummary(final).netPosition).toBe(0)
    expect(calcMonthlyProfitSummaries(final)[0].tradeTotal).toBe(650)
  })
  it('preserves a partial short and its signed entry price', () => {
    const rows = applyJournalClosePatch(openLot(12, -6600), {...close, soldPrice: 6590}, 'r')
    expect(rows[0].profit).toBe(550)
    expect(rows[1].buyPrice).toBe(-6600)
    expect(calcOpenPositionSummary(rows).netPosition).toBe(-1)
  })
  it('does not create a remainder for an exact close or editing a closed row', () => {
    const rows = applyJournalClosePatch(openLot(11), close, 'r')
    expect(rows).toHaveLength(1)
    expect(applyJournalClosePatch(rows[0], {...close, positionSize: 5}, 'r')).toHaveLength(1)
  })
  it('keeps contribution and sacrifice markers off the remaining open lot', () => {
    const rows = applyJournalClosePatch(openLot(), {...close, pointsSacrificed: -10,
      pointsContributed: 10, contributedToEntryId: 'recipient'}, 'r')
    expect(rows[1].pointsSacrificed).toBeNull()
    expect(rows[1].pointsContributed).toBeNull()
    expect(rows[1].contributedToEntryId).toBeNull()
  })
  it('counts quantities rather than rows for the broker comparison', () => {
    expect(calcOpenPositionSummary([openLot(12), {...openLot(3,-6600), id:'short'}]))
      .toEqual({highestLong:12, highestShort:-3, netPosition:9})
  })
})

it('previews profit for only the quantity being closed', () => {
  const fill = { id: 'sell-11', orderId: 'sell', symbol: 'MESU26',
    instrumentType: 'mini_future', label: 'Close 11', date: '2026-09-15', time: '10:00',
    timestampMs: 1, quantity: 11, price: 6610, openOrClose: 'close', buyOrSell: 'sell',
    buyValue: null, soldValue: 6610,
  } satisfies TradeStationRecentFill
  const targets = getJournalTargetsForFillAction(fill, [openLot()], 'takeProfit')
  expect(targets).toHaveLength(1)
  expect(targets[0].projectedProfit).toBe(550)
})
