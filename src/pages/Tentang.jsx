import { useRef, useState } from 'react'
import { exportLocalData, importLocalData } from '../lib/backup.js'
import pkg from '../../package.json'

const CONFIRM_TEXT = 'Impor akan MENGGANTI semua data yang ada sekarang. Lanjut?'

function pad2(n) {
  return String(n).padStart(2, '0')
}

// Nama file pakai tanggal LOKAL (bukan toISOString yang UTC), biar tanggal yang
// keliatan di nama file sama kayak tanggal di HP user.
function backupFileName(date = new Date()) {
  return `bulking-app-backup-${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}.json`
}

export default function Tentang() {
  const fileInputRef = useRef(null)
  const [error, setError] = useState('')

  function handleExport() {
    setError('')
    const text = exportLocalData()
    const blob = new Blob([text], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = backupFileName()
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  function handleImportClick() {
    setError('')
    if (fileInputRef.current) fileInputRef.current.click()
  }

  async function handleFileChange(event) {
    const file = event.target.files && event.target.files[0]
    if (!file) return

    let text
    try {
      text = await file.text()
    } catch (e) {
      setError(e && e.message ? e.message : 'Gagal baca file')
      return
    }

    if (!window.confirm(CONFIRM_TEXT)) return

    try {
      importLocalData(text)
      setError('')
      window.location.reload()
    } catch (e) {
      setError(e && e.message ? e.message : 'Impor gagal')
    }
  }

  return (
    <div className="page">
      <div className="section-card">
        <div className="cat-heading">Tentang aplikasi</div>
        <p>Versi {pkg.version}</p>
        <p className="disclaimer" style={{ marginBottom: 0 }}>
          Aplikasi ini dibuat buat bantu nyatet asupan & target bulking, jalan
          sepenuhnya di browser kamu.
        </p>
      </div>

      <div className="section-card">
        <div className="cat-heading">Penyimpanan data</div>
        <p>
          Semua data kamu disimpan hanya di browser ini (localStorage), gak
          dikirim ke server atau internet sama sekali. Data ini kepisah per
          browser dan per device — buka di browser/HP lain, datanya gak ikut.
        </p>
        <p className="disclaimer" style={{ marginBottom: 0 }}>
          Kalau data situs (site data) browser dibersihin — atau kamu pake mode
          incognito / ganti browser — datanya bisa hilang dan gak bisa
          dibalikin. Makanya rutin ekspor backup, biar ada salinan yang aman.
        </p>
      </div>

      <div className="section-card">
        <div className="cat-heading">Backup data</div>
        <p className="disclaimer" style={{ marginTop: 0 }}>
          Ekspor bikin file .json berisi semua data kamu. Impor bakal
          MENGGANTI semua data yang ada sekarang dengan isi file itu.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn-primary" onClick={handleExport}>Ekspor data</button>
          <button className="btn-secondary" onClick={handleImportClick}>Impor data</button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        {error && (
          <p style={{ color: '#9C3D2A', fontWeight: 600, marginBottom: 0 }}>{error}</p>
        )}
      </div>
    </div>
  )
}
