import { useState, useEffect } from 'react'
import { RECIPES, BOOSTERS, SLOTS, DEFAULT_SCHEDULE, findRecipe, findBooster, getRecipeTotals, getBoosterTotals, recipeMatchesPantangan } from '../data/recipes.js'
import { dateKey, loadDaySchedule, saveDaySchedule } from '../lib/schedule.js'
import { getProfile } from '../lib/profile.js'
import { getCalorieTarget, getMacroTargets, recommendBooster } from '../lib/targetEngine.js'
import { mikroLabel, mikroUnit, mikroPercentAkg, ESSENTIAL_MIKRO_KEYS } from '../lib/nutrition.js'

function addMikro(acc, mikro) {
  Object.entries(mikro).forEach(([key, val]) => {
    acc[key] = Math.round(((acc[key] || 0) + val) * 10) / 10
  })
}

const RECOMMEND_TO_SLOT = 'malam'

const today = dateKey()

export default function HariIni() {
  const [schedule, setSchedule] = useState(() => loadDaySchedule(today, DEFAULT_SCHEDULE))
  const [openPicker, setOpenPicker] = useState(null) // { slotId, type: 'menu' | 'booster' }
  const [showAllMikro, setShowAllMikro] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const profile = getProfile()
  const pantangan = profile.pantangan

  useEffect(() => {
    saveDaySchedule(today, schedule)
  }, [schedule])

  const totals = SLOTS.reduce(
    (acc, slot) => {
      const s = schedule[slot.id]
      const r = findRecipe(s.recipeId)
      if (r) {
        const t = getRecipeTotals(r)
        acc.kkal += t.kkal
        acc.protein += t.protein
        acc.karbo += t.karbo
        acc.lemak += t.lemak
        acc.serat += t.serat
        addMikro(acc.mikro, t.mikro)
      }
      s.boosters.forEach(b => {
        const booster = findBooster(b.boosterId)
        if (booster) {
          const bt = getBoosterTotals(booster)
          acc.kkal += bt.kkal
          acc.protein += bt.protein
          acc.karbo += bt.karbo
          acc.lemak += bt.lemak
          acc.serat += bt.serat
          addMikro(acc.mikro, bt.mikro)
        }
      })
      return acc
    },
    { kkal: 0, protein: 0, karbo: 0, lemak: 0, serat: 0, mikro: {} }
  )

  const targetInfo = getCalorieTarget()
  const remaining = targetInfo.target - totals.kkal
  const recommended = remaining > 0 ? recommendBooster(remaining) : null
  const macroTargets = getMacroTargets(targetInfo.target, profile.beratSekarang)

  function pickRecipe(slotId, recipeId) {
    setSchedule(prev => ({ ...prev, [slotId]: { ...prev[slotId], recipeId } }))
    setOpenPicker(null)
  }

  function addBooster(slotId, boosterId) {
    setSchedule(prev => ({
      ...prev,
      [slotId]: {
        ...prev[slotId],
        boosters: [...prev[slotId].boosters, { boosterId, uid: crypto.randomUUID() }]
      }
    }))
    setOpenPicker(null)
  }

  function removeBooster(slotId, uid) {
    setSchedule(prev => ({
      ...prev,
      [slotId]: { ...prev[slotId], boosters: prev[slotId].boosters.filter(b => b.uid !== uid) }
    }))
  }

  return (
    <div className="page">
      <div className="summary-bar">
        <div className="summary-item">
          <div className="summary-val">{totals.kkal}</div>
          <div className="summary-lbl">total kkal hari ini</div>
        </div>
        <div className="summary-item">
          <div className="summary-val">{remaining > 0 ? `-${remaining}` : `+${-remaining}`}</div>
          <div className="summary-lbl">{remaining > 0 ? 'kurang dari target' : 'di atas target'} ({targetInfo.target})</div>
        </div>
      </div>
      <p className="empty-note" style={{ marginTop: -10, marginBottom: 16 }}>
        Target {
          targetInfo.mode === 'adaptive' ? 'berdasarkan tren 14 hari terakhir'
          : targetInfo.mode === 'manual' ? 'override manual dari Profil'
          : 'estimasi awal (BMR + aktivitas)'
        }
      </p>

      {recommended && (
        <div className="nudge-box">
          Masih kurang ~{remaining} kkal dari target. Coba tambah{' '}
          <strong>{recommended.name}</strong> (+{getBoosterTotals(recommended).kkal} kkal)
          <br />
          <button className="btn-primary" onClick={() => addBooster(RECOMMEND_TO_SLOT, recommended.id)}>Tambah</button>
        </div>
      )}

      <button className="btn-secondary" onClick={() => setShowDetail(v => !v)} style={{ marginBottom: 16 }}>
        {showDetail ? 'Sembunyikan' : 'Lihat'} detail gizi (makro & mikro)
      </button>

      {showDetail && (
        <>
          <div className="cat-heading">Makro hari ini</div>
          <div className="macrogrid">
            <div className="mcell"><div className="v">{totals.kkal}</div><div className="l">kkal <span className="target">· target {targetInfo.target}</span></div></div>
            <div className="mcell"><div className="v">{totals.protein}g</div><div className="l">protein <span className="target">· target {macroTargets.protein}g</span></div></div>
            <div className="mcell"><div className="v">{Math.round(totals.karbo)}g</div><div className="l">karbo <span className="target">· target {macroTargets.karbo}g</span></div></div>
            <div className="mcell"><div className="v">{Math.round(totals.lemak)}g</div><div className="l">lemak <span className="target">· target {macroTargets.fat}g</span></div></div>
          </div>
          <div className="field-row no-gap"><span>Serat</span><span>{Math.round(totals.serat)}g</span></div>

          {Object.keys(totals.mikro).length > 0 && (() => {
            // Sort ascending by %AKG - yang paling kurang muncul duluan, biar
            // gak perlu nyisir semua baris buat nemu yang paling perlu dikejar.
            const byPct = ([keyA, valA], [keyB, valB]) =>
              (mikroPercentAkg(keyA, valA) ?? 0) - (mikroPercentAkg(keyB, valB) ?? 0)

            const essential = ESSENTIAL_MIKRO_KEYS
              .filter(key => key in totals.mikro)
              .map(key => [key, totals.mikro[key]])
              .sort(byPct)
            const rest = Object.entries(totals.mikro)
              .filter(([key]) => !ESSENTIAL_MIKRO_KEYS.includes(key))
              .sort(byPct)

            const renderRow = ([key, val]) => {
              const pct = mikroPercentAkg(key, val)
              const low = pct !== null && pct < 50
              return (
                <div className="field-row no-gap" key={key}>
                  <span>{mikroLabel(key)}</span>
                  <span className={low ? 'mikro-low' : ''}>
                    {val}{mikroUnit(key)}{pct !== null && ` · ${pct}% AKG`}
                  </span>
                </div>
              )
            }

            return (
              <>
                <div className="cat-heading">Mikronutrien hari ini</div>
                {essential.map(renderRow)}

                {rest.length > 0 && (
                  <>
                    <button className="btn-secondary" onClick={() => setShowAllMikro(v => !v)} style={{ marginTop: 8 }}>
                      {showAllMikro ? 'Sembunyikan' : 'Lihat semua'} mikronutrien
                    </button>
                    {showAllMikro && rest.map(renderRow)}
                  </>
                )}
              </>
            )
          })()}

          <p className="disclaimer">
            Target protein & lemak dari berat badan (2.0g/kg & 1.0g/kg, standar lean
            bulk), karbo ngisi sisa kalori target. Mikronutrien cuma yang ada
            datanya di database bahan — bukan daftar lengkap kebutuhan harian.
            %AKG pake acuan dewasa laki-laki 19-29 tahun (Permenkes 28/2019),
            belum disesuaikan per orang. Yang ditandai merah masih di bawah 50% AKG.
          </p>
        </>
      )}

      {SLOTS.map(slot => {
        const s = schedule[slot.id]
        const r = findRecipe(s.recipeId)
        const isMenuOpen = openPicker?.slotId === slot.id && openPicker?.type === 'menu'
        const isBoosterOpen = openPicker?.slotId === slot.id && openPicker?.type === 'booster'

        return (
          <div className="slot" key={slot.id}>
            <div className="slot-head">
              <span className="slot-time">{slot.time}</span>
              <span className="slot-name">{slot.name}</span>
            </div>

            <div className="meal-card">
              {r ? (
                <div className="meal-card-main">
                  <div>
                    <div className="sc-name">{r.name}</div>
                    <div className="sc-macro">{getRecipeTotals(r).kkal} kkal · {getRecipeTotals(r).protein}g protein</div>
                  </div>
                  <button className="btn-secondary" onClick={() => setOpenPicker({ slotId: slot.id, type: 'menu' })}>Ganti</button>
                </div>
              ) : (
                <div className="meal-card-main empty">Belum pilih menu</div>
              )}

              {s.boosters.length > 0 && (
                <div className="booster-chips">
                  {s.boosters.map(b => {
                    const booster = findBooster(b.boosterId)
                    return (
                      <span className="chip" key={b.uid}>
                        {booster.name} (+{getBoosterTotals(booster).kkal})
                        <button onClick={() => removeBooster(slot.id, b.uid)}>×</button>
                      </span>
                    )
                  })}
                </div>
              )}

              <div className="meal-card-actions">
                <button className="btn-secondary" onClick={() => setOpenPicker(isMenuOpen ? null : { slotId: slot.id, type: 'menu' })}>+ Menu</button>
                <button className="btn-secondary" onClick={() => setOpenPicker(isBoosterOpen ? null : { slotId: slot.id, type: 'booster' })}>+ Booster</button>
              </div>
            </div>

            {isMenuOpen && (
              <div className="picker">
                {RECIPES.filter(rc => rc.cat === slot.cat && !recipeMatchesPantangan(rc, pantangan)).map(rc => (
                  <div className="picker-opt" key={rc.id} onClick={() => pickRecipe(slot.id, rc.id)}>
                    <span>{rc.name}</span>
                    <span className="picker-macro">{getRecipeTotals(rc).kkal} kkal</span>
                  </div>
                ))}
              </div>
            )}

            {isBoosterOpen && (
              <div className="picker">
                {BOOSTERS.map(b => (
                  <div className="picker-opt" key={b.id} onClick={() => addBooster(slot.id, b.id)}>
                    <span>{b.name}</span>
                    <span className="picker-macro">+{getBoosterTotals(b).kkal} kkal</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
