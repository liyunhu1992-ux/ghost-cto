/**
 * GhostCTO Lexical De-noising & Structural Skeleton Engine v2.0
 * Zero-dependency finite-state lexer for JS/JSX/TS/TSX/MJS/HTML/Python/SQL.
 * Preserves exact 1-based line numbers while stripping comments and strings,
 * and natively unwraps HTML <script> blocks & embedded `String.raw` JS scripts!
 */

const REGEX_PRECEDING_TOKENS = new Set([
  '(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '\n', '~', '^', '%', '+', '-', '*', '<', '>'
]);

/**
 * Mask non-script HTML markup into spaces while preserving exact byte length & newlines.
 */
function extractHtmlScriptsWithLinePreservation(html) {
  const chars = new Array(html.length);
  for (let i = 0; i < html.length; i++) {
    chars[i] = html[i] === '\n' ? '\n' : ' ';
  }
  const scriptRe = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = scriptRe.exec(html)) !== null) {
    const fullMatch = m[0];
    const openTagEnd = fullMatch.indexOf('>') + 1;
    const bodyStart = m.index + openTagEnd;
    const bodyEnd = bodyStart + m[1].length;
    for (let k = bodyStart; k < bodyEnd; k++) {
      chars[k] = html[k];
    }
  }
  return chars.join('');
}

/**
 * Unwrap embedded JS scripts stored inside `String.raw\`...\`` (e.g., SSR / static UI builders like 媒擎OS)
 * into spaces at the outer wrapper while preserving exact byte offsets & 1-based line numbers!
 */
function unwrapEmbeddedStringRawScripts(source) {
  if (!source.includes('String.raw`')) return source;
  const re = /(?:export\s+)?(?:const|let|var)\s+[A-Za-z0-9_]*(?:SCRIPT|JS|CODE)[A-Za-z0-9_]*\s*=\s*String\.raw`([\s\S]*?)`\s*;?/g;
  let changed = false;
  const chars = source.split('');
  let m;
  while ((m = re.exec(source)) !== null) {
    const body = m[1];
    if (!/\b(?:function|const|let|fetch|document|window)\b/.test(body)) continue;
    changed = true;
    const fullStart = m.index;
    const backtickOpen = source.indexOf('`', fullStart);
    const bodyStart = backtickOpen + 1;
    const bodyEnd = bodyStart + body.length;
    const fullEnd = m.index + m[0].length;

    for (let k = fullStart; k < bodyStart; k++) {
      if (chars[k] !== '\n') chars[k] = ' ';
    }
    for (let k = bodyEnd; k < fullEnd; k++) {
      if (chars[k] !== '\n') chars[k] = ' ';
    }
  }
  return changed ? chars.join('') : source;
}

/**
 * Dedicated O(N) Python lexer preserving exact 1-based line numbers.
 */
