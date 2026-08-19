// --verify: prove a generated project actually works, in the order that each
// step can fail.
//
// The last step is the one that matters and the one most scaffolds skip:
// `--dump-config` proves only that the configuration LAYER composed, never
// that Node can resolve the plugin module. A profile whose config dumps
// perfectly can still fail every boot. So we boot it.
import { tmpdir } from 'node:os'
import { mkdtemp, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { c, paint, ok, warn, err, run, runBounded, which } from './util.js'

const STEPS = 5

function report(stage, detail) {
  console.log(err(`✘ VERIFY FAILED at "${stage}"`))
  if (detail?.trim()) console.log(paint(c.dim, detail.trim().slice(-2000)))
  return false
}

/**
 * Install, build, mount and boot the generated project in a throwaway harness home.
 * @param result - the value returned by `generate()`.
 * @returns true when every step passed.
 */
export async function verify({ cfg, targetAbs }) {
  console.log(`\n${paint(c.cyan, '✦ --verify — install, build, mount, and BOOT the plugin')}`)

  const pm = await which('pnpm') ? 'pnpm' : 'npm'
  if (pm === 'npm') console.log(warn('⚠ pnpm not found — using npm here, but `dsh plugin` itself requires pnpm on PATH.'))

  // Verify against the SAME dsh the project pinned its versions to. Falling
  // back to a downloaded one would check the build against a different version
  // line than it compiled against, which is the mismatch this scaffold exists
  // to prevent.
  const localDsh = await which('dsh')
  const dshArgs = (rest) => localDsh ? rest : ['-y', '@deepseek-ai/dsh', ...rest]
  const dshCmd = localDsh ? 'dsh' : 'npx'
  if (!localDsh) console.log(warn('⚠ no dsh on PATH — verifying against a downloaded copy, which may be a different version line.'))

  const parent = dirname(targetAbs)
  const home = await mkdtemp(join(tmpdir(), 'dsh-verify-'))
  const env = { ...process.env, DSH_HOME: home }
  const profile = 'verify'
  const cleanup = () => rm(home, { recursive: true, force: true })

  try {
    console.log(paint(c.dim, `\n[1/${STEPS}] ${pm} install`))
    let r = await run(pm, ['install'], { cwd: targetAbs, timeout: 300000, env: process.env })
    if (r.code !== 0) return report(`${pm} install`, r.stderr || r.stdout)
    console.log(ok('✔ dependencies installed'))

    console.log(paint(c.dim, `\n[2/${STEPS}] ${pm} run build`))
    r = await run(pm, ['run', 'build'], { cwd: targetAbs, timeout: 180000, env: process.env })
    if (r.code !== 0) return report(`${pm} run build`, r.stderr || r.stdout)
    console.log(ok('✔ compiled to dist/'))

    console.log(paint(c.dim, `\n[3/${STEPS}] dsh plugin add → throwaway profile`))
    r = await run(dshCmd, dshArgs(['plugin', '--profile', profile, 'add', targetAbs]), {
      cwd: parent, timeout: 300000, env,
    })
    if (r.code !== 0) return report('dsh plugin add', r.stderr || r.stdout)
    console.log(ok('✔ registered as a bundle in the profile'))

    console.log(paint(c.dim, `\n[4/${STEPS}] --dump-config → the layer composed`))
    r = await run(dshCmd, dshArgs(['--profile', profile, '--dump-config']), {
      cwd: parent, timeout: 120000, env,
    })
    if (r.code !== 0 || !r.stdout.includes(cfg.pluginId)) {
      return report('--dump-config (row not found)', r.stderr || r.stdout)
    }
    console.log(ok(`✔ layer contains row "${cfg.pluginId}"`))

    console.log(paint(c.dim, `\n[5/${STEPS}] boot → the module actually resolves and applies`))
    const boot = await runBounded(dshCmd, dshArgs(['--profile', profile]), {
      cwd: parent, env,
    }, 15000)
    if (/plugin tree failed to load|Cannot find package/i.test(boot.output)) {
      return report('boot (plugin tree failed)', boot.output)
    }
    if (!boot.output.includes(`[${cfg.pluginId}]`)) {
      return report(`boot (no "[${cfg.pluginId}]" marker — the plugin never applied)`, boot.output)
    }
    console.log(ok('✔ booted and applied'))

    console.log(`\n${ok('✔ VERIFY PASSED — compiles, mounts, and runs in a real profile')}`)
    return true
  } finally {
    await cleanup()
  }
}
