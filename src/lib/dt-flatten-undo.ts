export type DtFlattenUndoLot = {
  symbol: string
  quantity: number
  longShort: 'Long' | 'Short' | string
}

export function summarizeFlattenUndo(lots: DtFlattenUndoLot[]): string {
  if (lots.length === 0) return ''
  if (lots.length === 1) {
    const lot = lots[0]!
    return `${lot.longShort} ${lot.quantity} ${lot.symbol}`
  }
  return `${lots.length} positions`
}
