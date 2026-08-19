// Deriving every name a generated project needs from what the user typed.
// One directory name is enough; each derivation narrows to the character set
// its consumer accepts, so a user who accepts all defaults still gets valid
// npm, cordis, and TypeScript identifiers.

/** npm package name from a directory path: lowercase, no separators, no leading dot. */
export function packageNameFromDir(dir) {
  const base = String(dir).replace(/[\\/]+$/, '').split(/[\\/]/).pop() || ''
  const cleaned = base
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^[^a-z0-9]+/, '')
    .replace(/[^a-z0-9]+$/, '')
    .replace(/-{2,}/g, '-')
  return cleaned || 'my-plugin'
}

/** cordis row id and `name` export: [a-z0-9] separated by single hyphens. */
export function pluginIdFromPackage(pkg) {
  const cleaned = String(pkg)
    .toLowerCase()
    .replace(/^@[^/]+\//, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
  return cleaned || 'my-plugin'
}

/** Model-facing tool name: snake_case, must start with a letter. */
export function toolNameFromPackage(pkg) {
  const snake = pluginIdFromPackage(pkg).replace(/-/g, '_')
  return /^[a-z]/.test(snake) ? snake : `tool_${snake}`
}

/** Service key a consumer injects: `my-notes` -> `myNotes`. */
export function serviceKeyFromId(id) {
  return String(id).replace(/-+([a-z0-9])/g, (_m, ch) => ch.toUpperCase()).replace(/-/g, '')
}

/** Exported class name: `my-notes` -> `MyNotes`. */
export function classNameFromId(id) {
  const key = serviceKeyFromId(id)
  return key.charAt(0).toUpperCase() + key.slice(1)
}
