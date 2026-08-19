// {{PKG_NAME}} — the Service DEFINITION half of a capability seam.
//
// ── What a capability seam is ─────────────────────────────────────────────
// A seam has three roles: the Definition (this file) states WHAT the
// capability does; a Provider states HOW (see ./local.ts); a Consumer injects
// and uses it. The Definition owns no policy and no I/O — that is what lets a
// deployment swap one provider for another without touching any consumer.
//
// A real project usually splits Definition and Provider into SEPARATE packages
// so a third party can ship an alternative provider without depending on
// yours. They are together here so the generated project runs immediately.
//
import { Context, Service } from '@deepseek-ai/cordis'

// Declaration merging is how `ctx.{{PLUGIN_ID}}` becomes typed for every
// plugin that injects it. Without this block, consumers would see `any`.
declare module '@deepseek-ai/cordis' {
  interface Context {
    {{PLUGIN_ID_CAMEL}}: {{SERVICE_CLASS}}
  }
}

/** One stored note. */
export interface Note {
  /** Caller-supplied key; unique within the store. */
  key: string
  /** The note body, stored verbatim. */
  text: string
}

/**
 * Abstract note store. Subclass it, implement both methods, and load the
 * subclass as a plugin — it registers as `ctx.{{PLUGIN_ID_CAMEL}}`. Loading a
 * second implementation throws; that is cordis' standard duplicate-service
 * behavior, not a bug.
 *
 * Semantics every implementation must honor:
 * - `save` stores `text` verbatim under `key`, replacing any earlier value.
 * - `load` returns the stored note, or `undefined` when the key is absent.
 * - Both REJECT on a real backend failure; callers decide how to degrade.
 */
export abstract class {{SERVICE_CLASS}} extends Service {
  constructor(ctx: Context) {
    super(ctx, '{{PLUGIN_ID_CAMEL}}')
  }

  /**
   * Store `text` under `key`, replacing any earlier value.
   * @param key - caller-supplied identifier.
   * @param text - the body to store verbatim.
   * @returns the stored note; rejects on a backend failure.
   */
  abstract save(key: string, text: string): Promise<Note>

  /**
   * Read one note back.
   * @param key - the identifier passed to {@link save}.
   * @returns the stored note, or `undefined` when the key is absent.
   */
  abstract load(key: string): Promise<Note | undefined>
}

export default {{SERVICE_CLASS}}
