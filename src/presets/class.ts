import type { AutoCompleteExtractor, AutoCompleteExtractorResult, Preset } from '@unocss/core'

import { scanForFunctionCall, scanStringLiterals } from '../scan'
import { generateCompletionResult } from '../utils'

export interface ClassCompletionOptions {
  /**
   * Array of function names that trigger class name autocomplete suggestions.
   * @default ['clsx', 'cn', 'classnames', 'cls', 'cva', 'tv']
   */
  autocompleteFunctions?: string[]
  debug?: (msg: string) => void
}

/**
 * @deprecated use {@link ClassCompletionOptions} instead
 */
export type CompletionOptions = ClassCompletionOptions

export const DEFAULT_FUNCTIONS = ['clsx', 'cn', 'classnames', 'cls', 'cva', 'tv']

/**
 * Creates a preset for UnoCSS that add autocomplete support in functions.
 * @param options - Configuration options for the preset.
 */
export function presetClassCompletion(options: ClassCompletionOptions = {}): Preset {
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

      const postions = scanStringLiterals(call.argsContent, call.argsStart)
      const result = generateCompletionResult(cursor, postions)
      if (!result) {
        debug?.(`No args inside function ${call.fnName}()`)
      }
      return result
    },
  }
  return {
    name: 'unocss-preset-fn-completion',
    autocomplete: {
      extractors: [extractor],
    },
  }
}

/**
 * @deprecated use {@link presetClassCompletion} instead
 */
export const presetCompletion = presetClassCompletion
