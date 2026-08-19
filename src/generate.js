// Template rendering + file writing for create-deepseek-harness-plugin.
import { readdir, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative, resolve } from 'node:path'
import { c, paint, ok, warn, exists, writeFileDeep, readText, resolveDshVersions } from './util.js'
import { TEMPLATE_META, PITFALLS } from './templates.js'

const here = dirname(fileURLToPath(import.meta.url))
const TEMPLATES_ROOT = resolve(here, '../templates')

// Recursively list files under a directory (relative paths).
async function listFiles(dir, base = dir) {
  const out = []
  for (const entry of await readdir(dir)) {
    const full = join(dir, entry)
    const st = await stat(full)
    if (st.isDirectory()) out.push(...await listFiles(full, base))
    else out.push(relative(base, full))
  }
  return out
}

// `my-notes` -> `myNotes`. The cordis service key a consumer injects.
function camelFromId(id) {
  return String(id).replace(/-+([a-z0-9])/g, (_m, ch) => ch.toUpperCase()).replace(/-/g, '')
}

// `my-notes` -> `MyNotes`. The exported Service Definition class name.
function pascalFromId(id) {
  const camel = camelFromId(id)
  return camel.charAt(0).toUpperCase() + camel.slice(1)
}

function renderPitfalls() {
  const lines = ['## Pitfalls', '']
  for (let i = 0; i < PITFALLS.length; i++) {
    lines.push(`${i + 1}. ${PITFALLS[i]}`)
    lines.push('')
  }
  return lines.join('\n')
}

/**
 * Generate one plugin project from a template.
 * @param cfg { targetDir, name, pluginId, toolName, template, skipInstall }
 * @returns { cfg, versions, files, targetAbs } for the caller (and --verify).
 */
export async function generate(cfg) {
  const meta = TEMPLATE_META[cfg.template]
  const versions = await resolveDshVersions()

  const targetAbs = resolve(cfg.targetDir)
  if (await exists(targetAbs) && await readdir(targetAbs).then((l) => l.length > 0)) {
    throw new Error(
      `target directory ${JSON.stringify(cfg.targetDir)} is not empty — refusing to overwrite . Choose a new directory or empty it first.`,
    )
  }

  const tokens = {
    PKG_NAME: cfg.name,
    PKG_DESCRIPTION: `${cfg.name} — a DeepSeek Harness plugin (${cfg.template} template).`,
    PLUGIN_ID: cfg.pluginId,
    PLUGIN_ID_CAMEL: camelFromId(cfg.pluginId),
    SERVICE_CLASS: pascalFromId(cfg.pluginId),
    TOOL_NAME: cfg.toolName || 'my_tool',
    DSH_TOOLS_VERSION: versions.dshTools,
    DSH_SESSION_VERSION: versions.dshSession,
    CORDIS_VERSION: versions.cordis,
    SCHEMASTERY_VERSION: versions.schemastery,
    DSH_VERSION: versions.dsh,
    YEAR: String(new Date().getFullYear()),
    PITFALLS: renderPitfalls(),
  }

  const replace = (content) =>
    content.replace(/\{\{(\w+)\}\}/g, (m, key) => (key in tokens ? tokens[key] : m))

  const srcRoot = join(TEMPLATES_ROOT, cfg.template)
  const files = await listFiles(srcRoot)
  const written = []
  for (const rel of files) {
    const content = replace(await readText(join(srcRoot, rel)))
    await writeFileDeep(join(targetAbs, rel), content)
    written.push(rel)
  }

  console.log('')
  console.log(ok(`✔ Generated ${cfg.template} plugin in ${targetAbs}`))
  console.log(paint(c.dim, `  template: ${cfg.template}  package: ${cfg.name}  plugin-id: ${cfg.pluginId}`))
  if (versions.source === 'installed') {
    console.log(paint(c.dim, `  pinned to your installed dsh ${versions.dsh} — types and runtime stay on one version line`))
  } else {
    console.log(warn(`  ⚠ no dsh on PATH — pinned to this scaffold's bundled ${versions.dsh}. Install the CLI (npm i -g @deepseek-ai/dsh) and re-check if your harness differs.`))
  }
  console.log(paint(c.dim, `  files: ${written.join(', ')}`))

  return { cfg, versions, files: written, targetAbs }
}
