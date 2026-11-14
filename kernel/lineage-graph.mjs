import fs from 'node:fs';
import path from 'node:path';
import { analyzeSource } from './lexer.mjs';
import {
  normalizeApiPath,
  extractImportsAndReExports,
  resolveModuleSpecifier,
  extractFunctions,
  extractMutableGlobals
} from './module-resolver.mjs';
import { extractFrontendCalls, extractBackendRoutes } from './route-extractor.mjs';

export { normalizeApiPath, extractImportsAndReExports, resolveModuleSpecifier };

function buildModuleSymbolIndex(workspace) {
  const fileDataMap = new Map();

  for (const file of workspace.codeFiles) {
    if (file.role === 'test') continue;
    let raw = '';
    try {
      raw = fs.readFileSync(file.absPath, 'utf8');
    } catch (err) {
      if (process.env.GHOST_DEBUG) console.warn('[lineage-read]', err.message);
      continue;
    }
    const lex = analyzeSource(raw, file.ext);
    const { imports, reExports } = extractImportsAndReExports(
      lex.cleanCode,
      file.absPath,
      workspace.packagesMap,
      raw,
      file.ext,
      lex
    );
    const functions = extractFunctions(raw, lex);
    const mutableGlobals = extractMutableGlobals(lex);

    fileDataMap.set(file.absPath, {
      file,
      raw,
      lex,
      imports,
      reExports,
      functions,
      mutableGlobals,
      isReachable: true
    });
  }

  markReachability(fileDataMap, workspace);
  return fileDataMap;
}

function markReachability(fileDataMap, workspace) {
  const entryAbsPaths = new Set();
  const appDirsWithEntry = new Set();

  for (const [absPath, modData] of fileDataMap.entries()) {
    const rel = modData.file.relPath;
    const base = path.basename(rel);
    if (modData.file.role !== 'frontend') {
      entryAbsPaths.add(absPath);
      continue;
    }
    if (
      modData.file.ext === '.html' ||
      /^(?:main|index|App)\.(?:[mc]?[jt]sx?|vue|svelte)$/i.test(base) ||
      /^\+(?:page|layout)\.svelte$/i.test(base) ||
      /(?:^|\/)(?:pages|app)\//.test(rel)
    ) {
      entryAbsPaths.add(absPath);
      appDirsWithEntry.add(path.dirname(absPath));
    }
  }

  for (const pkg of workspace.packagesMap.values()) {
    if (pkg.entryAbsPath && fileDataMap.has(pkg.entryAbsPath)) {
      entryAbsPaths.add(pkg.entryAbsPath);
    }
  }

  const visited = new Set();
  const queue = [...entryAbsPaths];
  while (queue.length > 0) {
    const curr = queue.pop();
    if (visited.has(curr)) continue;
    visited.add(curr);
    const mod = fileDataMap.get(curr);
    if (!mod) continue;
    for (const imp of mod.imports.values()) {
      if (!visited.has(imp.targetAbsPath)) queue.push(imp.targetAbsPath);
    }
    for (const re of mod.reExports) {
      if (!visited.has(re.targetAbsPath)) queue.push(re.targetAbsPath);
    }
  }

  for (const [absPath, modData] of fileDataMap.entries()) {
    if (modData.file.role === 'frontend' && modData.file.ext !== '.html') {
      const dir = path.dirname(absPath);
      const hasSiblingEntry = [...appDirsWithEntry].some(
        entryDir => dir === entryDir || dir.startsWith(entryDir + path.sep)
      );
      if (hasSiblingEntry && !visited.has(absPath)) {
        modData.isReachable = false;
      }
    }
  }
}

export function buildLineageGraph(workspace) {
  const fileDataMap = buildModuleSymbolIndex(workspace);
  const frontendCalls = extractFrontendCalls(fileDataMap);
  const backendRoutes = extractBackendRoutes(fileDataMap);

  const chains = [];
  const matchedRouteIndices = new Set();

  const uniqueCalls = [];
  const seenCallKey = new Set();
  for (const c of frontendCalls) {
    const key = `${c.method}|${c.normPath}|${c.file}:${c.line}`;
    if (!seenCallKey.has(key)) {
      seenCallKey.add(key);
      uniqueCalls.push(c);
    }
  }

  for (const call of uniqueCalls) {
    const matchIdx = backendRoutes.findIndex(r => {
      const methodOk = r.method === 'ANY' || r.method === call.method;
      if (!methodOk) return false;
      if (r.normPath === call.normPath) return true;
      if (r.isPrefix && call.normPath.startsWith(r.normPath)) return true;
      return false;
    });

    if (matchIdx === -1) {
      chains.push({
        status: 'BROKEN_CONTRACT',
        badge: '🔴 断头接口（404）',
        method: call.method,
        endpoint: call.rawPath,
        frontend: `${call.file}:${call.line}`,
        backend: '未找到对应后端接口',
        persistence: '无',
        summary: `前端调用了 ${call.method} ${call.rawPath}，但后端根本没有这个接口，点击必报错或无响应。`
      });
      continue;
    }

    matchedRouteIndices.add(matchIdx);
    chains.push(classifyMatchedChain(call, backendRoutes[matchIdx]));
  }

  backendRoutes.forEach((route, idx) => {
    if (matchedRouteIndices.has(idx)) return;
    const isPublicCallback = route.rawPath.startsWith('/api/public/');
    const chain = classifyMatchedChain(null, route);
    if (isPublicCallback) {
      chain.frontend = '外部H5页面回传';
    } else {
      chain.status = chain.status === 'VOLATILE_MEMORY' ? 'VOLATILE_MEMORY' : 'BACKEND_ONLY';
      if (chain.status === 'BACKEND_ONLY') chain.badge = '⚪ 仅后端接口';
      chain.frontend = '前端暂未直接调用';
    }
    chains.push(chain);
  });

  const schemaTables = extractSchemaTables(workspace, fileDataMap);
  const zombieFiles = [];
  for (const [, modData] of fileDataMap.entries()) {
    if (!modData.isReachable) zombieFiles.push(modData.file.relPath);
  }

  return {
    schemaTables,
    zombieFiles,
    frontendCallCount: uniqueCalls.length,
    backendRouteCount: backendRoutes.length,
    chains,
    backendRoutes,
    frontendCalls: uniqueCalls,
    fileDataMap
  };
}

