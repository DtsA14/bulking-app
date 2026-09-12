import { useState, useEffect } from 'react'
import { load, save } from '../lib/storage.js'
import { DEFAULT_PROFILE } from '../lib/profile.js'
import ingredientsData from '../data/ingredients.json'
import { clearTotalsCache } from '../data/recipes.js'
import { getCalorieTarget, calcMifflinTarget, ACTIVITY_LEVELS } from '../lib/targetEngine.js'
import {
  getAllIngredients, saveIngredient, resetIngredientOverride, deleteCustomIngredient,
  generateIngredientId, MIKRO_LABELS, isIngredientActive
} from '../lib/nutrition.js'

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
      <div className="section-card">
        <div className="cat-heading">Data diri</div>
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
      </div>

      <div className="section-card">
        <div className="cat-heading">Target kalori</div>
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
      </div>

      <div className="section-card">
        <div className="cat-heading">Pantangan</div>
        <label className="field-row">
          Pantangan makanan
          <input type="text" value={profile.pantangan} onChange={e => update('pantangan', e.target.value)} />
        </label>
      </div>
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
      <p className="disclaimer" style={{ marginBottom: 0 }}>
        Target harian saat ini: <strong>{info.target} kkal</strong> — berdasarkan
        tren 14 hari terakhir (TDEE {info.tdee} kkal + surplus 300 kkal)
      </p>
    )
  }

  if (profile.baselineKkal > 0) {
    return (
      <p className="disclaimer" style={{ marginBottom: 0 }}>
        Target harian saat ini: <strong>{profile.baselineKkal} kkal</strong> —
        override manual, gak dihitung ulang sampe dikosongin
      </p>
    )
  }

  const { tdee, target } = calcMifflinTarget(profile)
  return (
    <p className="disclaimer" style={{ marginBottom: 0 }}>
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
    <div className="section-card">
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
    </div>
  )
}

function emptyBahanForm() {
  return {
    id: null,
    nama: '',
    kategori: '',
    unit: 'per_100g',
    kkal: 0,
    protein_g: 0,
    karbo_g: 0,
    lemak_g: 0,
    serat_g: 0,
    // Breakdown opsional - kosong (0) berarti "belum ada datanya", BUKAN
    // "beneran 0", tapi gak ada cara bedain keduanya di angka doang. Sama
    // kayak mikro, mending dibiarin kosong drpd nebak.
    gula_g: 0,
    lemak_jenuh_g: 0,
    lemak_trans_g: 0,
    lemak_mono_g: 0,
    lemak_poly_g: 0,
    harga_per_100: 0,
    mikro: [] // [{ key, value }] - dikonversi ke object pas disimpen
  }
}

function ingredientToForm(item) {
  const per100 = item.per_100g || item.per_100ml || item.per_serving || {}
  return {
    id: item.id,
    nama: item.nama,
    kategori: item.kategori || '',
    unit: item.per_serving ? 'per_serving' : item.per_100ml ? 'per_100ml' : 'per_100g',
    kkal: per100.kkal || 0,
    protein_g: per100.protein_g || 0,
    karbo_g: per100.karbo_g || 0,
    lemak_g: per100.lemak_g || 0,
    serat_g: per100.serat_g || 0,
    gula_g: per100.gula_g || 0,
    lemak_jenuh_g: per100.lemak_jenuh_g || 0,
    lemak_trans_g: per100.lemak_trans_g || 0,
    lemak_mono_g: per100.lemak_mono_g || 0,
    lemak_poly_g: per100.lemak_poly_g || 0,
    harga_per_100: item.harga_per_100 || 0,
    mikro: Object.entries(item.mikro || {}).map(([key, value]) => ({ key, value }))
  }
}

