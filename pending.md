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

Udah kekerjain (2026-09-11): refresh 14 dari 27 bahan langsung dari TKPI via
panganku.org (telur, tahu, tempe, nasi-matang, wortel, bayam, kacang-panjang,
pisang, susu-full-cream, yogurt, selai-kacang, minyak-wijen, madu,
bawang-putih) — macro/serat lebih akurat + 2 mikro baru (`natrium_mg`,
`tembaga_mg`, sengaja gak dikasih target %AKG). 4 bahan (ayam-fillet,
daging-sapi-has, kentang, keju-parut) SENGAJA di-skip karena entry TKPI-nya
beda potongan/bentuk dari definisi resep kita (lihat follow-up di bawah).

Udah kekerjain (2026-09-11, lanjutan): refresh 10 bahan lagi lewat **USDA
FoodData Central API** (bukan scrape lagi, API resmi) — `ayam-fillet`
(chicken breast skinless raw), `daging-sapi-has` (beef tenderloin raw),
`kentang` (potato baked flesh & skin - angka lama ternyata emang udah persis
USDA, cuma nambah mikro), `keju-parut` (cheddar cheese), `oat-instan`
(instant oats - zat besi TETEP pake angka lama, USDA-nya kefortifikasi
ekstrem/24.7mg per 100g gak representatif buat oat generik), `brokoli`,
`paprika`, `kecap-asin` (soy sauce tamari), `saus-tiram` (oyster sauce -
turun jauh dari 143→51 kkal, worth dicek), `granola`, `whey-protein`.
Keputusan sourcing baru: **USDA jadi default**, TKPI cuma fallback buat
bahan yang gak ada padanan internasional ATAU beda spesies/bentuk dari versi
Barat-nya.

Udah kekerjain (2026-09-11, cross-check): 14 bahan yang di-refresh dari TKPI
di-cross-check balik ke USDA. Hasilnya: `nasi-matang` di-**revert ke USDA**
(180→130 kkal - TKPI-nya ternyata kegedean, USDA cocok sama angka cooked
rice standar yang dikenal luas). `bayam` & `tahu` dikonfirmasi TETEP TKPI
(USDA "spinach"/"firm tofu" itu beda spesies/produk, bukan padanan yang
valid). `selai-kacang` & `minyak-wijen` dikonfirmasi konsisten di kedua
sumber (gak ada perubahan). `susu-full-cream` gagal di-cross-check (query
USDA "milk whole" nyasar ke hasil keju, belum di-retry).

## Follow-up — belum dikerjain
- **`susu-full-cream` belum sempet di-cross-check ke USDA** — query pertama
  ("milk whole") salah nangkep hasil keju (mozzarella/ricotta). Perlu query
  ulang lebih spesifik ("milk, whole, 3.25% milkfat") kalau mau divalidasi.
- **`roti-gandum` belum di-refresh** — kandidat USDA yang ketemu (pita bread,
  vienna whole wheat) protein/karbonya beda jauh dari roti tawar biasa,
  sengaja di-skip daripada maksa. Butuh query USDA yang lebih spesifik
  ("bread, whole wheat, sliced" atau merek tertentu).
- **`kecap-manis` masih estimasi lama** — gak ada di USDA (soy sauce generik
  beda komposisi) maupun ketemu di TKPI pas scrape kemarin. Kandidat buat
  dicari manual dari sumber lain (misal nutrition label produk ABC/Bango).

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
