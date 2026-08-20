// Structural checks over every template, plus an optional real build.
//
// `npm test` runs the structural half only: it needs no network, so it stays
// usable offline and as a pre-commit gate. Set SMOKE_BUILD=1 to additionally
// install and compile each generated project, which is what CI does.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const cli = join(root, 'src', 'cli.js')
const { TEMPLATES } = await import(join(root, 'src', 'templates.js'))
const buildToo = process.env.SMOKE_BUILD === '1'

/** Generate one template into a throwaway directory. */
function scaffold(template) {
  const dir = mkdtempSync(join(tmpdir(), `cdhp-${template}-`))
  const target = join(dir, `probe-${template}`)
  execFileSync(process.execPath, [cli, target, '-t', template, '--yes'], { stdio: 'pipe' })
  return { dir, target }
}

for (const template of TEMPLATES) {
  test(`${template}: generates a loadable bundle`, () => {
    const { dir, target } = scaffold(template)
    try {
      // .npmrc is listed here deliberately: npm strips dotfiles from published
      // tarballs, so a template storing it dotted would work in development and
      // silently vanish for anyone installing this scaffold from the registry.
      for (const file of ['package.json', 'tsconfig.json', 'cordis.patch.yml', 'README.md', '.npmrc']) {
        assert.ok(existsSync(join(target, file)), `${template} is missing ${file}`)
      }

      const manifest = JSON.parse(readFileSync(join(target, 'package.json'), 'utf8'))
      assert.equal(manifest.type, 'module', 'plugins must be pure ESM')
      assert.equal(manifest.dsh?.bundle?.patch, './cordis.patch.yml',
        'without dsh.bundle the package installs as a plain dependency and contributes no layer')

      // The whole runtime-binding contract: harness packages are types only.
      assert.equal(manifest.dependencies, undefined,
        'a @deepseek-ai dependency would install a second copy into the profile')
      assert.equal(manifest.peerDependencies, undefined,
        'a peerDependency would be auto-installed by pnpm, same second-copy problem')
      for (const dep of Object.keys(manifest.devDependencies ?? {})) {
        if (!dep.startsWith('@deepseek-ai/')) continue
        assert.ok(!dep.includes('undefined'), `unresolved version token in ${dep}`)
      }

      const patch = readFileSync(join(target, 'cordis.patch.yml'), 'utf8')
      assert.ok(!patch.includes('{{'), 'every token in the patch must be substituted')
      assert.ok(patch.includes(manifest.name), 'the patch must reference the package by name')

      const readme = readFileSync(join(target, 'README.md'), 'utf8')
      assert.ok(!readme.includes('{{'), 'every token in the README must be substituted')
      assert.ok(readme.includes('## Pitfalls'), 'the pitfall list ships with every project')

      if (buildToo) {
        execFileSync('npm', ['install', '--no-audit', '--no-fund'], { cwd: target, stdio: 'pipe' })
        execFileSync('npm', ['run', 'build'], { cwd: target, stdio: 'pipe' })
        assert.ok(existsSync(join(target, 'dist')), `${template} produced no dist/`)
      }
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
}

test('refuses to overwrite a non-empty directory', () => {
  const { dir, target } = scaffold('basic')
  try {
    assert.throws(() => {
      execFileSync(process.execPath, [cli, target, '-t', 'basic', '--yes'], { stdio: 'pipe' })
    }, 'generating over an existing project must fail rather than clobber it')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('rejects an unknown template', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cdhp-bad-'))
  try {
    assert.throws(() => {
      execFileSync(process.execPath, [cli, join(dir, 'x'), '-t', 'nope', '--yes'], { stdio: 'pipe' })
    })
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
