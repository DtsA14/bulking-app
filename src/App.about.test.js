import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AssertionError } from 'node:assert'
import * as React from 'react'
import { createRoot } from 'react-dom/client'
import pkg from '../package.json'

// Specifiers kept as constants: a missing module must fail by an expect() of this
// test, never by an import error of the file.
const APP_SPEC = './App.jsx'
const TENTANG_SPEC = './pages/Tentang.jsx'
const NOT_FOUND = /Cannot find module|Failed to resolve import|Does the file exist|Failed to load url|ERR_MODULE_NOT_FOUND|ENOENT/i
const CONFIRM_TEXT = 'Impor akan MENGGANTI semua data yang ada sekarang. Lanjut?'

// The app's own files use JSX without importing React (the app's vite build adds
// the react plugin); under vitest the classic transform looks React up on the
// global object, so provide it before importing any of them.
globalThis.React = React
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const ACT = typeof React.act === 'function' ? React.act : null

let mounted = []

async function loadModule(spec) {
  try {
    return await import(/* @vite-ignore */ spec)
  } catch (e) {
    if (NOT_FOUND.test(String(e && e.message))) return null
    throw Object.assign(new AssertionError({ message: `load(${spec}) threw: ${e && e.message}` }), { cause: e })
  }
}

async function loadApp() {
  const mod = await loadModule(APP_SPEC)
  expect(mod, 'src/App.jsx must exist').not.toBeNull()
  return mod
}

async function loadTentang() {
  const mod = await loadModule(TENTANG_SPEC)
  expect(mod, 'src/pages/Tentang.jsx must exist').not.toBeNull()
  return mod
}

function textOf(node) {
  return (node && node.textContent) || ''
}

function headerText(container) {
  return textOf(container.querySelector('.app-header'))
}

function findButton(root, label) {
  const buttons = Array.from(root.querySelectorAll('button'))
  return buttons.find(b => textOf(b).includes(label)) || null
}

function findNav(root, label) {
  const items = Array.from(root.querySelectorAll('.nav-item'))
  return items.find(i => textOf(i).includes(label)) || null
}

async function flush() {
  for (let i = 0; i < 5; i += 1) {
    await new Promise(resolve => setTimeout(resolve, 0))
  }
}

// Runs a DOM interaction and lets any promise chain started by the handler finish.
async function run(fn) {
  if (ACT) {
    await ACT(async () => {
      fn()
      await flush()
    })
  } else {
    fn()
    await flush()
  }
}

async function render(element) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  mounted.push({ container, root })
  if (ACT) {
    await ACT(async () => { root.render(element) })
  } else {
    root.render(element)
    await flush()
  }
  return { container, root }
}

async function openAbout(container) {
  const gear = container.querySelector('[aria-label="Pengaturan"]')
  expect(gear, 'a gear button with aria-label Pengaturan must be in the header').not.toBeNull()
  await run(() => gear.click())
  return gear
}

