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
