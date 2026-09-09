import { useState, useEffect } from 'react'
import { load, save } from '../lib/storage.js'
import { DEFAULT_PROFILE } from '../lib/profile.js'
import ingredientsData from '../data/ingredients.json'
import { clearTotalsCache } from '../data/recipes.js'

function TargetSection() {
  const [profile, setProfile] = useState(() => load('profile', DEFAULT_PROFILE))

  useEffect(() => {
    save('profile', profile)
  }, [profile])

  function update(field, value) {
    setProfile(prev => ({ ...prev, [field]: value }))
  }

  return (
    <>
      <div className="cat-heading">Target</div>
      <label className="field-row">
        Berat sekarang (kg)
        <input type="number" value={profile.beratSekarang} onChange={e => update('beratSekarang', parseFloat(e.target.value) || 0)} />
      </label>
      <label className="field-row">
        Tinggi badan (cm)
        <input type="number" value={profile.tinggiBadan} onChange={e => update('tinggiBadan', parseFloat(e.target.value) || 0)} />
      </label>
      <label className="field-row">
        Target berat (kg)
        <input type="number" value={profile.targetBerat} onChange={e => update('targetBerat', parseFloat(e.target.value) || 0)} />
      </label>
      <label className="field-row">
        Baseline kalori harian
        <input type="number" value={profile.baselineKkal} onChange={e => update('baselineKkal', parseFloat(e.target.value) || 0)} />
      </label>
      <label className="field-row">
        Pantangan makanan
        <input type="text" value={profile.pantangan} onChange={e => update('pantangan', e.target.value)} />
      </label>
    </>
  )
}

// Editor harga bahan - override disimpen terpisah dari ingredients.json (yang statis,
// ke-bundle pas build). Dibaca sama getIngredientPrice() di lib/nutrition.js,
// jadi begitu diedit di sini, Resep (Gizi) & Belanja otomatis pake angka baru.
function HargaBahanSection() {
  const [overrides, setOverrides] = useState(() => load('price-overrides', {}))

  useEffect(() => {
    save('price-overrides', overrides)
  }, [overrides])

  function updateHarga(id, value) {
    const num = parseFloat(value)
    setOverrides(prev => ({ ...prev, [id]: isNaN(num) ? 0 : num }))
    clearTotalsCache()
  }

  return (
    <>
      <div className="cat-heading">Harga bahan (Rp per 100g/100ml)</div>
      <p className="empty-note" style={{ marginBottom: 10 }}>
        Estimasi awal dari sistem — sesuaikan sama harga di tempat lu belanja biar Belanja lebih akurat.
      </p>
      {ingredientsData.ingredients.map(item => (
        <div className="price-row" key={item.id}>
          <span>{item.nama}</span>
          <input
            type="number"
            value={overrides[item.id] ?? item.harga_per_100 ?? 0}
            onChange={e => updateHarga(item.id, e.target.value)}
          />
        </div>
      ))}
    </>
  )
}

export default function Profil() {
  return (
    <div className="page">
      <TargetSection />
      <HargaBahanSection />
    </div>
  )
}
