// Argument parsing and help text. Uses node:util's parseArgs — no dependency.
import { parseArgs } from 'node:util'
import { c, paint } from './util.js'
import { TEMPLATES, TEMPLATE_META } from './templates.js'

const OPTIONS = {
  template: { type: 'string', short: 't' },
  name: { type: 'string', short: 'n' },
  'plugin-id': { type: 'string' },
  'tool-name': { type: 'string' },
  lang: { type: 'string', short: 'l' },
  yes: { type: 'boolean', short: 'y' },
  verify: { type: 'boolean' },
  'skip-install': { type: 'boolean' },
  help: { type: 'boolean', short: 'h' },
  version: { type: 'boolean', short: 'v' },
}

/**
 * Parse argv into a target directory and flags.
 * @param argv - arguments after the node binary and script.
 * @returns `{ targetDir, flags }`; `targetDir` is null when none was given.
 */
export function parseCliArgs(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    options: OPTIONS,
    allowPositionals: true,
    strict: false,
  })
  return { targetDir: positionals[0] ?? null, flags: values }
}

const templateLines = TEMPLATES
  .map((id) => `      ${id.padEnd(9)} ${TEMPLATE_META[id].description}`)
  .join('\n')

export const HELP = `
${paint(c.bold, '@allis-plugin/create-dsh')} — scaffold a DeepSeek Harness plugin

${paint(c.cyan, 'Usage')}
  npx @allis-plugin/create-dsh@latest [project-dir] [options]
  npm create @allis-plugin/dsh@latest -- [project-dir] [options]

${paint(c.cyan, 'Arguments')}
  [project-dir]            Target directory. Omit it to answer the prompts instead.

${paint(c.cyan, 'Templates')}
${templateLines}

${paint(c.cyan, 'Options')}
  -t, --template <name>    One of: ${TEMPLATES.join(' | ')}
  -n, --name <pkg>         npm package name (default: derived from the directory)
      --plugin-id <id>     cordis row id and plugin name export (default: derived)
      --tool-name <name>   Model-facing tool name, tool template only (default: derived)
  -l, --lang <en|zh>       Language of the generated project's README (default: en)
  -y, --yes                Accept every default and skip the prompts
      --verify             After generating: install, build, mount, and BOOT it in a temp profile
      --skip-install       Leave dependencies uninstalled
  -h, --help               Show this help
  -v, --version            Print the scaffold version

${paint(c.cyan, 'Examples')}
  npx @allis-plugin/create-dsh@latest hello-world -t basic
  npx @allis-plugin/create-dsh@latest my-tool -t tool --yes --verify
  npx @allis-plugin/create-dsh@latest my-plugin -t basic --lang zh
  npx @allis-plugin/create-dsh@latest
`
