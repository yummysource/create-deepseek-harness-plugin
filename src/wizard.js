// The interactive wizard. Every question offers the derived default in
// brackets, so pressing Enter through all of them yields a valid project.
import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { c, paint } from './util.js'
import { DEFAULT_LANGUAGE, LANGUAGES, TEMPLATES, TEMPLATE_META } from './templates.js'
import { packageNameFromDir, pluginIdFromPackage, toolNameFromPackage } from './names.js'

/**
 * Fill in whatever `initial` is missing by asking.
 * @param initial - config assembled from the command line.
 * @returns the completed config. A closed stdin is treated as "accept every
 *   default" rather than an error, so piping into the wizard still works.
 */
export async function runWizard(initial) {
  const rl = createInterface({ input, output })
  const answer = async (question, fallback) => {
    try {
      const raw = (await rl.question(question)).trim()
      return raw || fallback
    } catch {
      return fallback   // stdin closed — take the default
    }
  }

  const cfg = { ...initial }
  try {
    console.log(paint(c.cyan, '\n✦ DeepSeek Harness plugin scaffold\n'))

    if (!cfg.targetDir) {
      cfg.targetDir = await answer(`${paint(c.bold, 'Project directory')} [my-plugin]: `, 'my-plugin')
    }

    if (!cfg.name) {
      const derived = packageNameFromDir(cfg.targetDir)
      cfg.name = await answer(`${paint(c.bold, 'Package name')} [${derived}]: `, derived)
    }

    if (!cfg.template) {
      console.log('')
      for (const id of TEMPLATES) {
        console.log(paint(c.dim, `    ${id.padEnd(9)} ${TEMPLATE_META[id].description}`))
      }
      console.log('')
      const picked = await answer(`${paint(c.bold, 'Template')} [basic]: `, 'basic')
      cfg.template = TEMPLATES.includes(picked) ? picked : 'basic'
    }

    if (!cfg.pluginId) {
      const derived = pluginIdFromPackage(cfg.name)
      cfg.pluginId = await answer(`${paint(c.bold, 'Plugin id')} [${derived}]: `, derived)
    }

    if (TEMPLATE_META[cfg.template].asksToolName && !cfg.toolName) {
      const derived = toolNameFromPackage(cfg.name)
      cfg.toolName = await answer(`${paint(c.bold, 'Tool name')} [${derived}]: `, derived)
    }

    if (!cfg.lang) {
      const picked = await answer(
        `${paint(c.bold, 'README language')} [${LANGUAGES.join('/')}] (${DEFAULT_LANGUAGE}): `,
        DEFAULT_LANGUAGE,
      )
      cfg.lang = LANGUAGES.includes(picked) ? picked : DEFAULT_LANGUAGE
    }

    if (cfg.verify === undefined) {
      const yn = await answer(`${paint(c.bold, 'Verify by building and booting it?')} [y/N]: `, 'n')
      cfg.verify = /^y(es)?$/i.test(yn)
    }
  } finally {
    rl.close()
  }
  return cfg
}
