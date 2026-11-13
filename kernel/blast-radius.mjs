import path from 'node:path';
import { buildLineageGraph } from './lineage-graph.mjs';

/**
 * Compute deterministic Blast Radius & Safe Edit Scope for a user's feature/file keyword.
 * Supports matching file paths, API endpoints, function names, AND Chinese UI labels!
 */
export function computeBlastRadius(workspace, query, existingLineage = null) {
  const lineage = existingLineage || buildLineageGraph(workspace);
  const q = String(query || '').trim().toLowerCase();

  // Build forward & reverse module import graphs (relPath <-> relPath)
  const forwardImports = new Map(); // relPath -> Set<relPath>
  const reverseImports = new Map(); // relPath -> Set<relPath>

  for (const [, modData] of lineage.fileDataMap.entries()) {
    const srcRel = modData.file.relPath;
    if (!forwardImports.has(srcRel)) forwardImports.set(srcRel, new Set());
    if (!reverseImports.has(srcRel)) reverseImports.set(srcRel, new Set());

    for (const [, imp] of modData.imports.entries()) {
      const targetMod = lineage.fileDataMap.get(imp.targetAbsPath);
      if (!targetMod) continue;
      const dstRel = targetMod.file.relPath;
      forwardImports.get(srcRel).add(dstRel);
      if (!reverseImports.has(dstRel)) reverseImports.set(dstRel, new Set());
      reverseImports.get(dstRel).add(srcRel);
    }
  }

  // Match seed files by path, function symbol, API endpoint, or Chinese/English UI string literal
  const seedFiles = new Set();
  for (const [, modData] of lineage.fileDataMap.entries()) {
    const rel = modData.file.relPath;
    if (!q) continue;

    if (rel.toLowerCase().includes(q)) {
      seedFiles.add(rel);
      continue;
    }

    if (!modData.isReachable) continue; // Never route feature edits into dead unmounted zombie files!

    if (modData.lex.cleanCode.toLowerCase().includes(q)) {
      seedFiles.add(rel);
    }
  }

  // Collect 1-hop upstream/downstream neighbors
  const neighborFiles = new Set();
  for (const seed of seedFiles) {
    for (const dep of forwardImports.get(seed) || []) {
      if (!seedFiles.has(dep)) neighborFiles.add(dep);
    }
    for (const caller of reverseImports.get(seed) || []) {
      if (!seedFiles.has(caller)) neighborFiles.add(caller);
    }
  }

  // Find API contracts & DB tables touched by seed files
  const linkedApis = [];
  const touchedTables = new Set();
  for (const chain of lineage.chains) {
    const feFile = chain.frontend.split(':')[0];
    const beFile = chain.backend.split(':')[0];
    if (seedFiles.has(feFile) || seedFiles.has(beFile)) {
      linkedApis.push(`${chain.method} ${chain.endpoint} (${chain.frontend} -> ${chain.backend})`);
      const tableMatches = chain.persistence.match(/\[([^\]]+)\]/);
      if (tableMatches) {
        tableMatches[1].split(',').map(s => s.trim()).filter(Boolean).forEach(t => touchedTables.add(t));
      }
    }
  }

  // Check if any seed/neighbor frontend file requires static `dist/` rebuild
  const requiredBuilds = [];
  for (const sb of workspace.staleBuilds) {
    const prefix = sb.appDir === '.' ? 'src/' : `${sb.appDir}/src/`;
    const touchesApp = [...seedFiles].some(f => f.startsWith(prefix));
    if (touchesApp) {
      const cmd = sb.appDir === '.' ? 'npm run build' : `npm --prefix ${sb.appDir} run build`;
      requiredBuilds.push(cmd);
    }
  }

  const totalWorkspaceFiles = lineage.fileDataMap.size;
  const seedList = [...seedFiles].slice(0, 8);
  const neighborList = [...neighborFiles].slice(0, 8);
  const maxSafeFiles = Math.max(2, Math.min(5, seedList.length + 1));
  const forbiddenCount = Math.max(0, totalWorkspaceFiles - seedList.length - neighborList.length);

  const founderMarkdown = [
    `# 🎯 GhostCTO 改动爆炸半径锁定单（防改A崩B）`,
    `- **需求定位词**：「${query}」`,
    `- **直接命中的目标文件 (${seedList.length} 个)**：${seedList.map(f => `\`${f}\``).join(', ') || '未精确命中，请缩小关键词'}`,
    `- **上下游关联文件 (${neighborList.length} 个，只读核对契约)**：${neighborList.map(f => `\`${f}\``).join(', ') || '无'}`,
    `- **牵连的接口契约 (${linkedApis.length} 条，严禁破坏返回字段)**：`,
    ...(linkedApis.slice(0, 6).map(a => `  - \`${a}\``)),
    `- **关联数据库真表**：${[...touchedTables].join(', ') || '无直接表变更'}`,
    `- **🔒 安全施工红线**：本次最多允许修改 **${maxSafeFiles}** 个文件，严禁顺手乱改其余 **${forbiddenCount}** 个无关业务文件！`,
    ...(requiredBuilds.length > 0
      ? [`- **⚡ 改完必做刷新动作**：必须执行 \`${requiredBuilds.join(' && ')}\` 重新打包静态页面，否则浏览器刷新看不到变化！`]
      : [])
  ].join('\n');

  const aiCompact = [
    `GHOST_IMPACT|query:${query}|max_edit_files:${maxSafeFiles}|untouchable_files:${forbiddenCount}`,
    `TARGETS|${seedList.join(',') || 'NONE'}`,
    `NEIGHBORS_READONLY|${neighborList.join(',') || 'NONE'}`,
    `LOCKED_APIS|${linkedApis.slice(0, 6).join(';') || 'NONE'}`,
    `LOCKED_TABLES|${[...touchedTables].join(',') || 'NONE'}`,
    `REQUIRED_POST_BUILD|${requiredBuilds.join(' && ') || 'NONE'}`
  ].join('\n');

  return {
    query,
    seedFiles: seedList,
    neighborFiles: neighborList,
    linkedApis,
    touchedTables: [...touchedTables],
    requiredBuilds,
    maxSafeFiles,
    forbiddenCount,
    founderMarkdown,
    aiCompact
  };
}
