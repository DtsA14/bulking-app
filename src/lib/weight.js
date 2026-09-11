import { load, exists } from './storage.js'

// Berat TERBARU dari histori Progress, fallback ke field manual Profil kalau
// histori belum ada sama sekali. Dipake di targetEngine.js biar BMR/macro
// target gak ngitung pake angka Profil yang basi kalau user rajin nyatet di
// Progress tapi lupa update field "Berat sekarang" manual.
export function getCurrentWeight(profile) {
  if (exists('weight-logs')) {
    const logs = load('weight-logs', [])
    if (logs.length > 0) {
      return [...logs].sort((a, b) => a.date.localeCompare(b.date)).at(-1).weight
    }
  }
  return profile.beratSekarang
}

// Selisih hari kalender antara dua tanggal "YYYY-MM-DD" (bukan selisih index array),
// biar tren gak keliru pas user nyatet gak konsisten tiap hari.
function daysBetween(dateStr, referenceStr) {
  const d1 = new Date(dateStr)
  const d2 = new Date(referenceStr)
  return Math.round((d2 - d1) / 86400000)
}

// Dipake bareng sama Progress.jsx (nampilin tren) dan lib/targetEngine.js
// (ngitung TDEE adaptif) - biar gak ada 2 cara beda buat nentuin "tren berat
// mingguan" yang bisa saling gak nyambung.
export function getWeightTrend(logs, today) {
  const last7 = logs.filter(l => { const diff = daysBetween(l.date, today); return diff >= 0 && diff < 7 })
  const prev7 = logs.filter(l => { const diff = daysBetween(l.date, today); return diff >= 7 && diff < 14 })
  const avg = arr => (arr.length ? arr.reduce((a, b) => a + b.weight, 0) / arr.length : null)
  const avgNow = avg(last7)
  const avgPrev = avg(prev7)
  // avgNow dan avgPrev udah masing-masing rata-rata 7 hari kalender, jadi
  // selisihnya LANGSUNG jadi delta per minggu - gak perlu dibagi 2 lagi.
  const deltaPerWeek = avgNow !== null && avgPrev !== null ? avgNow - avgPrev : null
  return { avgNow, avgPrev, deltaPerWeek }
}
