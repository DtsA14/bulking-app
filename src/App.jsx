import { useState, useEffect } from 'react'
import BottomNav from './components/BottomNav.jsx'
import HariIni from './pages/HariIni.jsx'
import Resep from './pages/Resep.jsx'
import Progress from './pages/Progress.jsx'
import Belanja from './pages/Belanja.jsx'
import Profil from './pages/Profil.jsx'
import Tentang from './pages/Tentang.jsx'

const TABS = {
  hariini: HariIni,
  resep: Resep,
  progress: Progress,
  belanja: Belanja,
  profil: Profil
}

const TAB_TITLES = {
  hariini: 'Hari Ini',
  resep: 'Resep',
  progress: 'Progress',
  belanja: 'Belanja',
  profil: 'Profil'
}

// Ikon gear di header - gaya sama kayak ikon BottomNav (line/stroke, currentColor).
function IconGear() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
    </svg>
  )
}

export default function App() {
  const [activeTab, setActiveTab] = useState('hariini')
  const [storageError, setStorageError] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const ActivePage = TABS[activeTab]

  // lib/storage.js broadcast event ini pas localStorage.setItem gagal (penuh/disabled) -
  // biar user tau perubahannya gak beneran kesimpen, bukan cuma gagal diam-diam.
  useEffect(() => {
    function onStorageError() {
      setStorageError(true)
    }
    window.addEventListener('bulking-app:storage-error', onStorageError)
    return () => window.removeEventListener('bulking-app:storage-error', onStorageError)
  }, [])

  // Pindah tab juga nutup Tentang - Tentang bukan tab keenam, dia overlay dari
  // tombol gear di header, jadi begitu user milih tab dia balik ke halaman normal.
  function handleTabChange(tabId) {
    setActiveTab(tabId)
    setShowAbout(false)
  }

  return (
    <div className="app-shell">
      {storageError && (
        <div className="storage-toast">
          Perubahan gagal disimpan (penyimpanan browser penuh/dimatiin). Coba bebasin ruang atau pake browser lain.
          <button onClick={() => setStorageError(false)}>×</button>
        </div>
      )}
      <header className="app-header">
        <div className="app-header-row">
          <span className="app-header-title">{showAbout ? 'Tentang' : TAB_TITLES[activeTab]}</span>
          {showAbout ? (
            <button
              className="app-header-btn"
              aria-label="Kembali"
              onClick={() => setShowAbout(false)}
            >
              ‹ Kembali
            </button>
          ) : (
            <button
              className="app-header-btn"
              aria-label="Pengaturan"
              onClick={() => setShowAbout(true)}
            >
              <IconGear />
            </button>
          )}
        </div>
      </header>
      <main className="app-content">
        {showAbout ? <Tentang /> : <ActivePage />}
      </main>
      <BottomNav active={activeTab} onChange={handleTabChange} />
    </div>
  )
}
