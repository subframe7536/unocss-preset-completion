import type {
  Arrayable,
  AutoCompleteExtractor,
  AutoCompleteExtractorResult,
  Preset,
} from '@unocss/core'

import { toArray } from '@unocss/core'

import { scanForDirectives } from '../scan'
import { generateCompletionResult } from '../utils'

export interface DirectiveCompletionOptions {
  /**
   * `applyVariable` option in `transformerDirectives()`
   * @default ['--at-apply', '--uno-apply', '--uno']
   */
  directives?: Arrayable<`--${string}`>
  debug?: (msg: string) => void
}

/**
 * Creates a preset for UnoCSS that add autocomplete support in directives.
 * @param options - Configuration options for the preset.
 */
export function presetDirectivesCompletion(options: DirectiveCompletionOptions = {}): Preset {
  const {
    directives = ['--at-apply', '--uno-apply', '--uno'],
    debug,
  } = options

  // Use code scan instead of regexp to extract class
  const extractor: AutoCompleteExtractor = {
    name: 'css-directives',
    extract({ content, cursor }): AutoCompleteExtractorResult | null {
      const position = scanForDirectives(content, cursor, toArray(directives))
      if (!position) {
        debug?.(`No functions called. cursor=${cursor}, directives=[${directives}]`)
        return null
      }

      const result = generateCompletionResult(cursor, [position])
      if (!result) {
        debug?.(`No args inside function ${position.directiveName}()`)
      }
      return result
    },
  }
  return {
    name: 'unocss-preset-css-directives-completion',
    autocomplete: {
      extractors: [extractor],
    },
  }
}
