/* eslint-disable no-cond-assign */
import type { AutoCompleteExtractor, AutoCompleteExtractorResult, Preset } from '@unocss/core'

import { appendFileSync } from 'node:fs'

export interface CompletionOptions {
  /**
   * Array of function names that trigger class name autocomplete suggestions.
   * @default ['clsx']
   */
  autocompleteFunctions?: string[]
}

const stringRegex = /'[^']*'|"[^"]*"/g
function log(...args: any): void {
  const p = '/Users/subf/Developer/front/unocss-preset-custom-completion/uno.log'
  appendFileSync(p, `${JSON.stringify(args)}\n`, 'utf-8')
}

export function presetCompletion(options: CompletionOptions = {}): Preset {
  const { autocompleteFunctions = ['clsx', 'cls'] } = options

  const regString = `(${autocompleteFunctions.map(name => name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')).join('|')})\\s*\\(([^)]*)`
  // Regular expression to match function calls with arguments
  const functionPattern = new RegExp(regString, 'g')

  const extractor: AutoCompleteExtractor = {
    name: 'class-functions',
    extract({ content, cursor }): AutoCompleteExtractorResult | null {
      let match
      functionPattern.lastIndex = 0

      while ((match = functionPattern.exec(content)) !== null) {
        const functionStart = match.index
        const argsStart = functionStart + match[0].indexOf('(') + 1
        const argsEnd = functionStart + match[0].length - 1
        const argsContent = match[2]
        if (cursor < argsStart || cursor > argsEnd) {
          log('Not inside args')
          continue
        }
        log('Start matching')
        // Find the string literal containing the cursor
        let stringMatch
        while ((stringMatch = stringRegex.exec(argsContent)) !== null) {
          const stringStart = argsStart + stringMatch.index
          const stringEnd = stringStart + stringMatch[0].length
          log({ stringStart, stringEnd })
          if (cursor > stringStart && cursor < stringEnd) {
            const stringContent = stringMatch[0].slice(1, -1)
            const cursorRel = cursor - (stringStart + 1)

            // Find token boundaries
            const lastSpace = stringContent.lastIndexOf(' ', cursorRel - 1)
            const tokenStartRel = lastSpace === -1 ? 0 : lastSpace + 1
            const nextSpace = stringContent.indexOf(' ', cursorRel)
            const tokenEndRel = nextSpace === -1 ? stringContent.length : nextSpace

            log({ lastSpace, tokenStartRel, tokenEndRel, nextSpace })

            const extracted = stringContent.slice(tokenStartRel, cursorRel)

            return {
              extracted,
              resolveReplacement: (suggestion: string) => {
                const start = stringStart + 1 + tokenStartRel
                const end = stringStart + 1 + tokenEndRel
                return { start, end, replacement: suggestion }
              },
            }
          }
        }
      }

      return null
    },
  }
  return {
    name: 'unocss-preset-custom-completion',
    autocomplete: {
      extractors: [extractor],
    },
  }
}
