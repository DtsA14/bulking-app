import { load } from './storage.js'

export const DEFAULT_PROFILE = {
  beratSekarang: 61,
  tinggiBadan: 173,
  targetBerat: 67,
  baselineKkal: 2400,
  pantangan: 'Ikan'
}

export function getProfile() {
  return load('profile', DEFAULT_PROFILE)
}
