// Zero-dependency helpers for @allis-plugin/create-dsh.
// All output/errors are bilingual-friendly; code comments stay English.
import { spawn } from 'node:child_process'
import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { constants as FSC } from 'node:fs'
import { dirname } from 'node:path'

export const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
}
export const paint = (color, text) => `${color}${text}${c.reset}`
export const ok = (t) => paint(c.green, t)
export const warn = (t) => paint(c.yellow, t)
export const err = (t) => paint(c.red, t)
export const info = (t) => paint(c.cyan, t)

export async function exists(p) {
  try { await access(p, FSC.F_OK); return true } catch { return false }
}

// Spawn a command, capture stdout+stderr, never throw. Returns
// { code, stdout, stderr } with code === -1 on spawn failure.
export function run(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], ...opts })
    let out = ''
    let errout = ''
    child.stdout.on('data', (d) => { out += d })
    child.stderr.on('data', (d) => { errout += d })
    child.on('error', (e) => resolve({ code: -1, stdout: out, stderr: String(e) }))
    child.on('close', (code) => resolve({ code, stdout: out, stderr: errout }))
  })
}

export function which(cmd) {
  return run(process.platform === 'win32' ? 'where' : 'which', [cmd])
    .then((r) => r.code === 0 && r.stdout.trim().length > 0 ? r.stdout.trim().split(/\r?\n/)[0] : null)
}

/** Versions shipped with this scaffold, used when no local dsh is detectable. */
const BUNDLED_VERSIONS = {
  dsh: '0.1.0-rc.7',
  dshTools: '0.1.0-rc.7',
  dshSession: '0.1.0-rc.7',
  cordis: '4.0.1',
  schemastery: '3.18.1',
}

/** The installed launcher's version, or `null` when dsh is absent or unreadable. */
async function detectInstalledDsh() {
  if (!await which('dsh')) return null
  const r = await run('dsh', ['--version'], { timeout: 15000 })
  if (r.code !== 0) return null
  const m = r.stdout.match(/\d+\.\d+\.\d+(?:-[0-9A-Za-z.]+)?/)
  return m ? m[0] : null
}

/**
 * Decide which `@deepseek-ai/*` versions a generated project pins.
 *
 * A plugin binds at RUNTIME to the copies inside the user's installed dsh, so
 * the types it compiles against must be that same version line, or the project
 * type-checks against one API and runs against another. We read the local
 * launcher (`dsh --version`) and pin the line it reports; every `dsh-*` package
 * moves as one line, so one probe fixes them all.
 *
 * Nothing here touches the network. Querying npm instead would reintroduce the
 * trap this scaffold exists to avoid: `@deepseek-ai/dsh-tools`'s `latest`
 * dist-tag is a stale 0.0.1-rc.1, and even the correct `next` tag can name a
 * line the user's installed dsh does not run.
 *
 * @returns the five versions plus `source`: `'installed'` when probed from the
 *   local dsh, `'bundled'` when it fell back to the shipped pins.
 */
export async function resolveDshVersions() {
  const detected = await detectInstalledDsh()
  if (!detected) return { ...BUNDLED_VERSIONS, source: 'bundled' }
  return { ...BUNDLED_VERSIONS, dsh: detected, dshTools: detected, dshSession: detected, source: 'installed' }
}

/**
 * Spawn a long-running command, collect its output for `ms`, then kill it.
 * Used to boot a profile: the launcher never exits on its own, so "it ran for
 * N seconds without collapsing" is the observation we want.
 * @returns { output, killed } — `killed` false means it exited early on its own.
 */
export function runBounded(cmd, args, opts = {}, ms = 12000) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], ...opts })
    let out = ''
    const collect = (d) => { out += d }
    child.stdout.on('data', collect)
    child.stderr.on('data', collect)
    const timer = setTimeout(() => { child.kill('SIGKILL') }, ms)
    child.on('error', (e) => { clearTimeout(timer); resolve({ output: out + String(e), killed: false }) })
    child.on('close', (_code, signal) => { clearTimeout(timer); resolve({ output: out, killed: signal === 'SIGKILL' }) })
  })
}

export async function writeFileDeep(file, content) {
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, content, 'utf8')
}

export async function readText(file) {
  return readFile(file, 'utf8')
}