function classifyMatchedChain(call, route) {
  const feRef = call ? `${call.file}:${call.line}` : '外部/直接请求';
  const beRef = `${route.file}:${route.line}`;
  const isMutationMethod = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(
    route.method === 'ANY' && call ? call.method : route.method
  );
  const methodLabel = call ? call.method : route.method;

  if (route.memoryMutations.length > 0 && route.dbWrites.length === 0) {
    return {
      status: 'VOLATILE_MEMORY',
      badge: '🟡 内存假落库（重启即丢）',
      method: methodLabel,
      endpoint: route.rawPath,
      frontend: feRef,
      backend: beRef,
      persistence: `仅改内存变量 (${route.memoryMutations.join(', ')})`,
      isAuthenticated: route.isAuthenticated,
      summary: '表面操作成功，但数据只存在服务器内存变量里，一旦重启程序或断电，客户数据瞬间清零！'
    };
  }

  if (route.hasOutboundLlm && route.dbWrites.length > 0) {
    return {
      status: 'REAL_AI_AND_DB',
      badge: '🟢 真AI调用 + 真落库',
      method: methodLabel,
      endpoint: route.rawPath,
      frontend: feRef,
      backend: beRef,
      persistence: `外部大模型 + 写库 [${route.dbWrites.join(', ')}]`,
      isAuthenticated: route.isAuthenticated,
      summary: route.hasLocalFallback
        ? `已接通外部大模型并写入 [${route.dbWrites.join(', ')}] 表（未填 Key 时自动降级本地智能模板）。`
        : `已接通真实外部大模型并持久化到 [${route.dbWrites.join(', ')}] 表。`
    };
  }

  if (route.dbWrites.length > 0) {
    return {
      status: 'REAL_DB_WRITE',
      badge: '🟢 真通落库（永久保存）',
      method: methodLabel,
      endpoint: route.rawPath,
      frontend: feRef,
      backend: beRef,
      persistence: `写库 [${route.dbWrites.join(', ')}]`,
      isAuthenticated: route.isAuthenticated,
      summary: `前后端已打通，数据真实写入数据库 [${route.dbWrites.join(', ')}] 表，重启不丢。`
    };
  }

  if (route.dbReads.length > 0) {
    return {
      status: 'REAL_DB_READ',
      badge: '🟢 真查数据库',
      method: methodLabel,
      endpoint: route.rawPath,
      frontend: feRef,
      backend: beRef,
      persistence: `读库 [${route.dbReads.join(', ')}]`,
      isAuthenticated: route.isAuthenticated,
      summary: `从真实数据库 [${route.dbReads.join(', ')}] 表读取实时数据。`
    };
  }

  if (route.hasOutboundLlm) {
    return {
      status: 'REAL_AI_STATELESS',
      badge: '🟢 真连大模型（即时测连）',
      method: methodLabel,
      endpoint: route.rawPath,
      frontend: feRef,
      backend: beRef,
      persistence: '实时外部大模型请求',
      isAuthenticated: route.isAuthenticated,
      summary: '真实请求外部大模型接口返回结果（不落库）。'
    };
  }

  if (isMutationMethod) {
    return {
      status: 'STATELESS_MUTATION_SHELL',
      badge: '🟡 疑似演示壳（未见落库）',
      method: methodLabel,
      endpoint: route.rawPath,
      frontend: feRef,
      backend: beRef,
      persistence: '未检测到数据库写入',
      isAuthenticated: route.isAuthenticated,
      summary: `这是一个提交型接口 (${methodLabel})，但未追踪到数据库写入动作，请确认是否为静态演示数据。`
    };
  }

  return {
    status: 'STATIC_CONFIG',
    badge: '🟢 常量/配置只读',
    method: methodLabel,
    endpoint: route.rawPath,
    frontend: feRef,
    backend: beRef,
    persistence: '静态配置目录',
    isAuthenticated: route.isAuthenticated,
    summary: '返回套餐或系统常量配置。'
  };
}

