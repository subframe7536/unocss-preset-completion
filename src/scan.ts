interface FunctionCall {
  functionName: string
  argsStart: number
  argsEnd: number
  argsContent: string
}
/**
 * Scans the content to find a function call at the cursor position.
 * @param content - The full content of the file.
 * @param cursor - The current cursor position.
 * @param autocompleteFunctions - List of function names to look for.
 * @returns A `FunctionCall` object if a matching function call is found, otherwise `null`.
 */
export function scanForFunctionCall(content: string, cursor: number, autocompleteFunctions: string[]): FunctionCall | null {
  // Find the line containing the cursor
  const lineStart = content.lastIndexOf('\n', cursor) + 1
  const lineEnd = content.indexOf('\n', cursor)
  const line = content.slice(lineStart, lineEnd === -1 ? undefined : lineEnd)

  // Check each function name
  for (const fn of autocompleteFunctions) {
    // Find function call in current line that contains the cursor
    let idx = 0
    // eslint-disable-next-line no-cond-assign
    while ((idx = line.indexOf(`${fn}(`, idx)) !== -1) {
      // Calculate global position
      const fnStart = lineStart + idx
      const argsStart = fnStart + fn.length + 1

      // Ensure cursor is after function name
      if (cursor < argsStart) {
        idx = idx + fn.length + 1
        continue
      }

      // Find matching closing parenthesis
      let parenCount = 1
      let i = argsStart - lineStart
      while (i < line.length && parenCount > 0) {
        if (line[i] === '(') {
          parenCount++
        } else if (line[i] === ')') {
          parenCount--
        }
        i++
      }

      const argsEnd = lineStart + i - 1

      // Check if cursor is within arguments
      if (cursor >= argsStart && cursor <= argsEnd) {
        const argsContent = content.slice(argsStart, argsEnd)
        return { functionName: fn, argsStart, argsEnd, argsContent }
      }

      idx = i
    }
  }
  return null
}
interface StringLiteral {
  start: number
  end: number
  content: string
}
/**
 * Scans the arguments of a function call to extract string literals.
 * @param argsContent - The content of the arguments.
 * @param argsStart - The starting position of the arguments in the content.
 * @returns An array of `StringLiteral` objects representing the string literals found.
 */
export function scanStringLiterals(argsContent: string, argsStart: number): StringLiteral[] {
  const literals: StringLiteral[] = []
  let i = 0
  while (i < argsContent.length) {
    const quote = argsContent[i]
    // Check for string literal start
    if (quote === '"' || quote === '\'' || quote === '`') {
      let j = i + 1
      let escaped = false
      // Find the closing quote
      while (j < argsContent.length) {
        if (!escaped && argsContent[j] === quote) {
          break
        }
        escaped = argsContent[j] === '\\' && !escaped
        j++
      }
      if (j < argsContent.length) {
        literals.push({
          start: argsStart + i,
          end: argsStart + j,
          content: argsContent.slice(i + 1, j),
        })
        i = j + 1
      } else {
        i++
      }
    } else {
      i++
    }
  }
  return literals
}
