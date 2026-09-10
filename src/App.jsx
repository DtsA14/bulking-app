import { useState, useEffect } from 'react'
import BottomNav from './components/BottomNav.jsx'
import HariIni from './pages/HariIni.jsx'
import Resep from './pages/Resep.jsx'
import Progress from './pages/Progress.jsx'
import Belanja from './pages/Belanja.jsx'
import Profil from './pages/Profil.jsx'

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

export default function App() {
  const [activeTab, setActiveTab] = useState('hariini')
  const [storageError, setStorageError] = useState(false)
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

  return (
    <div className="app-shell">
      {storageError && (
        <div className="storage-toast">
          Perubahan gagal disimpan (penyimpanan browser penuh/dimatiin). Coba bebasin ruang atau pake browser lain.
          <button onClick={() => setStorageError(false)}>×</button>
        </div>
      )}
      <header className="app-header">
        <span className="app-header-title">{TAB_TITLES[activeTab]}</span>
      </header>
      <main className="app-content">
        <ActivePage />
      </main>
      <BottomNav active={activeTab} onChange={setActiveTab} />
    </div>
  )
}
