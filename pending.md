# Pending / Next Steps

Hal-hal yang udah dibahas tapi sengaja BELUM dikerjain — biar scope tiap iterasi
tetep jelas. Urutan bukan prioritas, tinggal diambil kapan relevan.

## #8 — Generate resep dari bahan (arah kebalikan dari Belanja)
Alur: user masukin bahan yang ada di rumah → sistem/AI nyari atau bikinin resep
baru dari situ, termasuk cooking direction yang belum pernah ada di database.

Baru kepake pas udah mulai rajin masak & eksplor menu — BUKAN buat alur harian,
karena keseluruhan desain app ini fokusnya "zero decision-making" (masalah awal:
males/skip makan). Nambah step "mikirin bahan apa yang ada" nambah friksi, bukan
ngurangin.

Kalau dikerjain nanti:
- Resep kurasi manual tetep jadi default/fallback
- Fitur ini jadi mode opsional terpisah, bukan jalur utama
- Bisa reuse pattern AI chat layer yang udah ada di Know Your Worth (Anthropic API
  via serverless proxy) — prompt: "resep pake bahan X,Y,Z, protein tinggi, no ikan"
- Gizi tetep dihitung dari `ingredients-db.json` (akurat), AI cuma nentuin
  kombinasi & cara masak

## Dari audit eksternal (2026-09) — belum dikerjain
1 poin dari audit yang sengaja ditahan (bukan kelewat):

- **Schema ingredient belum future-proof** — `per_100g`/`per_100ml`/`harga_per_100`
  udah oke buat sekarang, tapi kalau nanti ada custom recipe atau price tracking,
  bakal butuh metadata tambahan: raw vs cooked, edible portion, package size, brand.
  Database sekarang nyampur ayam mentah, nasi matang, kentang panggang dalam satu
  asumsi "siap pakai" — belum masalah di skala sekarang, tapi rawan jadi sumber
  error kalau database membesar
- **Breakdown gizi granular** (dari referensi app tracking makanan lain, 2026-09) —
  `lemak_g` sekarang cuma total, belum dipecah saturated/trans/mono/poly-unsaturated;
  `karbo_g` juga belum dipecah sugar vs fiber (serat udah ada terpisah, tapi sugar
  belum). Butuh re-sourcing data per bahan dari USDA/TKPI, bukan cuma nambah field
  kosong. Baru krusial kalau mau nilai kualitas lemak/gula, bukan cuma kuantitas

Udah kekerjain (2026-09-09): pantangan filter resep, `getRecipeTotals()`/
`getBoosterTotals()` caching (invalidate manual lewat `clearTotalsCache()` pas
harga bahan diedit), error handling storage (toast lewat custom event
`bulking-app:storage-error`), PWA setup (manifest + service worker via
`vite-plugin-pwa`), demo-seed histori Belanja (3 hari kebelakang, sekali doang
lewat flag `demo-seed-done`), Profile jadi Target Engine (`lib/targetEngine.js`
— adaptive TDEE dari histori 14 hari + tren berat, fallback ke cold-start
Mifflin-St Jeor BMR + level aktivitas [3 mode] + surplus kalau histori belum
cukup, override manual opsional, rekomendasi booster otomatis di Hari Ini),
makro lengkap + mikronutrien harian di Hari Ini (agregat otomatis dari
`calcTotals()`, %AKG per mikro pake acuan Permenkes 28/2019 dewasa laki-laki
19-29 th, 6 mikro esensial default + toggle lihat semua, sort ascending by
%AKG), Profil nambah field umur/gender/level aktivitas.

## Bug/gap yang diketahui — belum dibenerin
- **`beratSekarang` di Profil gak sinkron sama histori berat di Progress** —
  keduanya disimpen di key storage terpisah (`profile` vs `weight-logs`) dan
  gak saling update. Akibatnya target protein/lemak (g/kg) & BMR di Target
  Engine bisa ngitung pake berat badan yang udah basi kalau user rajin nyatet
  progress di tab Progress tapi lupa update field Profil manual. Fix-nya:
  `getMacroTargets()`/`calcMifflinTarget()` harusnya ambil entry TERBARU dari
  `weight-logs` (fallback ke `profile.beratSekarang` kalau histori kosong).

## Design critique (dari sesi lain, 2026-09-10) — udah dikerjain (2026-09-10)
App-nya functionally kuat tapi sebelumnya visualnya masih "data mentah dalam
kartu beige" - semua kartu/tombol pake bobot & warna yang sama. Fix:

- **Button hierarchy** — `.btn-primary` (filled, dipake buat "Tambah" di nudge
  booster & "Catat" di Progress) vs `.btn-secondary` (ghost, buat Ganti/+ Menu/
  + Booster/toggle) di `styles.css`
- **Color-coding by purpose** — `.nudge-box` (aksen amber) buat rekomendasi
  booster actionable, beda dari `.suggestion-box`/tan buat data pasif
- **Tap affordance Resep** — chevron `›` + hover state di `recipe-row`
- **Struktur section Profil** — dibagi jadi `.section-card` terpisah (Data
  diri / Target kalori / Pantangan / Harga bahan), bukan 1 form panjang flat
- Nesting "+ Menu"/"+ Booster" jadi footer row DI DALAM `.meal-card` yang sama
  kayak "Ganti" (bukan floating terpisah)
- Kontras label "target X" di macro grid dinaikin lewat span `.target` terpisah
- Disclaimer panjang (metodologi target, caveat mikro) pake kelas `.disclaimer`
  non-italic, bukan `.empty-note` italic

## Lainnya (dari diskusi awal, belum dieksekusi)
- **Custom recipe builder** — user nambah resep sendiri, bukan cuma yang di-hardcode
- **Reminder/notifikasi jam makan** — relevan karena masalah utama user emang
  sering skip makan
- **Migrasi ke backend** (Supabase, kayak kemungkinan besar KYW) — kalau butuh
  akses dari HP + laptop sekaligus, bukan cuma localStorage
