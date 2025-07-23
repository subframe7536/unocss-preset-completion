interface FunctionCall {
  functionName: string
  argsStart: number
  argsEnd: number
  argsContent: string
}

/**
 * Scans the content to find the innermost function call at the cursor position,
 * supporting function calls that span multiple lines.
 *
 * @param content - The full content of the file.
 * @param cursor - The current cursor position.
 * @param autocompleteFunctions - List of function names to look for.
 * @returns A `FunctionCall` object if a matching function call is found, otherwise `null`.
 */
export function scanForFunctionCall(
  content: string,
  cursor: number,
  autocompleteFunctions: string[],
): FunctionCall | null {
  let bestMatch: FunctionCall | null = null

  // Check each function name provided
  for (const fn of autocompleteFunctions) {
    let searchPos = cursor

    // Continuously search backwards from the cursor for the start of a function call

    while (true) {
      const fnCallStart = content.lastIndexOf(`${fn}(`, searchPos)

      // If no more occurrences are found before the search position, stop for this function.
      if (fnCallStart === -1) {
        break
      }

      const argsStart = fnCallStart + fn.length + 1

      // To be a candidate, the cursor must be located after the opening parenthesis.
      if (cursor < argsStart) {
        // This function call starts after the cursor, so it's not the one we're inside.
        // Continue searching from an earlier position.
        searchPos = fnCallStart - 1
        continue
      }

      // Now, scan forward from the start of the arguments to find the matching closing parenthesis.
      // This correctly handles arguments that span multiple lines.
      let parenCount = 1
      let i = argsStart
      while (i < content.length && parenCount > 0) {
        if (content[i] === '(') {
          parenCount++
        } else if (content[i] === ')') {
          parenCount--
        }
        i++
      }

      // If we successfully found the closing parenthesis (parenCount is 0)
      if (parenCount === 0) {
        const argsEnd = i - 1 // The position of the closing ')'

        // Check if the cursor is within the argument bounds (from just after '(' up to ')')
        if (cursor >= argsStart && cursor <= argsEnd) {
          const currentMatch: FunctionCall = {
            functionName: fn,
            argsStart,
            argsEnd,
            argsContent: content.slice(argsStart, argsEnd),
          }

          // We want the most tightly nested function call. The best match is the one
          // whose arguments start at the highest index (closest to the cursor).
          if (!bestMatch || currentMatch.argsStart > bestMatch.argsStart) {
            bestMatch = currentMatch
          }
        }
      }

      // Move the search position backward to find other potential (enclosing) parent calls
      searchPos = fnCallStart - 1
    }
  }

  return bestMatch
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
