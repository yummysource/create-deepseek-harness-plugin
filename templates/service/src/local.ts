// The PROVIDER half: one concrete implementation of {{SERVICE_CLASS}}.
//
// This one keeps notes in process memory, which is the honest minimum for a
// generated project. Swap the three marked lines for a filesystem, SQLite, or
// network backend and nothing that injects `ctx.{{PLUGIN_ID_CAMEL}}` changes —
// that is the whole point of the seam.
//
// NOTE the shape difference from a function plugin: a Service class declares
// its schema as a STATIC member (`static Config`), not a module-level
// `export const Config`. The Loader reads the static one; a module-level
// export is ignored, and the constructor then receives `undefined`.
//
import type { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'
import { {{SERVICE_CLASS}}, type Note } from './index.js'

export interface Config {
  /** Reject a save once the store holds this many notes. */
  maxEntries: number
}

export default class Local{{SERVICE_CLASS}} extends {{SERVICE_CLASS}} {
  // Never combine `.required()` with `.default()`: required suppresses the
  // default, and a row supplying no config then fails with `invalid config`.
  static Config: Schema<Config> = Schema.object({
    maxEntries: Schema.number()
      .default(1000)
      .description('Maximum notes held at once'),
  })

  private readonly notes = new Map<string, Note>()   // ← swap for a real backend

  constructor(ctx: Context, private readonly config: Config) {
    super(ctx)
    console.log(`[{{PLUGIN_ID}}] provider ready — ctx.{{PLUGIN_ID_CAMEL}} available, maxEntries=${config.maxEntries}`)
  }

  async save(key: string, text: string): Promise<Note> {
    if (!this.notes.has(key) && this.notes.size >= this.config.maxEntries) {
      throw new Error(`{{PLUGIN_ID}}: store is full (maxEntries=${this.config.maxEntries})`)
    }
    const note: Note = { key, text }
    this.notes.set(key, note)                        // ← swap for a real backend
    return note
  }

  async load(key: string): Promise<Note | undefined> {
    return this.notes.get(key)                       // ← swap for a real backend
  }
}
