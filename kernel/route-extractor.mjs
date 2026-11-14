import path from 'node:path';
import { findMatchingBrace, indexToLine } from './lexer.mjs';
import { normalizeApiPath } from './module-resolver.mjs';

/**
 * Extract SQL tables & persistence effects from a clean code snippet.
 */
export function inspectEffects(cleanSnippet, mutableGlobalNames) {
  const dbWrites = new Set();
  const dbReads = new Set();
  const memoryMutations = new Set();

  let m;
  const insertRe = /\bINSERT\s+(?:OR\s+\w+\s+)?INTO\s+[`"'[]?([a-zA-Z0-9_]+)[`"'\]]?/gi;
  while ((m = insertRe.exec(cleanSnippet)) !== null) dbWrites.add(m[1]);

  const updateRe = /\bUPDATE\s+[`"'[]?([a-zA-Z0-9_]+)[`"'\]]?\s+SET\b/gi;
  while ((m = updateRe.exec(cleanSnippet)) !== null) dbWrites.add(m[1]);

  const deleteRe = /\bDELETE\s+FROM\s+[`"'[]?([a-zA-Z0-9_]+)[`"'\]]?/gi;
  while ((m = deleteRe.exec(cleanSnippet)) !== null) dbWrites.add(m[1]);

  const selectRe = /\bSELECT\b[\s\S]{1,220}?\bFROM\s+[`"'[]?([a-zA-Z0-9_]+)[`"'\]]?/gi;
  while ((m = selectRe.exec(cleanSnippet)) !== null) dbReads.add(m[1]);

  const prismaWriteRe = /\b(?:prisma|db)\.([a-zA-Z0-9_]+)\.(?:create|createMany|update|updateMany|upsert|delete|deleteMany)\s*\(/g;
  while ((m = prismaWriteRe.exec(cleanSnippet)) !== null) {
    if (m[1] !== 'prepare') dbWrites.add(m[1]);
  }
  const prismaReadRe = /\b(?:prisma|db)\.([a-zA-Z0-9_]+)\.(?:findUnique|findFirst|findMany|count)\s*\(/g;
  while ((m = prismaReadRe.exec(cleanSnippet)) !== null) {
    if (m[1] !== 'prepare') dbReads.add(m[1]);
  }

  const supaRe = /\.from\s*\(\s*['"`]([a-zA-Z0-9_]+)['"`]\s*\)\s*\.\s*(insert|update|upsert|delete|select)\s*\(/g;
  while ((m = supaRe.exec(cleanSnippet)) !== null) {
    if (m[2] === 'select') dbReads.add(m[1]);
    else dbWrites.add(m[1]);
  }

  const drizzleWriteRe = /\bdb\.(?:insert|update|delete)\s*\(\s*([a-zA-Z0-9_]+)\s*\)/g;
  while ((m = drizzleWriteRe.exec(cleanSnippet)) !== null) dbWrites.add(m[1]);
  const drizzleReadRe = /\bdb\.select\s*\([^)]*\)\s*\.from\s*\(\s*([a-zA-Z0-9_]+)\s*\)/g;
  while ((m = drizzleReadRe.exec(cleanSnippet)) !== null) dbReads.add(m[1]);

  const mongooseWriteRe = /\b([A-Z][A-Za-z0-9_]*)\.(?:create|insertMany|findOneAndUpdate|findByIdAndUpdate|updateOne|updateMany|deleteOne|deleteMany|findByIdAndDelete)\s*\(/g;
  while ((m = mongooseWriteRe.exec(cleanSnippet)) !== null) {
    if (!['Object', 'Promise', 'Array', 'JSON', 'Math'].includes(m[1])) dbWrites.add(m[1]);
  }
  const mongooseReadRe = /\b([A-Z][A-Za-z0-9_]*)\.(?:find|findOne|findById|countDocuments)\s*\(/g;
  while ((m = mongooseReadRe.exec(cleanSnippet)) !== null) {
    if (!['Object', 'Promise', 'Array', 'JSON', 'Math'].includes(m[1])) dbReads.add(m[1]);
  }

  if (/\b(?:session|db\.session)\.(?:add|add_all|delete|commit)\s*\(/.test(cleanSnippet)) {
    dbWrites.add('sqlalchemy_orm');
  }
  const djangoWriteRe = /\b([A-Z][A-Za-z0-9_]*)\.objects\.(?:create|bulk_create|update_or_create|update|delete)\s*\(/g;
  while ((m = djangoWriteRe.exec(cleanSnippet)) !== null) dbWrites.add(m[1]);
  const pyReadRe = /\b(?:([A-Z][A-Za-z0-9_]*)\.objects\.(?:filter|get|all)|(?:session|db\.session)\.query\s*\(\s*([A-Z][A-Za-z0-9_]*))/g;
  while ((m = pyReadRe.exec(cleanSnippet)) !== null) dbReads.add(m[1] || m[2] || 'orm_query');

  for (const gName of mutableGlobalNames) {
    const mutRe = new RegExp(`\\b${gName}\\.(?:push|unshift|splice|pop|shift|set|add|delete|clear)\\s*\\(`, 'g');
    const reassignRe = new RegExp(`\\b${gName}\\s*=\\s*`, 'g');
    if (mutRe.test(cleanSnippet) || reassignRe.test(cleanSnippet)) {
      memoryMutations.add(gName);
    }
  }

  const hasOutboundLlm =
    /\/chat\/completions\b|\/v1\/messages\b|\/v1\/responses\b|generativelanguage\.googleapis|dashscope\.aliyuncs|ark\.cn-beijing\.volces|OpenAI\s*\(|Anthropic\s*\(/.test(cleanSnippet);

  const hasLocalFallback = /fallbackBuilder|local_smart|mockResponse|demoTemplate/.test(cleanSnippet);

  return {
    dbWrites: [...dbWrites],
    dbReads: [...dbReads],
    memoryMutations: [...memoryMutations],
    hasOutboundLlm,
    hasLocalFallback
  };
}

function resolveExportedFunction(targetAbsPath, exportedName, fileDataMap, seen = new Set()) {
  const visitKey = `${targetAbsPath}::${exportedName}`;
  if (seen.has(visitKey)) return null;
  seen.add(visitKey);

  const mod = fileDataMap.get(targetAbsPath);
  if (!mod) return null;

  if (mod.functions.has(exportedName)) {
    return { absPath: targetAbsPath, fnObj: mod.functions.get(exportedName) };
  }

  for (const re of mod.reExports) {
    if (re.star) {
      const hit = resolveExportedFunction(re.targetAbsPath, exportedName, fileDataMap, seen);
      if (hit) return hit;
    } else if (re.map && re.map.has(exportedName)) {
      const orig = re.map.get(exportedName);
      const hit = resolveExportedFunction(re.targetAbsPath, orig, fileDataMap, seen);
      if (hit) return hit;
    }
  }
  return null;
}

export function traceTransitiveEffects(snippet, absPath, fileDataMap, maxHops = 3) {
  const agg = {
    dbWrites: new Set(),
    dbReads: new Set(),
    memoryMutations: new Set(),
    hasOutboundLlm: false,
    hasLocalFallback: false,
    visitedFns: []
  };

  const visited = new Set();

  function walkSnippet(codeText, currentAbsPath, hop) {
    const modData = fileDataMap.get(currentAbsPath);
    const globalNames = modData ? modData.mutableGlobals.map(g => g.name) : [];
    const direct = inspectEffects(codeText, globalNames);

    direct.dbWrites.forEach(t => agg.dbWrites.add(t));
    direct.dbReads.forEach(t => agg.dbReads.add(t));
    direct.memoryMutations.forEach(v => agg.memoryMutations.add(`${path.basename(currentAbsPath)}:${v}`));
    if (direct.hasOutboundLlm) agg.hasOutboundLlm = true;
    if (direct.hasLocalFallback) agg.hasLocalFallback = true;

    if (hop >= maxHops || !modData) return;

    const callRe = /\b([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g;
    let m;
    while ((m = callRe.exec(codeText)) !== null) {
      const callee = m[1];
      if (['if', 'for', 'while', 'switch', 'catch', 'return', 'fetch', 'sendJson', 'readJson', 'Number', 'String', 'Boolean', 'Promise', 'JSON'].includes(callee)) {
        continue;
      }

      if (modData.functions.has(callee)) {
        const key = `${currentAbsPath}#${callee}`;
        if (!visited.has(key)) {
          visited.add(key);
          agg.visitedFns.push(callee);
          walkSnippet(modData.functions.get(callee).cleanBody, currentAbsPath, hop + 1);
        }
      }

      if (modData.imports.has(callee)) {
        const imp = modData.imports.get(callee);
        const resolvedFn = resolveExportedFunction(imp.targetAbsPath, imp.exportedName, fileDataMap);
        if (resolvedFn) {
          const key = `${resolvedFn.absPath}#${resolvedFn.fnObj.name}`;
          if (!visited.has(key)) {
            visited.add(key);
            agg.visitedFns.push(`${callee}`);
            walkSnippet(resolvedFn.fnObj.cleanBody, resolvedFn.absPath, hop + 1);
          }
        }
      }
    }
  }

  walkSnippet(snippet, absPath, 0);

  return {
    dbWrites: [...agg.dbWrites],
    dbReads: [...agg.dbReads],
    memoryMutations: [...agg.memoryMutations],
    hasOutboundLlm: agg.hasOutboundLlm,
    hasLocalFallback: agg.hasLocalFallback,
    tracedHelpers: agg.visitedFns.slice(0, 8)
  };
}

export function extractFrontendCalls(fileDataMap) {
  const calls = [];

  for (const [, modData] of fileDataMap.entries()) {
    const { file, lex, isReachable } = modData;
    if (file.role !== 'frontend' || !isReachable) continue;

    for (const str of lex.strings) {
      const rawTrim = str.value.trim();
      const apiIdx = rawTrim.indexOf('/api/');
      if (apiIdx === -1) continue;
      if (apiIdx > 0 && !/^(?:https?:\/\/[^/]+|\$\{expr\})$/.test(rawTrim.slice(0, apiIdx))) continue;
      const val = rawTrim.slice(apiIdx);

      const ctxBefore = lex.cleanCode.slice(Math.max(0, str.start - 110), str.start);
      const isDirectCall = /(?:fetch|useFetch|useSWR|[A-Za-z0-9_$]*(?:Fetch|Api|Post|Put|Patch|Delete|Request|Client)|axios|request|http|sendBeacon|client)\s*(?:\.[a-zA-Z]+)?\s*\(\s*$/i.test(
        ctxBefore
      );
      const isMiniProgramUrlProp = /(?:wx|uni|Taro|my|tt)\.request\s*\(\s*\{[\s\S]{0,110}?\burl\s*:\s*(?:[A-Za-z0-9_$.]+\s*\+\s*)?$/i.test(ctxBefore);
      if (!isDirectCall && !isMiniProgramUrlProp) continue;

      const openParenIdx = lex.skeleton.lastIndexOf('(', str.start);
      let closeParenIdx = Math.min(lex.cleanCode.length, str.end + 180);
      if (openParenIdx !== -1) {
        let depth = 0;
        for (let k = openParenIdx; k < lex.skeleton.length; k++) {
          if (lex.skeleton[k] === '(') depth++;
          else if (lex.skeleton[k] === ')') {
            depth--;
            if (depth === 0) {
              closeParenIdx = k;
              break;
            }
          }
        }
      }
      const ctxAfter = lex.cleanCode.slice(str.end, closeParenIdx);

      let method = 'GET';
      const methodMatch = ctxAfter.match(/method\s*:\s*['"]([A-Za-z]+)['"]/i);
      if (methodMatch) {
        method = methodMatch[1].toUpperCase();
      } else if (/sendBeacon|\.(?:post)\s*\(\s*$/i.test(ctxBefore) || /[A-Za-z0-9_$]*Post\s*\(\s*$/i.test(ctxBefore)) {
        method = 'POST';
      } else if (/\.(?:put)\s*\(\s*$/i.test(ctxBefore) || /[A-Za-z0-9_$]*Put\s*\(\s*$/i.test(ctxBefore)) {
        method = 'PUT';
      } else if (/\.(?:delete)\s*\(\s*$/i.test(ctxBefore) || /[A-Za-z0-9_$]*Delete\s*\(\s*$/i.test(ctxBefore)) {
        method = 'DELETE';
      }

      calls.push({
        rawPath: val,
        normPath: normalizeApiPath(val),
        method,
        file: file.relPath,
        line: str.line
      });
    }
  }

  return calls;
}

export function extractBackendRoutes(fileDataMap) {
  const routes = [];

  for (const [absPath, modData] of fileDataMap.entries()) {
    const { file, lex } = modData;
    if (file.role === 'frontend' || file.role === 'test') continue;

    const { cleanCode, skeleton, lineOffsets } = lex;
    const authBarriers = [];
    const authGateRe = /if\s*\(\s*![A-Za-z0-9_$]*(?:ctx|session|user|auth|token|admin)[A-Za-z0-9_$]*\b[^)]*\)\s*return\s+[^;]*?(?:401|403|Unauthorized|未登录|登录已失效|口令|鉴权)/gi;
    let ag;
    while ((ag = authGateRe.exec(cleanCode)) !== null) {
      let openB = -1;
      let d = 0;
      for (let k = ag.index; k >= 0; k--) {
        if (skeleton[k] === '}') d++;
        else if (skeleton[k] === '{') {
          if (d === 0) {
            openB = k;
            break;
          }
          d--;
        }
      }
      const closeB = openB !== -1 ? findMatchingBrace(skeleton, openB) : cleanCode.length;
      authBarriers.push({ gateIndex: ag.index, scopeEnd: closeB > openB ? closeB : cleanCode.length });
    }

    const ifHeaderRe = /\bif\s*\(/g;
    let m;
    while ((m = ifHeaderRe.exec(skeleton)) !== null) {
      const openParen = m.index + m[0].length - 1;
      let depth = 0;
      let closeParen = -1;
      for (let k = openParen; k < skeleton.length; k++) {
        if (skeleton[k] === '(') depth++;
        else if (skeleton[k] === ')') {
          depth--;
          if (depth === 0) {
            closeParen = k;
            break;
          }
        }
      }
      if (closeParen === -1) continue;

      const cond = cleanCode.slice(openParen + 1, closeParen);
      const routeMatch = cond.match(/(?:pathname|urlPath|req\.url)\s*(?:===|==|\.startsWith\()\s*['"`](\/api\/[^'"`]+)['"`]/);
      if (!routeMatch) continue;

      const rawRoute = routeMatch[1];
      if (rawRoute === '/api/' || rawRoute === '/api') continue;

      const methodMatch = cond.match(/req\.method\s*===\s*['"]([A-Z]+)['"]/);
      const method = methodMatch ? methodMatch[1].toUpperCase() : 'ANY';
      const isPrefix = cond.includes('.startsWith(');
      const afterCondIdx = closeParen + 1;

      let handlerSnippet = '';
      const nextNonWs = skeleton.slice(afterCondIdx).search(/\S/);
      if (nextNonWs !== -1) {
        const bodyStart = afterCondIdx + nextNonWs;
        if (skeleton[bodyStart] === '{') {
          const closeBrace = findMatchingBrace(skeleton, bodyStart);
          if (closeBrace > bodyStart) handlerSnippet = cleanCode.slice(bodyStart, closeBrace + 1);
        } else {
          const semi = cleanCode.indexOf(';', bodyStart);
          if (semi !== -1) handlerSnippet = cleanCode.slice(bodyStart, semi + 1);
        }
      }

      if (isPrefix && /(?:pathname|urlPath|req\.url)\s*===\s*['"`]\/api\//.test(handlerSnippet)) continue;

      const localHasAuth = /\b(?:ctx|adminCtx|getAuthCtx|getAdminCtx|getAuthUser|requireAuth|requireAdmin|verifyToken|checkAdmin|session)\b/.test(handlerSnippet);
      const protectedByBarrier = authBarriers.some(b => m.index > b.gateIndex && m.index < b.scopeEnd);
      const isAuthenticated = localHasAuth || protectedByBarrier;
      const effects = traceTransitiveEffects(handlerSnippet, absPath, fileDataMap);

      routes.push({
        rawPath: rawRoute,
        normPath: normalizeApiPath(rawRoute),
        isPrefix,
        method,
        file: file.relPath,
        line: indexToLine(lineOffsets, m.index),
        isAuthenticated,
        ...effects
      });
    }

    const expressRe = /\b(?:app|router|server|fastify)\.(get|post|put|delete|patch|all)\s*\(\s*['"`](\/api\/[^'"`]+)['"`]/gi;
    while ((m = expressRe.exec(cleanCode)) !== null) {
      const method = m[1].toUpperCase();
      const rawRoute = m[2];
      const searchSlice = skeleton.slice(m.index, Math.min(skeleton.length, m.index + 300));
      const braceRel = searchSlice.indexOf('{');
      let handlerSnippet = '';
      if (braceRel !== -1) {
        const openBrace = m.index + braceRel;
        const closeBrace = findMatchingBrace(skeleton, openBrace);
        if (closeBrace > openBrace) handlerSnippet = cleanCode.slice(openBrace, closeBrace + 1);
      }
      const headerSlice = cleanCode.slice(m.index, Math.min(cleanCode.length, m.index + (braceRel !== -1 ? braceRel : 160)));
      const isAuthenticated = /auth|jwt|session|guard|protect|admin/i.test(headerSlice) || /\b(?:getAuthCtx|requireAuth|verifyToken|req\.user)\b/.test(handlerSnippet);
      const effects = traceTransitiveEffects(handlerSnippet, absPath, fileDataMap);

      routes.push({
        rawPath: rawRoute,
        normPath: normalizeApiPath(rawRoute),
        isPrefix: false,
        method: method === 'ALL' ? 'ANY' : method,
        file: file.relPath,
        line: indexToLine(lineOffsets, m.index),
        isAuthenticated,
        ...effects
      });
    }

    if (file.ext === '.py') {
      const pyRouteRe = /@(?:app|router|api|bp)\.(get|post|put|delete|patch|route)\s*\(\s*['"](\/api\/[^'"]+)['"]([^)]*)\)/g;
      while ((m = pyRouteRe.exec(cleanCode)) !== null) {
        let method = m[1].toUpperCase();
        const rawRoute = m[2];
        const extraArgs = m[3] || '';
        if (method === 'ROUTE') {
          const mm = extraArgs.match(/methods\s*=\s*\[['"]([A-Za-z]+)['"]/i);
          method = mm ? mm[1].toUpperCase() : 'ANY';
        }
        const handlerSnippet = cleanCode.slice(m.index, Math.min(cleanCode.length, m.index + 650));
        const isAuthenticated = /Depends\(|current_user|verify_token|login_required|authorization/i.test(handlerSnippet);
        const effects = inspectEffects(handlerSnippet, []);
        routes.push({
          rawPath: rawRoute,
          normPath: normalizeApiPath(rawRoute),
          isPrefix: false,
          method,
          file: file.relPath,
          line: indexToLine(lineOffsets, m.index),
          isAuthenticated,
          ...effects,
          tracedHelpers: []
        });
      }
      continue;
    }

    const nextMatch = file.relPath.match(/(?:^|\/)app(\/api\/.+)\/route\.[mc]?[jt]sx?$/);
    if (nextMatch) {
      const rawRoute = nextMatch[1];
      const nextFnRe = /export\s+(?:async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH)\s*\([^)]*\)\s*\{/g;
      while ((m = nextFnRe.exec(skeleton)) !== null) {
        const method = m[1].toUpperCase();
        const openBrace = m.index + m[0].length - 1;
        const closeBrace = findMatchingBrace(skeleton, openBrace);
        const handlerSnippet = closeBrace > openBrace ? cleanCode.slice(openBrace, closeBrace + 1) : '';
        const isAuthenticated = /getServerSession|auth\(|verifyToken|cookies\(\)|headers\(\)|currentUser/.test(handlerSnippet);
        const effects = traceTransitiveEffects(handlerSnippet, absPath, fileDataMap);

        routes.push({
          rawPath: rawRoute,
          normPath: normalizeApiPath(rawRoute),
          isPrefix: false,
          method,
          file: file.relPath,
          line: indexToLine(lineOffsets, m.index),
          isAuthenticated,
          ...effects
        });
      }
    }

    const pagesApiMatch = file.relPath.match(/(?:^|\/)pages(\/api\/.+)\.[mc]?[jt]sx?$/);
    if (pagesApiMatch) {
      const rawRoute = pagesApiMatch[1].replace(/\/index$/, '');
      const isAuthenticated = /getServerSession|verifyToken|authorization|req\.cookies|checkAdmin/i.test(cleanCode);
      const effects = traceTransitiveEffects(cleanCode, absPath, fileDataMap);
      routes.push({
        rawPath: rawRoute,
        normPath: normalizeApiPath(rawRoute),
        isPrefix: false,
        method: 'ANY',
        file: file.relPath,
        line: 1,
        isAuthenticated,
        ...effects
      });
    }
  }

  return routes;
}