async function chooseFile(container, text) {
  const importButton = findButton(container, 'Impor data')
  expect(importButton, 'an Impor data button must be on the Tentang page').not.toBeNull()
  await run(() => importButton.click())

  const input = container.querySelector('input[type="file"]')
  expect(input, 'a file input must exist after clicking Impor data').not.toBeNull()

  const file = { name: 'backup.json', text: () => Promise.resolve(text) }
  Object.defineProperty(input, 'files', { configurable: true, value: [file] })
  await run(() => { input.dispatchEvent(new Event('change', { bubbles: true })) })
  return input
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(async () => {
  while (mounted.length > 0) {
    const { container, root } = mounted.pop()
    if (ACT) {
      await ACT(async () => { root.unmount() })
    } else {
      root.unmount()
    }
    container.remove()
  }
  vi.restoreAllMocks()
})

describe('header', () => {
  it('shows a gear button labelled Pengaturan and keeps the five bottom-nav tabs', async () => {
    const { default: App } = await loadApp()
    const { container } = await render(React.createElement(App))

    const headerRow = container.querySelector('.app-header-row')
    expect(headerRow, 'the header must render a .app-header-row').not.toBeNull()

    const gear = container.querySelector('[aria-label="Pengaturan"]')
    expect(gear, 'a gear button with aria-label Pengaturan must be in the header').not.toBeNull()
    expect(gear.tagName).toBe('BUTTON')
    expect(gear.classList.contains('app-header-btn')).toBe(true)
    expect(headerRow.contains(gear)).toBe(true)
    expect(gear.querySelector('svg')).not.toBeNull()
    expect(gear.querySelector('svg circle[cx="12"][cy="12"][r="3"]')).not.toBeNull()

    const navLabels = Array.from(container.querySelectorAll('.nav-item')).map(n => textOf(n).trim())
    expect(navLabels).toEqual(['Hari Ini', 'Resep', 'Progress', 'Belanja', 'Profil'])
    expect(headerText(container)).toContain('Hari Ini')
  })

  it('opens Tentang from the gear with a Kembali button instead of the gear', async () => {
    const { default: App } = await loadApp()
    const { container } = await render(React.createElement(App))

    await openAbout(container)

    expect(headerText(container)).toContain('Tentang')

    const back = container.querySelector('[aria-label="Kembali"]')
    expect(back, 'a back button with aria-label Kembali must be in the header').not.toBeNull()
    expect(textOf(back)).toContain('Kembali')
    expect(back.classList.contains('app-header-btn')).toBe(true)

    expect(container.querySelector('[aria-label="Pengaturan"]')).toBeNull()

    const main = container.querySelector('.app-content')
    expect(main, 'the app must keep a .app-content main area').not.toBeNull()
    expect(textOf(main)).toContain(`Versi ${pkg.version}`)
    expect(textOf(main)).toContain('Penyimpanan data')
  })

  it('goes back to the active tab page when Kembali is clicked', async () => {
    const { default: App } = await loadApp()
    const { container } = await render(React.createElement(App))

    await openAbout(container)

    const back = container.querySelector('[aria-label="Kembali"]')
    expect(back, 'a back button with aria-label Kembali must be in the header').not.toBeNull()
    await run(() => back.click())

    expect(headerText(container)).toContain('Hari Ini')
    expect(headerText(container)).not.toContain('Tentang')
    expect(container.querySelector('[aria-label="Pengaturan"]')).not.toBeNull()
    expect(textOf(container.querySelector('.app-content'))).not.toContain('Penyimpanan data')
  })

  it('closes Tentang when a bottom-nav tab is clicked', async () => {
    const { default: App } = await loadApp()
    const { container } = await render(React.createElement(App))

    await openAbout(container)

    const navItem = findNav(container, 'Resep')
    expect(navItem, 'the Resep bottom-nav tab must exist').not.toBeNull()
    await run(() => navItem.click())

    expect(headerText(container)).toContain('Resep')
    expect(headerText(container)).not.toContain('Tentang')
    expect(textOf(container.querySelector('.app-content'))).not.toContain('Penyimpanan data')
  })
})

describe('Tentang', () => {
  it('shows the app version, the storage explanation and the data buttons', async () => {
    const mod = await loadTentang()
    expect(typeof mod.default).toBe('function')

    const { container } = await render(React.createElement(mod.default))
    const text = textOf(container)

    expect(container.querySelector('.page'), 'the Tentang root must be a .page div').not.toBeNull()
    expect(container.querySelectorAll('.section-card').length).toBeGreaterThan(0)
    expect(text).toContain(`Versi ${pkg.version}`)
    expect(text).toContain('Penyimpanan data')
    expect(text.toLowerCase()).toContain('localstorage')
    expect(/server|internet/i.test(text)).toBe(true)
    expect(findButton(container, 'Ekspor data'), 'an Ekspor data button must be on the page').not.toBeNull()
    expect(findButton(container, 'Impor data'), 'an Impor data button must be on the page').not.toBeNull()
  })

  it('downloads a dated json backup and revokes the object url', async () => {
    const mod = await loadTentang()

    const blobs = []
    const createObjectURL = vi.fn(blob => {
      blobs.push(blob)
      return 'blob:bulking-test'
    })
    const revokeObjectURL = vi.fn()
    const originalCreate = URL.createObjectURL
    const originalRevoke = URL.revokeObjectURL
    URL.createObjectURL = createObjectURL
    URL.revokeObjectURL = revokeObjectURL

    const downloads = []
    const record = name => {
      if (typeof name === 'string' && name.endsWith('.json') && !downloads.some(d => d.download === name)) {
        downloads.push({ download: name })
      }
    }
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
      record(this.getAttribute('download'))
    })
    const onDocumentClick = event => {
      const target = event.target
      if (target && target.tagName === 'A') record(target.getAttribute('download'))
      event.preventDefault()
    }
    document.addEventListener('click', onDocumentClick, true)

    try {
      localStorage.setItem('bulking-app:profile', '{"umur":25}')
      const { container } = await render(React.createElement(mod.default))

      const button = findButton(container, 'Ekspor data')
      expect(button, 'an Ekspor data button must be on the page').not.toBeNull()
      await run(() => button.click())

      const now = new Date()
      const pad = n => String(n).padStart(2, '0')
      const expectedName = `bulking-app-backup-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`

      expect(createObjectURL).toHaveBeenCalledTimes(1)
      expect(blobs[0]).toBeInstanceOf(Blob)
      expect(blobs[0].type).toBe('application/json')
      expect(downloads.map(d => d.download)).toEqual([expectedName])
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:bulking-test')
    } finally {
      document.removeEventListener('click', onDocumentClick, true)
      clickSpy.mockRestore()
      if (originalCreate) URL.createObjectURL = originalCreate
      else delete URL.createObjectURL
      if (originalRevoke) URL.revokeObjectURL = originalRevoke
      else delete URL.revokeObjectURL
    }
  })

  it('shows the import error message when the file is not a bulking-app backup', async () => {
    const mod = await loadTentang()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    const { container } = await render(React.createElement(mod.default))
    localStorage.clear()

    const input = await chooseFile(container, JSON.stringify({ app: 'other', data: { profile: { umur: 25 } } }))

    expect(input.getAttribute('accept') || '').toContain('.json')
    expect(confirmSpy).toHaveBeenCalled()
    expect(textOf(container)).toContain('File ini bukan backup bulking-app')
    expect(localStorage.getItem('bulking-app:profile')).toBeNull()
  })

  it('does nothing when the import confirmation is cancelled', async () => {
    const mod = await loadTentang()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)

    const { container } = await render(React.createElement(mod.default))
    localStorage.clear()
    localStorage.setItem('bulking-app:profile', '{"umur":25}')

    await chooseFile(container, JSON.stringify({ app: 'bulking-app', data: { profile: { umur: 30 } } }))

    expect(confirmSpy).toHaveBeenCalledWith(CONFIRM_TEXT)
    expect(localStorage.getItem('bulking-app:profile')).toBe('{"umur":25}')
    expect(textOf(container)).not.toContain('File ini bukan backup bulking-app')
  })
})