function analyzePythonSource(source) {
  const len = source.length;
  const cleanChars = new Array(len);
  const skelChars = new Array(len);
  const strings = [];
  const lineOffsets = [0];

  let i = 0;
  let line = 1;

  while (i < len) {
    const ch = source[i];
    if (ch === '\n') {
      cleanChars[i] = '\n';
      skelChars[i] = '\n';
      line++;
      lineOffsets.push(i + 1);
      i++;
      continue;
    }

    // Python `#` comment
    if (ch === '#') {
      while (i < len && source[i] !== '\n') {
        cleanChars[i] = ' ';
        skelChars[i] = ' ';
        i++;
      }
      continue;
    }

    // Triple-quoted Python string / docstring `"""..."""` or `'''...'''`
    const next3 = source.slice(i, i + 3);
    if (next3 === '"""' || next3 === "'''") {
      const delim = next3;
      const start = i;
      const startLine = line;
      for (let k = 0; k < 3; k++) {
        cleanChars[i + k] = delim[0];
        skelChars[i + k] = delim[0];
      }
      i += 3;
      let val = '';
      while (i < len) {
        if (source.slice(i, i + 3) === delim) {
          for (let k = 0; k < 3; k++) {
            cleanChars[i + k] = delim[0];
            skelChars[i + k] = delim[0];
          }
          i += 3;
          break;
        }
        if (source[i] === '\n') {
          val += '\n';
          cleanChars[i] = '\n';
          skelChars[i] = '\n';
          line++;
          lineOffsets.push(i + 1);
        } else {
          val += source[i];
          cleanChars[i] = source[i];
          skelChars[i] = ' ';
        }
        i++;
      }
      strings.push({ value: val, quote: delim, line: startLine, start, end: i });
      continue;
    }

    // Single or double quoted Python string
    if (ch === "'" || ch === '"') {
      const quote = ch;
      const start = i;
      const startLine = line;
      cleanChars[i] = quote;
      skelChars[i] = quote;
      i++;
      let val = '';
      while (i < len && source[i] !== '\n') {
        if (source[i] === '\\' && i + 1 < len) {
          val += source[i] + source[i + 1];
          cleanChars[i] = source[i];
          cleanChars[i + 1] = source[i + 1];
          skelChars[i] = ' ';
          skelChars[i + 1] = ' ';
          i += 2;
          continue;
        }
        if (source[i] === quote) {
          cleanChars[i] = quote;
          skelChars[i] = quote;
          i++;
          break;
        }
        val += source[i];
        cleanChars[i] = source[i];
        skelChars[i] = ' ';
        i++;
      }
      strings.push({ value: val, quote, line: startLine, start, end: i });
      continue;
    }

    cleanChars[i] = ch;
    skelChars[i] = ch;
    i++;
  }

  return {
    cleanCode: cleanChars.join(''),
    skeleton: skelChars.join(''),
    strings,
    lineOffsets,
    totalLines: line
  };
}

/**
 * Parse source code in a single O(N) pass, producing:
 * - `cleanCode`: comments replaced with spaces (newlines preserved), strings kept intact
 * - `skeleton`: BOTH comments and string/template contents replaced with spaces (newlines preserved)
 * - `strings`: array of { value, quote, line, start, end } for accurate literal inspection
 * - `lineOffsets`: 0-based byte offsets for O(log N) index-to-line lookup
 */
