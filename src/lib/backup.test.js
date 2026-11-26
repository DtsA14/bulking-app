import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AssertionError } from 'node:assert'

const SPEC = './backup.js'
const PREFIX = 'bulking-app:'

// A missing file must fail by an assertion of this test, never by an import error.
const NOT_FOUND = /Cannot find module|Failed to resolve import|Does the file exist|Failed to load url|ERR_MODULE_NOT_FOUND|ENOENT/i

async function load() {
  try {
    return await import(/* @vite-ignore */ SPEC)
  } catch (e) {
    if (NOT_FOUND.test(String(e && e.message))) return null
    throw Object.assign(new AssertionError({ message: `load() threw: ${e && e.message}` }), { cause: e })
  }
}

async function api() {
  const mod = await load()
  expect(mod, 'src/lib/backup.js must exist').not.toBeNull()
  return mod
}

function seed(key, raw) {
  localStorage.setItem(PREFIX + key, raw)
}

beforeEach(() => {
  localStorage.clear()
})

describe('exportLocalData', () => {
  it('exports every bulking-app key with the prefix stripped and the value parsed', async () => {
    const { exportLocalData } = await api()
    seed('profile', '{"umur":25}')
    seed('weight-logs', '[]')
    localStorage.setItem('other', 'x')

    const parsed = JSON.parse(exportLocalData())

    expect(parsed.data).toEqual({ profile: { umur: 25 }, 'weight-logs': [] })
    expect(Object.keys(parsed.data).sort()).toEqual(['profile', 'weight-logs'])
  })

  it('keeps the raw string when a stored value is not valid JSON', async () => {
    const { exportLocalData } = await api()
    seed('catatan', 'bukan json {')

    const parsed = JSON.parse(exportLocalData())

    expect(parsed.data.catatan).toBe('bukan json {')
  })

  it('exports an empty data object when there are no bulking-app keys', async () => {
    const { exportLocalData } = await api()
    localStorage.setItem('other', 'x')

    const parsed = JSON.parse(exportLocalData())

    expect(parsed.data).toEqual({})
    expect(Object.keys(parsed.data)).toEqual([])
  })

  it('writes the app name and an ISO timestamp, indented with two spaces', async () => {
    const { exportLocalData } = await api()
    seed('profile', '{"umur":25}')

    const text = exportLocalData()
    const parsed = JSON.parse(text)

    expect(parsed.app).toBe('bulking-app')
    expect(typeof parsed.exportedAt).toBe('string')
    expect(parsed.exportedAt).toBe(new Date(parsed.exportedAt).toISOString())
    expect(text).toContain('\n  "app"')
  })

  it('keeps a bulking-app:__proto__ key in data', async () => {
    const { exportLocalData } = await api()
    seed('__proto__', '{"a":1}')
    seed('profile', '{"umur":25}')

    const parsed = JSON.parse(exportLocalData())

    expect(Object.keys(parsed.data).sort()).toEqual(['__proto__', 'profile'])
    expect(parsed.data['__proto__']).toEqual({ a: 1 })
  })
})

describe('importLocalData', () => {
  it('throws File bukan JSON yang valid for text that is not JSON', async () => {
    const { importLocalData } = await api()

    expect(() => importLocalData('bukan json sama sekali')).toThrow('File bukan JSON yang valid')
  })

  it('throws File ini bukan backup bulking-app for a wrong app name', async () => {
    const { importLocalData } = await api()

    expect(() => importLocalData(JSON.stringify({ app: 'other', data: { profile: { umur: 25 } } }))).toThrow(
      'File ini bukan backup bulking-app'
    )
  })

  it('leaves existing keys untouched when the app name is wrong', async () => {
    const { importLocalData } = await api()
    seed('weight-logs', '[]')

    expect(() => importLocalData(JSON.stringify({ app: 'bulking-app-lain', data: { profile: { umur: 25 } } }))).toThrow(
      'File ini bukan backup bulking-app'
    )
    expect(localStorage.getItem(PREFIX + 'weight-logs')).toBe('[]')
    expect(localStorage.getItem(PREFIX + 'profile')).toBeNull()
  })

  it('throws Isi backup rusak when data is an array', async () => {
    const { importLocalData } = await api()

    expect(() => importLocalData(JSON.stringify({ app: 'bulking-app', data: [] }))).toThrow('Isi backup rusak')
  })

  it('throws Isi backup rusak when data is missing, null or not an object', async () => {
    const { importLocalData } = await api()

    expect(() => importLocalData(JSON.stringify({ app: 'bulking-app' }))).toThrow('Isi backup rusak')
    expect(() => importLocalData(JSON.stringify({ app: 'bulking-app', data: null }))).toThrow('Isi backup rusak')
    expect(() => importLocalData(JSON.stringify({ app: 'bulking-app', data: 'profile' }))).toThrow('Isi backup rusak')
  })

  it('leaves existing keys untouched when data is corrupt', async () => {
    const { importLocalData } = await api()
    seed('profile', '{"umur":25}')

    expect(() => importLocalData(JSON.stringify({ app: 'bulking-app', data: [] }))).toThrow('Isi backup rusak')
    expect(localStorage.getItem(PREFIX + 'profile')).toBe('{"umur":25}')
  })

  it('removes old bulking-app keys, writes the data entries and returns the count', async () => {
    const { importLocalData } = await api()
    seed('weight-logs', '[]')
    localStorage.setItem('other', 'x')

    const count = importLocalData(JSON.stringify({ app: 'bulking-app', data: { profile: { umur: 30 } } }))

    expect(count).toBe(1)
    expect(localStorage.getItem(PREFIX + 'profile')).toBe('{"umur":30}')
    expect(localStorage.getItem(PREFIX + 'weight-logs')).toBeNull()
    expect(localStorage.getItem('other')).toBe('x')
  })

  it('round trip restores the same data and returns the same count', async () => {
    const { exportLocalData, importLocalData } = await api()
    seed('profile', '{"umur":25}')
    seed('weight-logs', '[{"date":"2026-11-21","weight":71}]')

    const text = exportLocalData()
    localStorage.clear()

    const count = importLocalData(text)

    expect(count).toBe(2)
    expect(localStorage.getItem(PREFIX + 'profile')).toBe('{"umur":25}')
    expect(localStorage.getItem(PREFIX + 'weight-logs')).toBe('[{"date":"2026-11-21","weight":71}]')
    expect(JSON.parse(exportLocalData()).data).toEqual({
      profile: { umur: 25 },
      'weight-logs': [{ date: '2026-11-21', weight: 71 }]
    })
  })

  it('lets a localStorage write error propagate to the caller', async () => {
    const { importLocalData } = await api()
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('penyimpanan penuh')
    })
    try {
      expect(() => importLocalData(JSON.stringify({ app: 'bulking-app', data: { profile: { umur: 30 } } }))).toThrow(
        'penyimpanan penuh'
      )
    } finally {
      spy.mockRestore()
    }
  })
})
