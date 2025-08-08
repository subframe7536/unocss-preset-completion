import type { AutoCompleteExtractor, AutoCompleteExtractorResult, Preset } from '@unocss/core'

import { scanForFunctionCall, scanStringLiterals } from './scan'

export interface CompletionOptions {
  /**
   * Array of function names that trigger class name autocomplete suggestions.
   * @default ['clsx', 'cn', 'classnames', 'cls']
   */
  autocompleteFunctions?: string[]
  debug?: (msg: string) => void
}

export const DEFAULT_FUNCTIONS = ['clsx', 'cn', 'classnames', 'cls', 'cva', 'tv']

/**
 * Creates a preset for UnoCSS that add autocomplete support in functions.
 * @param options - Configuration options for the preset.
 */
export function presetCompletion(options: CompletionOptions = {}): Preset {
  const {
    autocompleteFunctions = DEFAULT_FUNCTIONS,
    debug,
  } = options

  // Use code scan instead of regexp to extract class
  const extractor: AutoCompleteExtractor = {
    name: 'class-functions',
    extract({ content, cursor }): AutoCompleteExtractorResult | null {
      const call = scanForFunctionCall(content, cursor, autocompleteFunctions)
      if (!call) {
        debug?.(`No functions called. cursor=${cursor}, fn=[${autocompleteFunctions}]`)
        return null
      }

      const literals = scanStringLiterals(call.argsContent, call.argsStart)
      for (const literal of literals) {
        if (cursor < literal.start || cursor > literal.end) {
          continue
        }
        const stringContent = literal.content
        const cursorRel = cursor - (literal.start + 1)
        // Find token boundaries
        const lastSpace = stringContent.lastIndexOf(' ', cursorRel - 1)
        const tokenStartRel = lastSpace === -1 ? 0 : lastSpace + 1
        const nextSpace = stringContent.indexOf(' ', cursorRel)
        const tokenEndRel = nextSpace === -1 ? stringContent.length : nextSpace
        const extracted = stringContent.slice(tokenStartRel, cursorRel)
        debug?.(JSON.stringify({ cursor, extracted, fn: call.fnName, ...literal }))

        const start = literal.start + 1 + tokenStartRel
        const end = literal.start + 1 + tokenEndRel
        return {
          extracted,
          resolveReplacement: (suggestion: string) => ({
            start,
            end,
            replacement: suggestion,
          }),
        }
      }
      debug?.(`No args inside function ${call.fnName}()`)
      return null
    },
  }
  return {
    name: 'unocss-preset-fn-completion',
    autocomplete: {
      extractors: [extractor],
    },
  }
}
