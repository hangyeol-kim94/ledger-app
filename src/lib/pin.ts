const SESSION_KEY = 'pin_unlocked'

export const CORRECT_PIN = import.meta.env.VITE_APP_PIN ?? '1234'

export function isPinUnlocked(): boolean {
  return sessionStorage.getItem(SESSION_KEY) === '1'
}

export function setPinUnlocked() {
  sessionStorage.setItem(SESSION_KEY, '1')
}
