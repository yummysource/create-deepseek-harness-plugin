#!/usr/bin/env node
// create-deepseek-harness-plugin — scaffold a DeepSeek Harness plugin.
// Zero runtime dependencies; templates ship inside this package.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { c, paint, err, info } from './util.js'
import { parseCliArgs, HELP } from './args.js'
import { TEMPLATES, TEMPLATE_META } from './templates.js'
import { packageNameFromDir, pluginIdFromPackage, toolNameFromPackage } from './names.js'
import { runWizard } from './wizard.js'
import { generate } from './generate.js'
import { verify } from './verify.js'

const DEFAULT_TEMPLATE = 'basic'

function scaffoldVersion() {
  try {
    const manifest = join(dirname(fileURLToPath(import.meta.url)), '../package.json')
    return JSON.parse(readFileSync(manifest, 'utf8')).version ?? '0.0.0'
  } catch {
    // Running from a tree without the manifest beside it; the version is
    // cosmetic here, so report an obviously-unset value rather than failing.
    return '0.0.0'
  }
}

function fail(message) {
  console.error(err(`✘ ${message}`))
  process.exit(1)
}

/** Fill every field the templates need, from flags, the wizard, or derivation. */
async function resolveConfig(flags, targetDir) {
  let cfg = {
    targetDir,
    name: flags.name,
    template: flags.template,
    pluginId: flags['plugin-id'],
    toolName: flags['tool-name'],
    verify: flags.verify === true ? true : undefined,
    skipInstall: flags['skip-install'] === true,
  }

  const complete = cfg.targetDir && cfg.template
  if (!complete && !flags.yes) cfg = await runWizard(cfg)

  if (!cfg.targetDir) fail('a project directory is required')

  if (cfg.template && !TEMPLATES.includes(cfg.template)) {
    fail(`unknown template ${JSON.stringify(cfg.template)} — choose one of: ${TEMPLATES.join(', ')}`)
  }
  cfg.template ??= DEFAULT_TEMPLATE
  cfg.name ||= packageNameFromDir(cfg.targetDir)
  cfg.pluginId ||= pluginIdFromPackage(cfg.name)
  if (TEMPLATE_META[cfg.template].asksToolName) cfg.toolName ||= toolNameFromPackage(cfg.name)
  cfg.verify = cfg.verify === true

  return cfg
}

function printNextSteps(cfg) {
  const spec = /^([/]|[A-Za-z]:[\\/])/.test(cfg.targetDir) ? cfg.targetDir : `./${cfg.targetDir}`
  console.log(`\n${info('Next steps:')}`)
  console.log(paint(c.dim, `  cd ${cfg.targetDir}`))
  if (!cfg.skipInstall) console.log(paint(c.dim, '  pnpm install && pnpm run build'))
  console.log(paint(c.dim, '  # from the PARENT directory — relative specs anchor to the invoking dir:'))
  console.log(paint(c.dim, `  dsh plugin --profile my-profile add ${spec}`))
  console.log(paint(c.dim, '  dsh --profile my-profile'))
  console.log('')
}

async function main() {
  const { targetDir, flags } = parseCliArgs(process.argv.slice(2))

  if (flags.help) return void console.log(HELP)
  if (flags.version) return void console.log(scaffoldVersion())

  const cfg = await resolveConfig(flags, targetDir)

  let generated
  try {
    generated = await generate(cfg)
  } catch (e) {
    fail(e?.message ?? String(e))
  }

  if (cfg.verify && !await verify(generated)) process.exit(1)

  printNextSteps(cfg)
}

main()
