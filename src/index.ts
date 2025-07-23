/* eslint-disable no-cond-assign */
import type { AutoCompleteExtractor, AutoCompleteExtractorResult, Preset } from '@unocss/core'

import { appendFileSync } from 'node:fs'

export interface CompletionOptions {
  /**
   * Array of function names that trigger class name autocomplete suggestions.
   * @default ['clsx', 'cn', 'classnames', 'cls']
   */
  autocompleteFunctions?: string[]
}

function log(...args: any): void {
  // const p = '/Users/subf/Developer/front/unocss-preset-custom-completion/uno.log'
  const p = 'E:\\front\\unocss-preset-custom-completion\\uno.log'
  appendFileSync(p, `${JSON.stringify(args)}\n`, 'utf-8')
}

export function presetCompletion(options: CompletionOptions = {}): Preset {
  const { autocompleteFunctions = ['clsx', 'cls'] } = options

  // todo)) use code scan instead of regexp to extract class
  // eslint-disable-next-line regexp/no-unused-capturing-group, regexp/no-useless-assertions
  const stringRegex = /(['"`])((?:\\1|(?!$\{)[^\\1])*?)\1/g
  // Regular expression to match function calls with arguments
  const functionPattern = new RegExp(
    `(${autocompleteFunctions.join('|')})\\s*\\(([^)]*)`,
    'g',
  )

  const extractor: AutoCompleteExtractor = {
    name: 'class-functions',
    extract({ content, cursor }): AutoCompleteExtractorResult | null {
      let match
      functionPattern.lastIndex = 0
      log('Matching function')

      while ((match = functionPattern.exec(content)) !== null) {
        const functionStart = match.index
        const argsStart = functionStart + match[0].indexOf('(') + 1
        const argsEnd = functionStart + match[0].length - 1
        const argsContent = match[2]
        log('Checking cursor')
        if (cursor < argsStart || cursor > argsEnd) {
          log(`Outside function, start=${argsStart}, cursor=${cursor}, end=${argsEnd}`)
          continue
        }
        log(`Inside function, code=${argsContent}, regexp=${stringRegex.source}`)
        // Find the string literal containing the cursor
        let stringMatch
        stringRegex.lastIndex = 0
        while ((stringMatch = stringRegex.exec(argsContent)) !== null) {
          const stringStart = argsStart + stringMatch.index
          const stringEnd = stringStart + stringMatch[0].length
          log('Matched strings', { stringStart, cursor, stringEnd })
          if (cursor > stringStart && cursor < stringEnd) {
            const stringContent = stringMatch[0].slice(1, -1)
            const cursorRel = cursor - (stringStart + 1)

            // Find token boundaries
            const lastSpace = stringContent.lastIndexOf(' ', cursorRel - 1)
            const tokenStartRel = lastSpace === -1 ? 0 : lastSpace + 1
            const nextSpace = stringContent.indexOf(' ', cursorRel)
            const tokenEndRel = nextSpace === -1 ? stringContent.length : nextSpace

            const extracted = stringContent.slice(tokenStartRel, cursorRel)
            log(`Extract, content=${extracted}`)
            log()

            const start = stringStart + 1 + tokenStartRel
            const end = stringStart + 1 + tokenEndRel
            return {
              extracted,
              resolveReplacement: (suggestion: string) => {
                return { start, end, replacement: suggestion }
              },
            }
          }
        }
        log('No args match')
        log()
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