export function analyzeSource(rawSource, ext = '.js') {
  if (ext === '.py') {
    return analyzePythonSource(rawSource);
  }

  let source = rawSource;
  if (ext === '.html') {
    source = extractHtmlScriptsWithLinePreservation(rawSource);
  } else {
    source = unwrapEmbeddedStringRawScripts(rawSource);
  }

  const len = source.length;
  const cleanChars = new Array(len);
  const skelChars = new Array(len);
  const strings = [];
  const lineOffsets = [0];

  let i = 0;
  let line = 1;
  let lastNonWsChar = ';';

  while (i < len) {
    const ch = source[i];
    const next = i + 1 < len ? source[i + 1] : '';

    if (ch === '\n') {
      cleanChars[i] = '\n';
      skelChars[i] = '\n';
      line++;
      lineOffsets.push(i + 1);
      i++;
      continue;
    }

    // 1. Single-line comment: // ...
    if (ch === '/' && next === '/') {
      while (i < len && source[i] !== '\n') {
        cleanChars[i] = ' ';
        skelChars[i] = ' ';
        i++;
      }
      continue;
    }

    // 2. Multi-line block comment: /* ... */
    if (ch === '/' && next === '*') {
      cleanChars[i] = ' ';
      skelChars[i] = ' ';
      cleanChars[i + 1] = ' ';
      skelChars[i + 1] = ' ';
      i += 2;
      while (i < len) {
        if (source[i] === '*' && source[i + 1] === '/') {
          cleanChars[i] = ' ';
          skelChars[i] = ' ';
          cleanChars[i + 1] = ' ';
          skelChars[i + 1] = ' ';
          i += 2;
          break;
        }
        if (source[i] === '\n') {
          cleanChars[i] = '\n';
          skelChars[i] = '\n';
          line++;
          lineOffsets.push(i + 1);
        } else {
          cleanChars[i] = ' ';
          skelChars[i] = ' ';
        }
        i++;
      }
      continue;
    }

    // 3. Single or double quoted string literal
    if (ch === "'" || ch === '"') {
      const quote = ch;
      const start = i;
      const startLine = line;
      cleanChars[i] = quote;
      skelChars[i] = quote;
      i++;
      let val = '';
      while (i < len) {
        const c = source[i];
        if (c === '\\') {
          cleanChars[i] = c;
          skelChars[i] = ' ';
          if (i + 1 < len) {
            val += c + source[i + 1];
            if (source[i + 1] === '\n') {
              cleanChars[i + 1] = '\n';
              skelChars[i + 1] = '\n';
              line++;
              lineOffsets.push(i + 2);
            } else {
              cleanChars[i + 1] = source[i + 1];
              skelChars[i + 1] = ' ';
            }
            i += 2;
            continue;
          }
        }
        if (c === quote) {
          cleanChars[i] = quote;
          skelChars[i] = quote;
          i++;
          break;
        }
        if (c === '\n') {
          cleanChars[i] = '\n';
          skelChars[i] = '\n';
          line++;
          lineOffsets.push(i + 1);
          i++;
          break;
        }
        val += c;
        cleanChars[i] = c;
        skelChars[i] = ' ';
        i++;
      }
      strings.push({ value: val, quote, line: startLine, start, end: i });
      lastNonWsChar = quote;
      continue;
    }

    // 4. Template literal `...${expr}...` (keeps ${expr} tokens in skeleton!)
    if (ch === '`') {
      const start = i;
      const startLine = line;
      cleanChars[i] = '`';
      skelChars[i] = '`';
      i++;
      let rawTemplate = '';
      let interpDepth = 0;
      const braceStack = [];

      while (i < len) {
        const c = source[i];
        const nx = i + 1 < len ? source[i + 1] : '';

        if (interpDepth === 0) {
          if (c === '\\') {
            cleanChars[i] = c;
            skelChars[i] = ' ';
            if (i + 1 < len) {
              rawTemplate += c + nx;
              if (nx === '\n') {
                cleanChars[i + 1] = '\n';
                skelChars[i + 1] = '\n';
                line++;
                lineOffsets.push(i + 2);
              } else {
                cleanChars[i + 1] = nx;
                skelChars[i + 1] = ' ';
              }
              i += 2;
              continue;
            }
          }
          if (c === '$' && nx === '{') {
            rawTemplate += '${expr}';
            cleanChars[i] = '$';
            cleanChars[i + 1] = '{';
            skelChars[i] = ' ';
            skelChars[i + 1] = '(';
            interpDepth = 1;
            braceStack.push(1);
            i += 2;
            continue;
          }
          if (c === '`') {
            cleanChars[i] = '`';
            skelChars[i] = '`';
            i++;
            break;
          }
          if (c === '\n') {
            rawTemplate += '\n';
            cleanChars[i] = '\n';
            skelChars[i] = '\n';
            line++;
            lineOffsets.push(i + 1);
          } else {
            rawTemplate += c;
            cleanChars[i] = c;
            skelChars[i] = ' ';
          }
          i++;
        } else {
          if (c === '\n') {
            cleanChars[i] = '\n';
            skelChars[i] = '\n';
            line++;
            lineOffsets.push(i + 1);
            i++;
            continue;
          }
          if (c === '{') {
            braceStack[braceStack.length - 1]++;
            cleanChars[i] = '{';
            skelChars[i + 1 - 1] = '{';
            i++;
            continue;
          }
          if (c === '}') {
            braceStack[braceStack.length - 1]--;
            if (braceStack[braceStack.length - 1] === 0) {
              braceStack.pop();
              interpDepth--;
              cleanChars[i] = '}';
              skelChars[i] = ')';
              i++;
              continue;
            }
            cleanChars[i] = '}';
            skelChars[i] = '}';
            i++;
            continue;
          }
          if (c === "'" || c === '"') {
            const q = c;
            const sStart = i;
            const sLine = line;
            let sVal = '';
            cleanChars[i] = q;
            skelChars[i] = q;
            i++;
            while (i < len && source[i] !== q && source[i] !== '\n') {
              if (source[i] === '\\' && i + 1 < len) {
                sVal += source[i] + source[i + 1];
                cleanChars[i] = source[i];
                cleanChars[i + 1] = source[i + 1];
                skelChars[i] = ' ';
                skelChars[i + 1] = ' ';
                i += 2;
                continue;
              }
              sVal += source[i];
              cleanChars[i] = source[i];
              skelChars[i] = ' ';
              i++;
            }
            if (i < len && source[i] === q) {
              cleanChars[i] = q;
              skelChars[i] = q;
              i++;
            }
            strings.push({ value: sVal, quote: q, line: sLine, start: sStart, end: i });
            continue;
          }
          cleanChars[i] = c;
          skelChars[i] = c;
          i++;
        }
      }
      strings.push({ value: rawTemplate, quote: '`', line: startLine, start, end: i });
      lastNonWsChar = '`';
      continue;
    }

    // 5. Regex literal /.../flags (only when preceded by operator/punctuation, avoiding JSX </tag>)
    if (ch === '/' && next !== '/' && next !== '*' && next !== '>' && REGEX_PRECEDING_TOKENS.has(lastNonWsChar)) {
      let j = i + 1;
      let inCharClass = false;
      let validRegex = false;
      while (j < len && source[j] !== '\n') {
        if (source[j] === '\\') {
          j += 2;
          continue;
        }
        if (source[j] === '[') inCharClass = true;
        else if (source[j] === ']') inCharClass = false;
        else if (source[j] === '/' && !inCharClass) {
          validRegex = true;
          break;
        }
        j++;
      }
      if (validRegex && j > i + 1) {
        cleanChars[i] = '/';
        skelChars[i] = '/';
        i++;
        while (i < j) {
          cleanChars[i] = source[i];
          skelChars[i] = ' ';
          i++;
        }
        cleanChars[i] = '/';
        skelChars[i] = '/';
        i++;
        while (i < len && /[dgimsuvy]/.test(source[i])) {
          cleanChars[i] = source[i];
          skelChars[i] = source[i];
          i++;
        }
        lastNonWsChar = '/';
        continue;
      }
    }

    cleanChars[i] = ch;
    skelChars[i] = ch;
    if (ch !== ' ' && ch !== '\t' && ch !== '\r') {
      lastNonWsChar = ch;
    }
    i++;
  }

  return {
    cleanCode: cleanChars.join(''),
    skeleton: skelChars.join(''),
    strings,
    lineOffsets,
    totalLines: line
  };
}

/**
 * Binary search 0-based byte index -> 1-based line number.
 */
export function indexToLine(lineOffsets, index) {
  let lo = 0;
  let hi = lineOffsets.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (lineOffsets[mid] <= index) {
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return hi + 1;
}

/**
 * Given `skeleton` (strings & comments stripped) and the index of `{`,
 * returns the matching `}` index, or -1 if unbalanced.
 */
export function findMatchingBrace(skeleton, openIndex) {
  if (skeleton[openIndex] !== '{') return -1;
  let depth = 0;
  for (let i = openIndex; i < skeleton.length; i++) {
    if (skeleton[i] === '{') depth++;
    else if (skeleton[i] === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Conservative multilingual BPE token estimator calibrated against Gemini/Claude/Tiktoken:
 * - CJK / non-ASCII ideographs: ~1.55 tokens per character
 * - ASCII words/code/punctuation: ~0.28 tokens per character (~3.6 chars/token)
 */
export function estimateTokens(text) {
  if (!text) return 0;
  let cjkCount = 0;
  let asciiCount = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code > 0x7f) cjkCount++;
    else asciiCount++;
  }
  return Math.ceil(cjkCount * 1.55 + asciiCount * 0.28);
}
