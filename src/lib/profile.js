import { load } from './storage.js'

export const DEFAULT_PROFILE = {
  beratSekarang: 61,
  tinggiBadan: 173,
  targetBerat: 67,
  umur: 25,
  gender: 'L', // 'L' laki-laki, 'P' perempuan - dipake buat formula BMR Mifflin-St Jeor
  aktivitas: 'moderate', // 'sedentary' | 'moderate' | 'aktif'
  baselineKkal: 0, // 0 = auto-hitung dari BMR+aktivitas, isi manual buat override paksa
  pantangan: 'Ikan'
}

export function getProfile() {
  return load('profile', DEFAULT_PROFILE)
}
