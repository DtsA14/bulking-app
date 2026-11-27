const PREFIX = 'bulking-app:'
const APP_NAME = 'bulking-app'

// Semua key milik app ini, apa adanya (masih pakai prefix).
function localKeys() {
  const keys = []
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (key !== null && key.startsWith(PREFIX)) keys.push(key)
  }
  return keys
}

export function exportLocalData() {
  // Object.create(null) biar key aneh seperti "__proto__" tetap jadi entri biasa.
  const data = Object.create(null)

  for (const key of localKeys()) {
    const name = key.slice(PREFIX.length)
    const raw = localStorage.getItem(key)
    let value
    try {
      value = JSON.parse(raw)
    } catch {
      // value yang gak valid JSON disimpan apa adanya (raw string)
      value = raw
    }
    data[name] = value
  }

  return JSON.stringify(
    { app: APP_NAME, exportedAt: new Date().toISOString(), data },
    null,
    2
  )
}

export function importLocalData(text) {
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('File bukan JSON yang valid')
  }

  if (!parsed || typeof parsed !== 'object' || parsed.app !== APP_NAME) {
    throw new Error('File ini bukan backup bulking-app')
  }

  const { data } = parsed
  // Validasi dulu, baru sentuh localStorage.
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Isi backup rusak')
  }

  const entries = Object.entries(data)

  // Hapus semua key lama milik app ini (kumpulkan dulu, baru hapus).
  for (const key of localKeys()) {
    localStorage.removeItem(key)
  }

  // Tulis langsung, tanpa save(), biar error-nya naik ke pemanggil.
  for (const [key, value] of entries) {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  }

  return entries.length
}
