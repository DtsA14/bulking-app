const PREFIX = 'bulking-app:'

export function exists(key) {
  return localStorage.getItem(PREFIX + key) !== null
}

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch (err) {
    // storage bisa penuh/disabled - gak boleh crash, tapi user harus tau datanya
    // gak kesimpen, makanya broadcast event ini biar App.jsx bisa nampilin toast.
    window.dispatchEvent(new CustomEvent('bulking-app:storage-error', { detail: { key, err } }))
  }
}
