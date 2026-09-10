import { useState, useEffect } from 'react'
import { load, save, exists } from '../lib/storage.js'
import { dateKey } from '../lib/schedule.js'
import { getWeightTrend } from '../lib/weight.js'

const DEMO_LOGS = [
  { date: '2026-08-25', weight: 61.0 },
  { date: '2026-08-28', weight: 61.2 },
  { date: '2026-09-01', weight: 61.6 },
  { date: '2026-09-04', weight: 61.9 },
  { date: '2026-09-08', weight: 62.1 }
]

export default function Progress() {
  // Demo data cuma dipake kalau BELUM PERNAH ADA data asli sama sekali (key belum
  // pernah kesentuh) - begitu user nyatet berat pertama kali, demo langsung
  // dibuang, bukan digabung, biar histori gak nyampur data asli sama contoh.
  const [isDemo, setIsDemo] = useState(() => !exists('weight-logs'))
  const [logs, setLogs] = useState(() => load('weight-logs', DEMO_LOGS))
  const [input, setInput] = useState('')

  useEffect(() => {
    if (!isDemo) save('weight-logs', logs)
  }, [logs, isDemo])

  function addLog() {
    const val = parseFloat(input)
    if (isNaN(val) || val <= 0) return
    const today = dateKey()
    const entry = { date: today, weight: val }

    if (isDemo) {
      setLogs([entry])
      setIsDemo(false)
    } else {
      setLogs(prev => [...prev.filter(l => l.date !== today), entry].sort((a, b) => a.date.localeCompare(b.date)))
    }
    setInput('')
  }

  const today = dateKey()
  const { deltaPerWeek } = getWeightTrend(logs, today)

  let suggestion = 'Belum cukup data. Catat berat tiap pagi minimal 2 minggu buat mulai lihat tren.'
  if (deltaPerWeek !== null) {
    if (deltaPerWeek < 0) suggestion = 'Berat turun — tambah 200 kkal segera.'
    else if (deltaPerWeek < 0.1) suggestion = 'Kenaikan lambat — pertimbangkan tambah 150-200 kkal (booster) per hari.'
    else if (deltaPerWeek <= 0.5) suggestion = 'Tren ideal, pertahankan pola makan sekarang.'
    else suggestion = 'Kenaikan agak cepat — kurangi 100-150 kkal (kurangi booster).'
  }

  return (
    <div className="page">
      {isDemo && (
        <div className="suggestion-box" style={{ background: '#F3E7D4', marginBottom: 10 }}>
          Ini contoh data demo, bukan riwayat lu. Catat berat pertama buat mulai tracking asli — begitu diisi, demo ini otomatis diganti.
        </div>
      )}

      <div className="log-input">
        <input
          type="number"
          step="0.1"
          placeholder="Berat hari ini (kg)"
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <button className="btn-primary" onClick={addLog}>Catat</button>
      </div>

      <div className="suggestion-box">{suggestion}</div>

      <div className="cat-heading">Riwayat</div>
      {logs.length === 0 && <p className="empty-note">Belum ada catatan berat.</p>}
      {[...logs].reverse().map(l => (
        <div className="log-row" key={l.date}>
          <span>{l.date}</span>
          <span>{l.weight} kg</span>
        </div>
      ))}
    </div>
  )
}
