const NAV_ITEMS = [
  { id: 'hariini', label: 'Hari Ini', icon: '🏠' },
  { id: 'resep', label: 'Resep', icon: '📖' },
  { id: 'progress', label: 'Progress', icon: '📈' },
  { id: 'belanja', label: 'Belanja', icon: '🛒' },
  { id: 'profil', label: 'Profil', icon: '⚙️' }
]

export default function BottomNav({ active, onChange }) {
  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map(item => (
        <button
          key={item.id}
          className={`nav-item ${active === item.id ? 'active' : ''}`}
          onClick={() => onChange(item.id)}
        >
          <span className="nav-icon">{item.icon}</span>
          <span className="nav-label">{item.label}</span>
        </button>
      ))}
    </nav>
  )
}
