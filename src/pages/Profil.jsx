import { useState, useEffect } from 'react'
import { load, save } from '../lib/storage.js'
import { DEFAULT_PROFILE } from '../lib/profile.js'
import ingredientsData from '../data/ingredients.json'
import { clearTotalsCache } from '../data/recipes.js'
import { getCalorieTarget, calcMifflinTarget, ACTIVITY_LEVELS } from '../lib/targetEngine.js'

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
        Umur (tahun)
        <input type="number" value={profile.umur} onChange={e => update('umur', parseFloat(e.target.value) || 0)} />
      </label>
      <label className="field-row">
        Jenis kelamin
        <select value={profile.gender} onChange={e => update('gender', e.target.value)}>
          <option value="L">Laki-laki</option>
          <option value="P">Perempuan</option>
        </select>
      </label>
      <label className="field-row">
        Level aktivitas
        <select value={profile.aktivitas} onChange={e => update('aktivitas', e.target.value)}>
          {Object.entries(ACTIVITY_LEVELS).map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </label>
      <label className="field-row">
        Override kalori manual (opsional)
        <input
          type="number"
          value={profile.baselineKkal || ''}
          placeholder="Kosongin buat pake estimasi otomatis"
          onChange={e => update('baselineKkal', parseFloat(e.target.value) || 0)}
        />
      </label>
      <TargetReadout profile={profile} />
      <label className="field-row">
        Pantangan makanan
        <input type="text" value={profile.pantangan} onChange={e => update('pantangan', e.target.value)} />
      </label>
    </>
  )
}

// Buat mode 'manual'/'baseline' (cold start), ngitung ulang dari `profile` yang
// live (prop), bukan andelin getCalorieTarget() yang baca dari localStorage -
// storage baru ke-update di useEffect ABIS render, jadi bakal 1 render telat
// kalau dipake langsung pas user lagi ngetik.
function TargetReadout({ profile }) {
  const info = getCalorieTarget()

  if (info.mode === 'adaptive') {
    return (
      <p className="empty-note" style={{ marginBottom: 10 }}>
        Target harian saat ini: <strong>{info.target} kkal</strong> — berdasarkan
        tren 14 hari terakhir (TDEE {info.tdee} kkal + surplus 300 kkal)
      </p>
    )
  }

  if (profile.baselineKkal > 0) {
    return (
      <p className="empty-note" style={{ marginBottom: 10 }}>
        Target harian saat ini: <strong>{profile.baselineKkal} kkal</strong> —
        override manual, gak dihitung ulang sampe dikosongin
      </p>
    )
  }

  const { tdee, target } = calcMifflinTarget(profile)
  return (
    <p className="empty-note" style={{ marginBottom: 10 }}>
      Target harian saat ini: <strong>{target} kkal</strong> — estimasi awal dari
      BMR Mifflin-St Jeor + aktivitas (TDEE {tdee} kkal + surplus 300 kkal).{' '}
      {info.daysTracked}/14 hari histori terkumpul, minimal 10 buat switch ke
      TDEE adaptif dari data asli.
    </p>
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
