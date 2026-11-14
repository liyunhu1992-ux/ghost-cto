/**
 * HTML/Vue/Svelte <script> extractor, embedded `String.raw` JS unwrapper,
 * and O(N) Python lexer preserving exact 1-based line numbers.
 */

/**
 * Mask non-script HTML markup into spaces while preserving exact byte length & newlines.
 */
export function extractHtmlScriptsWithLinePreservation(html) {
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
 * Unwrap embedded JS scripts stored inside `String.raw\`...\`` (e.g., SSR / static UI builders)
 * into spaces at the outer wrapper while preserving exact byte offsets & 1-based line numbers.
 */
export function unwrapEmbeddedStringRawScripts(source) {
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
export function analyzePythonSource(source) {
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

    if (ch === '#') {
      while (i < len && source[i] !== '\n') {
        cleanChars[i] = ' ';
        skelChars[i] = ' ';
        i++;
      }
      continue;
    }

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