function extractSchemaTables(workspace, fileDataMap) {
  const tables = new Set();
  const createTableRe = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"'[]?([a-zA-Z0-9_]+)[`"'\]]?/gi;
  const drizzleTableRe = /\b(?:sqliteTable|pgTable|mysqlTable)\s*\(\s*['"`]([a-zA-Z0-9_]+)['"`]/g;
  const mongooseModelRe = /\bmongoose\.model\s*\(\s*['"`]([A-Za-z0-9_]+)['"`]/g;
  const pyTableNameRe = /__tablename__\s*=\s*['"]([a-zA-Z0-9_]+)['"]/g;
  const supaFromRe = /\.from\s*\(\s*['"`]([a-zA-Z0-9_]+)['"`]\s*\)\s*\.\s*(?:insert|update|upsert|delete|select)\s*\(/g;

  for (const [, modData] of fileDataMap.entries()) {
    const code = modData.lex.cleanCode;
    let m;
    while ((m = createTableRe.exec(code)) !== null) tables.add(m[1]);
    while ((m = drizzleTableRe.exec(code)) !== null) tables.add(m[1]);
    while ((m = mongooseModelRe.exec(code)) !== null) tables.add(m[1]);
    while ((m = pyTableNameRe.exec(code)) !== null) tables.add(m[1]);
    while ((m = supaFromRe.exec(code)) !== null) tables.add(m[1]);
  }
  for (const sqlFile of workspace.sqlFiles) {
    try {
      const content = fs.readFileSync(sqlFile.absPath, 'utf8');
      let m;
      const prismaModelRe = /^\s*model\s+([A-Za-z0-9_]+)\s*\{/gm;
      while ((m = createTableRe.exec(content)) !== null) tables.add(m[1]);
      while ((m = prismaModelRe.exec(content)) !== null) tables.add(m[1]);
    } catch (err) {
      if (process.env.GHOST_DEBUG) console.warn('[sql-read]', err.message);
    }
  }
  return [...tables];
}

export function formatLineageReport(lineage) {
  const broken = lineage.chains.filter(c => c.status === 'BROKEN_CONTRACT');
  const volatile = lineage.chains.filter(c => c.status === 'VOLATILE_MEMORY');
  const realWrite = lineage.chains.filter(c => c.status === 'REAL_DB_WRITE' || c.status === 'REAL_AI_AND_DB');
  const realRead = lineage.chains.filter(
    c => c.status === 'REAL_DB_READ' || c.status === 'REAL_AI_STATELESS' || c.status === 'STATIC_CONFIG'
  );
  const shell = lineage.chains.filter(c => c.status === 'STATELESS_MUTATION_SHELL');

  const lines = [
    `# 🔬 GhostCTO 全栈真假穿透 X 光报告`,
    `- 数据库真表 (${lineage.schemaTables.length} 张): ${lineage.schemaTables.join(', ') || '未检测到建表语句'}`,
    `- 前端接口调用: ${lineage.frontendCallCount} 处 | 后端注册路由: ${lineage.backendRouteCount} 条`,
    `- 🟢 真通落库/真查库: ${realWrite.length + realRead.length} 条 | 🟡 内存假落库/演示壳: ${volatile.length + shell.length} 条 | 🔴 404断头接口: ${broken.length} 条`,
    ``,
    `| 状态 | 接口 | 前端位置 | 后端位置 | 数据去向 | 大白话结论 |`,
    `| :--- | :--- | :--- | :--- | :--- | :--- |`
  ];

  for (const c of lineage.chains) {
    lines.push(`| ${c.badge} | \`${c.method} ${c.endpoint}\` | \`${c.frontend}\` | \`${c.backend}\` | ${c.persistence} | ${c.summary} |`);
  }

  const aiLines = [
    `GHOST_XRAY|tables:${lineage.schemaTables.length}|fe:${lineage.frontendCallCount}|be:${lineage.backendRouteCount}|real:${realWrite.length + realRead.length}|volatile:${volatile.length}|broken:${broken.length}`
  ];
  for (const c of [...broken, ...volatile, ...shell].slice(0, 12)) {
    aiLines.push(`${c.status}|${c.method} ${c.endpoint}|fe:${c.frontend}|be:${c.backend}|${c.persistence}`);
  }
  if (broken.length + volatile.length + shell.length === 0) {
    aiLines.push(
      `ALL_CHAINS_VERIFIED_REAL|sample:${lineage.chains.slice(0, 5).map(c => `${c.method}:${c.endpoint}->${c.persistence}`).join(';')}`
    );
  }

  return {
    founderMarkdown: lines.join('\n'),
    aiCompact: aiLines.join('\n'),
    stats: {
      tables: lineage.schemaTables.length,
      realCount: realWrite.length + realRead.length,
      volatileCount: volatile.length,
      shellCount: shell.length,
      brokenCount: broken.length
    }
  };
}
