export type DtPnlAsset = 'stock' | 'option'

export type DtPnlDay = {
  date: string
  /** Total P&L attributed to this open (entry) day */
  pnl: number
  realizedPnl: number
  openUnrealizedPnl: number
  closedTrades: number
  openPositions: number
  isProfitDay: boolean
}

export type DtPnlMonth = {
  monthKey: string
  label: string
  pnl: number
  /** Running total through end of this month (oldest → newest) */
  accumulatedPnl: number
  profitDays: number
  lossDays: number
  tradeDays: number
  closedTrades: number
}

export type DtPnlSnapshot = {
  asset: DtPnlAsset
  generated_at: string
  today: string
  days: DtPnlDay[]
  months: DtPnlMonth[]
  totals: {
    pnl: number
    accumulatedPnl: number
    profitDays: number
    lossDays: number
    tradeDays: number
    closedTrades: number
  }
  range: { from: string; to: string }
}