// Nambah & edit bahan manual - bahan BUNDLED (dari ingredients.json) diedit
// sebagai override (bisa di-reset ke default), bahan BARU disimpen penuh
// (cuma bisa dihapus, gak ada "default" buat di-reset). Belum kepake di
// resep manapun sampe ada custom recipe builder - baru berguna PENUH abis itu,
// tapi ngedit bahan BUNDLED yang udah kepake resep langsung kerasa efeknya.
function BahanSection() {
  const [ingredients, setIngredients] = useState(() => getAllIngredients())
  const [editing, setEditing] = useState(null) // form object, null = list view
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [showArchived, setShowArchived] = useState(false)

  function refresh() {
    setIngredients(getAllIngredients())
    clearTotalsCache()
  }

  function openNew() {
    setEditing(emptyBahanForm())
  }

  function openEdit(item) {
    setEditing(ingredientToForm(item))
  }

  function updateField(field, value) {
    setEditing(prev => ({ ...prev, [field]: value }))
  }

  function updateMikroRow(idx, field, value) {
    setEditing(prev => {
      const mikro = [...prev.mikro]
      mikro[idx] = { ...mikro[idx], [field]: value }
      return { ...prev, mikro }
    })
  }

  function addMikroRow() {
    const usedKeys = editing.mikro.map(m => m.key)
    const nextKey = Object.keys(MIKRO_LABELS).find(k => !usedKeys.includes(k))
    if (!nextKey) return
    setEditing(prev => ({ ...prev, mikro: [...prev.mikro, { key: nextKey, value: 0 }] }))
  }

  function removeMikroRow(idx) {
    setEditing(prev => ({ ...prev, mikro: prev.mikro.filter((_, i) => i !== idx) }))
  }

  // `extra` dipake khusus buat nitip field `active` pas toggle arsip - gak
  // dipanggil dari form Simpan biasa, biar edit gizi/harga gak numpang
  // ngubah status arsip bahan tanpa sengaja (lihat komentar di
  // saveIngredient() kenapa itu bahaya).
  function buildPayload(extra = {}) {
    const id = editing.id || generateIngredientId(editing.nama)
    const per100 = {
      kkal: editing.kkal,
      protein_g: editing.protein_g,
      karbo_g: editing.karbo_g,
      lemak_g: editing.lemak_g,
      serat_g: editing.serat_g,
      gula_g: editing.gula_g,
      lemak_jenuh_g: editing.lemak_jenuh_g,
      lemak_trans_g: editing.lemak_trans_g,
      lemak_mono_g: editing.lemak_mono_g,
      lemak_poly_g: editing.lemak_poly_g
    }
    const mikro = Object.fromEntries(editing.mikro.map(m => [m.key, m.value]))
    return {
      id,
      nama: editing.nama.trim(),
      kategori: editing.kategori.trim(),
      per_100g: editing.unit === 'per_100g' ? per100 : undefined,
      per_100ml: editing.unit === 'per_100ml' ? per100 : undefined,
      per_serving: editing.unit === 'per_serving' ? per100 : undefined,
      harga_per_100: editing.harga_per_100,
      mikro,
      ...extra
    }
  }

  function handleSave() {
    if (!editing.nama.trim()) return
    saveIngredient(buildPayload())
    setEditing(null)
    refresh()
  }

  function handleToggleActive(currentlyActive) {
    saveIngredient(buildPayload({ active: !currentlyActive }))
    setEditing(null)
    refresh()
  }

  function handleReset(id) {
    resetIngredientOverride(id)
    setEditing(null)
    refresh()
  }

  function handleDelete(id) {
    deleteCustomIngredient(id)
    setConfirmDeleteId(null)
    setEditing(null)
    refresh()
  }

  if (editing) {
    const isNew = !editing.id
    const current = !isNew && ingredients.find(i => i.id === editing.id)
    const isBundled = !isNew && current?.isBundled
    const currentlyActive = isNew || isIngredientActive(current)

    return (
      <div className="section-card">
        <div className="recipe-detail-head">
          <button onClick={() => setEditing(null)}>←</button>
          <span className="rtitle">{isNew ? 'Tambah Bahan' : 'Edit Bahan'}</span>
        </div>

        <label className="field-row">
          Nama bahan
          <input type="text" value={editing.nama} onChange={e => updateField('nama', e.target.value)} />
        </label>
        <label className="field-row">
          Kategori
          <input type="text" value={editing.kategori} onChange={e => updateField('kategori', e.target.value)} placeholder="misal: protein-hewani, sayur, bumbu" />
        </label>
        <label className="field-row">
          Satuan dasar
          <select value={editing.unit} onChange={e => updateField('unit', e.target.value)}>
            <option value="per_100g">per 100 gram</option>
            <option value="per_100ml">per 100 ml (cairan)</option>
            <option value="per_serving">per 1 serving (misal: 1 butir/1 bungkus/1 sdm)</option>
          </select>
        </label>
        {editing.unit === 'per_serving' && (
          <p className="empty-note" style={{ marginBottom: 10 }}>
            Isi nilai gizi buat 1 serving (bukan per 100g/ml) — pas dipake di
            resep, jumlah yang diinput di kolom "Serving" tinggal dikaliin
            langsung ke angka ini.
          </p>
        )}

        <div className="macrogrid">
          <label className="field-row"><span>Kkal{editing.unit === 'per_serving' && ' /serving'}</span><input type="number" value={editing.kkal} onChange={e => updateField('kkal', parseFloat(e.target.value) || 0)} /></label>
          <label className="field-row"><span>Protein (g)</span><input type="number" value={editing.protein_g} onChange={e => updateField('protein_g', parseFloat(e.target.value) || 0)} /></label>
          <label className="field-row"><span>Karbo (g)</span><input type="number" value={editing.karbo_g} onChange={e => updateField('karbo_g', parseFloat(e.target.value) || 0)} /></label>
          <label className="field-row"><span>Lemak (g)</span><input type="number" value={editing.lemak_g} onChange={e => updateField('lemak_g', parseFloat(e.target.value) || 0)} /></label>
        </div>
        <label className="field-row">
          Serat (g)
          <input type="number" value={editing.serat_g} onChange={e => updateField('serat_g', parseFloat(e.target.value) || 0)} />
        </label>
        <label className="field-row">
          Gula (g, opsional - bagian dari Karbo di atas)
          <input type="number" value={editing.gula_g} onChange={e => updateField('gula_g', parseFloat(e.target.value) || 0)} />
        </label>

        <div className="cat-heading">Breakdown lemak (opsional)</div>
        <p className="empty-note" style={{ marginBottom: 10 }}>
          Isi kalau ada datanya - jumlahnya gak harus pas sama Lemak total di
          atas (boleh kurang kalau belum semua jenis lemaknya diketahui).
        </p>
        <div className="macrogrid">
          <label className="field-row"><span>Jenuh (g)</span><input type="number" value={editing.lemak_jenuh_g} onChange={e => updateField('lemak_jenuh_g', parseFloat(e.target.value) || 0)} /></label>
          <label className="field-row"><span>Trans (g)</span><input type="number" value={editing.lemak_trans_g} onChange={e => updateField('lemak_trans_g', parseFloat(e.target.value) || 0)} /></label>
          <label className="field-row"><span>Tak jenuh tunggal (g)</span><input type="number" value={editing.lemak_mono_g} onChange={e => updateField('lemak_mono_g', parseFloat(e.target.value) || 0)} /></label>
          <label className="field-row"><span>Tak jenuh ganda (g)</span><input type="number" value={editing.lemak_poly_g} onChange={e => updateField('lemak_poly_g', parseFloat(e.target.value) || 0)} /></label>
        </div>

        <label className="field-row">
          Harga per {editing.unit === 'per_serving' ? 'serving' : '100g/ml'} (Rp)
          <input type="number" value={editing.harga_per_100} onChange={e => updateField('harga_per_100', parseFloat(e.target.value) || 0)} />
        </label>

        <div className="cat-heading">Mikronutrien (opsional)</div>
        {editing.mikro.map((m, idx) => (
          <div className="price-row" key={idx}>
            <select value={m.key} onChange={e => updateMikroRow(idx, 'key', e.target.value)}>
              {Object.entries(MIKRO_LABELS).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <input type="number" value={m.value} onChange={e => updateMikroRow(idx, 'value', parseFloat(e.target.value) || 0)} />
            <button className="btn-secondary" onClick={() => removeMikroRow(idx)}>×</button>
          </div>
        ))}
        <button className="btn-secondary" onClick={addMikroRow} style={{ marginTop: 8, marginBottom: 16 }}>+ Tambah mikro</button>

        {!isNew && (
          <p className="empty-note" style={{ marginBottom: 10 }}>
            {currentlyActive
              ? 'Bahan aktif - muncul di pemilih bahan pas bikin resep.'
              : 'Bahan diarsipkan - disembunyiin dari pemilih bahan resep baru, tapi resep LAMA yang udah kepake bahan ini tetep kehitung normal.'}
          </p>
        )}

        <div className="meal-card-actions" style={{ border: 'none', paddingTop: 0, marginTop: 0 }}>
          <button className="btn-primary" onClick={handleSave}>Simpan</button>
          {!isNew && (
            <button className="btn-secondary" onClick={() => handleToggleActive(currentlyActive)}>
              {currentlyActive ? 'Arsipkan' : 'Aktifkan'}
            </button>
          )}
          {isBundled && <button className="btn-secondary" onClick={() => handleReset(editing.id)}>Reset ke default</button>}
          {!isNew && !isBundled && (
            confirmDeleteId === editing.id
              ? <button className="btn-secondary" onClick={() => handleDelete(editing.id)}>Yakin hapus?</button>
              : <button className="btn-secondary" onClick={() => setConfirmDeleteId(editing.id)}>Hapus</button>
          )}
        </div>
      </div>
    )
  }

  const activeIngredients = ingredients.filter(isIngredientActive)
  const archivedIngredients = ingredients.filter(i => !isIngredientActive(i))

  function renderRow(item) {
    return (
      <div className="recipe-row" key={item.id} onClick={() => openEdit(item)}>
        <span>{item.nama}{!item.isBundled && <span className="mikro-low"> · custom</span>}</span>
        <span className="recipe-row-right">
          <span className="recipe-meta">{(item.per_100g || item.per_100ml || item.per_serving || {}).kkal || 0} kkal{item.per_serving ? '/serving' : ''}</span>
          <span className="recipe-row-chevron">›</span>
        </span>
      </div>
    )
  }

  return (
    <div className="section-card">
      <div className="cat-heading">Database Bahan</div>
      <p className="empty-note" style={{ marginBottom: 10 }}>
        Tambah/edit gizi bahan manual. Bahan baru belum kepake di resep manapun
        sampe ada fitur custom recipe - ngedit bahan yang UDAH ada langsung
        ngaruh ke Resep & Belanja. Bahan yang diarsipkan gak ilang, cuma
        disembunyiin dari pemilih bahan resep baru - buat bahan yang gak lagi
        dibeli/dipake tapi masih mau disimpen datanya.
      </p>
      <button className="btn-primary" onClick={openNew} style={{ marginBottom: 12 }}>+ Tambah Bahan</button>
      {activeIngredients.map(renderRow)}

      {archivedIngredients.length > 0 && (
        <>
          <button className="btn-secondary" onClick={() => setShowArchived(v => !v)} style={{ marginTop: 12 }}>
            {showArchived ? 'Sembunyikan' : 'Lihat'} arsip ({archivedIngredients.length})
          </button>
          {showArchived && archivedIngredients.map(renderRow)}
        </>
      )}
    </div>
  )
}

export default function Profil() {
  return (
    <div className="page">
      <TargetSection />
      <HargaBahanSection />
      <BahanSection />
    </div>
  )
}
