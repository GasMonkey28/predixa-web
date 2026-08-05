/** Shared DT paper-account localStorage (Stock DT + Option DT). */

export const DT_SIM_ACCOUNT_STORAGE_KEY = 'dt-sim-account'
export const DT_SIM_ACCOUNT_LEGACY_KEY = 'option-dt-sim-account'

export function readDtSimAccountId(): string {
  if (typeof window === 'undefined') return ''
  return (
    window.localStorage.getItem(DT_SIM_ACCOUNT_STORAGE_KEY) ||
    window.localStorage.getItem(DT_SIM_ACCOUNT_LEGACY_KEY) ||
    ''
  )
}

export function writeDtSimAccountId(id: string): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(DT_SIM_ACCOUNT_STORAGE_KEY, id)
  window.localStorage.setItem(DT_SIM_ACCOUNT_LEGACY_KEY, id)
}
