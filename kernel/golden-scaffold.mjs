import fs from 'node:fs';
import path from 'node:path';
import { saveIdeaBlueprint } from './idea-incubator.mjs';
import { scanWorkspace } from './scanner.mjs';
import { runRealityAudit } from './reality-audit.mjs';
import { saveCheckpoint } from './time-capsule.mjs';
import { writeMemoryCapsule } from './memory-capsule.mjs';
import { generateBossDashboard, generateSelfHealingLaunchers } from './boss-dashboard.mjs';
import { writeMiniProgramScaffold } from './miniprogram-scaffold.mjs';
import { buildGitignore, buildEnvExample, buildDockerfile, buildDbMjs } from './scaffold-db.mjs';
import { buildVibeShieldBrowserJs, buildAuthMjs } from './scaffold-auth.mjs';
import { buildServerMjs } from './scaffold-server.mjs';
import { buildAppJs } from './scaffold-ui-js.mjs';
import { buildStylesCss, buildIndexHtml } from './scaffold-ui-html.mjs';

/**
 * Turn a blank folder + any product idea (website, multi-module AI SaaS, business system, tool, or mini-program)
 * into a runnable, crash-armored SQLite foundation ready for custom bespoke evolution.
 */
export function bootstrapGoldenApp(targetRootDir, rawFragment = '', prefs = {}) {
  const absRoot = path.resolve(targetRootDir);
  fs.mkdirSync(absRoot, { recursive: true });

  const bp = saveIdeaBlueprint(absRoot, rawFragment, prefs);
  const existingWs = scanWorkspace(absRoot);

  if (existingWs.codeFiles.length > 0 && !prefs.force) {
    return {
      scaffolded: false,
      reason: 'EXISTING_CODE_PRESERVED',
      blueprint: bp,
      message: '当前文件夹已有业务代码，已为您安全生成 `.vibe/blueprint.md` 与 `.vibe/roadmap.json` 施工路线图（未覆盖任何现有代码）。'
    };
  }

  const pkgJson = {
    name: 'my-vibe-app',
    version: '1.0.0',
    private: true,
    type: 'module',
    scripts: {
      start: 'node src/server.mjs',
      dev: 'node src/server.mjs',
      verify: 'node .vibe/engine/bin/ghost-cto.mjs verify'
    }
  };

  fs.mkdirSync(path.join(absRoot, 'src'), { recursive: true });
  fs.mkdirSync(path.join(absRoot, 'public'), { recursive: true });
  fs.mkdirSync(path.join(absRoot, 'data'), { recursive: true });

  if (!fs.existsSync(path.join(absRoot, '.gitignore'))) {
    fs.writeFileSync(path.join(absRoot, '.gitignore'), buildGitignore(), 'utf8');
  }
  fs.writeFileSync(path.join(absRoot, '.env.example'), buildEnvExample(bp), 'utf8');
  if (bp.needPassword) {
    fs.writeFileSync(path.join(absRoot, 'Dockerfile'), buildDockerfile(), 'utf8');
  }

  fs.writeFileSync(path.join(absRoot, 'package.json'), JSON.stringify(pkgJson, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(absRoot, 'src', 'db.mjs'), buildDbMjs(bp), 'utf8');
  if (bp.needPassword) {
    fs.writeFileSync(path.join(absRoot, 'src', 'auth.mjs'), buildAuthMjs(), 'utf8');
  }
  fs.writeFileSync(path.join(absRoot, 'src', 'server.mjs'), buildServerMjs(bp), 'utf8');
  fs.writeFileSync(path.join(absRoot, 'public', 'styles.css'), buildStylesCss(), 'utf8');
  fs.writeFileSync(path.join(absRoot, 'public', 'vibe-shield.js'), buildVibeShieldBrowserJs(), 'utf8');
  fs.writeFileSync(path.join(absRoot, 'public', 'app.js'), buildAppJs(bp), 'utf8');
  fs.writeFileSync(path.join(absRoot, 'public', 'index.html'), buildIndexHtml(bp), 'utf8');

  let miniProgramDir = null;
  if (bp.includeMiniProgram) {
    miniProgramDir = writeMiniProgramScaffold(absRoot, bp);
  }

  const ws = scanWorkspace(absRoot);
  const audit = runRealityAudit(ws);
  writeMemoryCapsule(ws, audit);
  generateSelfHealingLaunchers(ws);
  const cp = saveCheckpoint(
    absRoot,
    `零出错${bp.needPassword ? '商用多账号' : '轻享'}${bp.includeMiniProgram ? '+小程序双端' : ''}底座已就绪：${bp.appName}`
  );
  const wsAfter = scanWorkspace(absRoot);
  const auditAfter = runRealityAudit(wsAfter);
  generateBossDashboard(wsAfter, auditAfter);

  return {
    scaffolded: true,
    productKind: bp.productKind,
    commercialAuth: bp.needPassword,
    miniProgram: bp.includeMiniProgram,
    miniProgramDir,
    blueprint: bp,
    score: auditAfter.score,
    checkpointId: cp.id,
    startPort: 3090,
    message: `🎉 已为您铺好【${bp.appName}】（形态：${bp.archetypeLabel}，健康分 ${auditAfter.score}/100 🟢）！`
  };
}
