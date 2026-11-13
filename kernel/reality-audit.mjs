import fs from 'node:fs';
import path from 'node:path';
import { findMatchingBrace, indexToLine } from './lexer.mjs';
import { buildLineageGraph } from './lineage-graph.mjs';

export const SECRET_PATTERNS = [
  { name: 'OpenAI/DeepSeek/Moonshot API Key', re: /\bsk-[A-Za-z0-9]{20,}\b/ },
  { name: '阿里云 AccessKey (LTAI)', re: /\bLTAI[A-Za-z0-9]{12,20}\b/ },
  { name: '腾讯云 SecretId (AKID)', re: /\bAKID[A-Za-z0-9]{13,32}\b/ },
  { name: 'AWS Access Key (AKIA)', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'GitHub Token', re: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/ },
  { name: 'Google API Key', re: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { name: 'Stripe Live Secret', re: /\bsk_live_[0-9a-zA-Z]{24,}\b/ },
  {
    name: '数据库连接串明文密码',
    re: /(?:postgres|postgresql|mysql|mongodb(?:\+srv)?|redis):\/\/[^:\s'"`]+:(?!password\b|123456\b|postgres\b|root\b|your[_-]?password)[^@\s'"`]{6,}@(?!localhost\b|127\.0\.0\.1\b)[a-zA-Z0-9.-]+/i
  }
];
export function runRealityAudit(workspace, existingLineage = null) {
  const lineage = existingLineage || buildLineageGraph(workspace);
  const findings = [];

  // 1. P1: Missing Git Time-Machine Safety Net
  if (!workspace.hasGit) {
    findings.push({
      id: 'MISSING_GIT_SAFETY_NET',
      severity: 'P1',
      title: '项目未开启「后悔药时光机」保护',
      file: '.',
      line: 1,
      founderImpact: '当前文件夹没有任何历史版本保护。一旦让 AI 大改页面改坏了，没法一键退回上一秒的好状态。',
      oneClickPrompt: '请立即调用 ghost-cto save 帮我创建第一个代码+数据库安全存档点，不要改动业务代码。',
      aiDirective: 'ROOT:1|MISSING_GIT|Run `ghost-cto save "初始安全基线"` before any code edit'
    });
  }

  // 2. P0: Unprotected Admin APIs
  const unprotectedAdminByFile = new Map();
  for (const r of lineage.backendRoutes) {
    if (
      r.rawPath.startsWith('/api/admin') &&
      !r.rawPath.includes('login') &&
      !r.rawPath.includes('auth') &&
      !r.isAuthenticated
    ) {
      if (!unprotectedAdminByFile.has(r.file)) {
        unprotectedAdminByFile.set(r.file, []);
      }
      unprotectedAdminByFile.get(r.file).push(r);
    }
  }
  for (const [file, routes] of unprotectedAdminByFile.entries()) {
    const first = routes[0];
    const samplePaths = routes.map(r => r.rawPath).slice(0, 4).join(', ');
    findings.push({
      id: 'UNPROTECTED_ADMIN_API',
      severity: 'P0',
      title: `总后台管理接口「裸奔」未设管理员密码校验（共 ${routes.length} 个接口）`,
      file,
      line: first.line,
      founderImpact: `像 ${samplePaths} 这些总后台接口没有做管理员身份验证！上线后任何知道网址的人都能直接偷看你的大模型密钥、乱改门店套餐价格或乱开账号。`,
      oneClickPrompt: `请只修改 ${file} 第 ${first.line} 行附近的 /api/admin/* 接口，加上严格的管理员身份口令鉴权（同时在管理后台前端配好口令输入与请求头），严禁改动客户工作台其他正常业务！`,
      aiDirective: `${file}:${first.line}|UNPROTECTED_ADMIN_API|Guard ${routes.length} /api/admin/* routes with admin token auth`
    });
  }

  // 3. P0: Volatile In-Memory Fake Persistence
  for (const chain of lineage.chains) {
    if (chain.status === 'VOLATILE_MEMORY') {
      const [beFile, beLineStr] = chain.backend.split(':');
      findings.push({
        id: 'VOLATILE_MEMORY_DB',
        severity: 'P0',
        title: `假落库警告：接口 ${chain.endpoint} 只存内存，重启即丢数据`,
        file: beFile,
        line: Number(beLineStr) || 1,
        founderImpact: chain.summary,
        oneClickPrompt: `请把 ${beFile} 第 ${beLineStr} 行的 ${chain.endpoint} 从内存变量改成真实写入 SQLite 数据库表，确保重启服务器数据不丢失，保持接口返回格式不变。`,
        aiDirective: `${chain.backend}|VOLATILE_MEMORY_DB|Migrate ${chain.endpoint} (${chain.persistence}) to persistent DB table`
      });
    }
  }

  // 4. P0: Broken Frontend <-> Backend API Contract (404 Dead Ends)
  for (const chain of lineage.chains) {
    if (chain.status === 'BROKEN_CONTRACT') {
      const [feFile, feLineStr] = chain.frontend.split(':');
      findings.push({
        id: 'BROKEN_API_CONTRACT',
        severity: 'P0',
        title: `断头按钮/接口：前端调了 ${chain.endpoint}，后端根本没写`,
        file: feFile,
        line: Number(feLineStr) || 1,
        founderImpact: chain.summary,
        oneClickPrompt: `前端 ${feFile} 第 ${feLineStr} 行调用了 ${chain.method} ${chain.endpoint}，但后端缺失该路由。请补齐真实后端路由并接通数据库，不要破坏现有接口。`,
        aiDirective: `${chain.frontend}|BROKEN_API_CONTRACT|Implement missing backend route ${chain.method} ${chain.endpoint}`
      });
    }
  }

  // 5. P0: Hardcoded API Keys & Exposed .env (Domestic + Global Cloud & DB URIs)
  for (const [, modData] of lineage.fileDataMap.entries()) {
    for (const s of modData.lex.strings) {
      for (const pat of SECRET_PATTERNS) {
        if (pat.re.test(s.value)) {
          findings.push({
            id: 'HARDCODED_SECRET',
            severity: 'P0',
            title: `源码硬编码了真实密钥 (${pat.name})`,
            file: modData.file.relPath,
            line: s.line,
            founderImpact: '把密钥直接写死在代码里，一旦发给别人或传到网上，几分钟内就会被黑客爬虫扫走盗刷账单！',
            oneClickPrompt: `请把 ${modData.file.relPath} 第 ${s.line} 行写死的密钥移到环境变量 process.env 中读取，并确保 .gitignore 忽略 .env 文件。`,
            aiDirective: `${modData.file.relPath}:${s.line}|HARDCODED_SECRET|Move ${pat.name} to process.env`
          });
        }
      }
    }
  }

  if (workspace.envFiles.length > 0) {
    let gitignoreText = '';
    try {
      gitignoreText = fs.readFileSync(path.join(workspace.rootDir, '.gitignore'), 'utf8');
    } catch {
      gitignoreText = '';
    }
    if (!gitignoreText.includes('.env')) {
      findings.push({
        id: 'ENV_NOT_IGNORED',
        severity: 'P0',
        title: '私密配置文件 .env 未加入防泄露名单 (.gitignore)',
        file: workspace.envFiles[0].relPath,
        line: 1,
        founderImpact: '上传代码备份时，会把装有数据库密码和 AI 密钥的 .env 文件一起传出去导致泄密。',
        oneClickPrompt: '请立即创建或更新根目录 .gitignore 文件，把 .env 和 .env.* 加入忽略名单。',
        aiDirective: `.gitignore:1|ENV_NOT_IGNORED|Add .env and .env.* to .gitignore`
      });
    }
  }

  // 6. Per-File Structural Forensics: Silent Catch, Unsafe Proxy, Fake UI, Plaintext Password, God File
  for (const [, modData] of lineage.fileDataMap.entries()) {
    const { file, lex, isReachable } = modData;
    if (!isReachable) continue;
    const { cleanCode, skeleton, lineOffsets, totalLines } = lex;

    // 6A. Empty Silent `catch {}` (JS/TS) or `except ...: pass` (Python) swallowing errors
    if (file.ext === '.py') {
      const pyPassRe = /\bexcept\b[^\n:]*:\s*\n\s*pass\b/g;
      let pm;
      while ((pm = pyPassRe.exec(cleanCode)) !== null) {
        const pyLine = indexToLine(lineOffsets, pm.index);
        findings.push({
          id: 'SILENT_CATCH',
          severity: 'P1',
          title: 'Python except pass 悄悄吞掉报错（出错了也不吭声）',
          file: file.relPath,
          line: pyLine,
          founderImpact: `${file.relPath} 第 ${pyLine} 行用 except: pass 直接吞掉了异常，出错时前端拿不到任何原因。`,
          oneClickPrompt: `请修复 ${file.relPath} 第 ${pyLine} 行的 except: pass，记录错误日志并返回明确中文报错。`,
          aiDirective: `${file.relPath}:${pyLine}|SILENT_CATCH|Replace Python except: pass with structured error logging/response`
        });
      }
    }

    const catchRe = /\bcatch\s*(?:\([^)]*\))?\s*\{/g;
    let m;
    while ((m = catchRe.exec(skeleton)) !== null) {
      const openBrace = m.index + m[0].length - 1;
      const closeBrace = findMatchingBrace(skeleton, openBrace);
      if (closeBrace > openBrace) {
        const innerClean = cleanCode.slice(openBrace + 1, closeBrace).trim();
        if (innerClean.length === 0) {
          const catchLine = indexToLine(lineOffsets, m.index);
          findings.push({
            id: 'SILENT_CATCH',
            severity: 'P1',
            title: '空 catch 悄悄吞掉报错（出错了也不吭声）',
            file: file.relPath,
            line: catchLine,
            founderImpact: `当网络超时、AI 额度用完或接口出错时，${file.relPath} 第 ${catchLine} 行直接把错误吞掉了，导致老板和客户在界面上看不到任何失败原因，还以为按钮坏了或以为调了真 AI。`,
            oneClickPrompt: `请修复 ${file.relPath} 第 ${catchLine} 行的空 catch {}，记录清晰错误原因或向前端返回明确的中文错误提示，严禁静默吞错。`,
            aiDirective: `${file.relPath}:${catchLine}|SILENT_CATCH|Log or surface structured error instead of empty catch {}`
          });
        }
      }
    }

    // 6B. Unsafe `http.request` proxy without `.on('error')`
    if (/\bhttps?\.request\s*\(/.test(cleanCode) && !/\.on\s*\(\s*['"]error['"]/.test(cleanCode)) {
      const reqMatch = cleanCode.match(/\bhttps?\.request\s*\(/);
      const reqLine = reqMatch ? indexToLine(lineOffsets, reqMatch.index) : 1;
      findings.push({
        id: 'UNSAFE_PROXY_STREAM',
        severity: 'P1',
        title: '网关转发缺少防崩溃保护（后端抖动会连带炸掉整个网页服务）',
        file: file.relPath,
        line: reqLine,
        founderImpact: `${file.relPath} 在做接口转发时没加错误兜底。只要接口偶发重启或断流一秒钟，整个前台网页进程就会直接闪退打不开！`,
        oneClickPrompt: `请给 ${file.relPath} 第 ${reqLine} 行的 http.request 转发补上 proxyReq.on('error', ...) 错误兜底返回 502 JSON，防止网关进程崩溃。`,
        aiDirective: `${file.relPath}:${reqLine}|UNSAFE_PROXY_STREAM|Attach .on('error') handler to http.request proxy stream`
      });
    }

    // 6C. Fake UI Handlers (React `onClick={() => {}}`, Vue `@click="() => {}"`, `alert('敬请期待'/'开发中')`)
    if (file.role === 'frontend') {
      const noopClickRe = /\bonClick\s*=\s*\{\s*(?:\(\s*\)|[a-zA-Z0-9_]+)\s*=>\s*\{\s*\}\s*\}/g;
      while ((m = noopClickRe.exec(cleanCode)) !== null) {
        const ln = indexToLine(lineOffsets, m.index);
        findings.push({
          id: 'FAKE_UI_HANDLER',
          severity: 'P1',
          title: '假按钮：点击事件是空的（点了毫无反应）',
          file: file.relPath,
          line: ln,
          founderImpact: '界面上画了按钮，但里面的点击代码是空的 `{}`，客户点破鼠标也不会有任何反应。',
          oneClickPrompt: `请把 ${file.relPath} 第 ${ln} 行的空按钮绑定到真实的业务逻辑或先隐藏该未完成按钮。`,
          aiDirective: `${file.relPath}:${ln}|FAKE_UI_HANDLER|Wire empty onClick noop to real handler or remove stub`
        });
      }
      if (file.ext === '.vue' || file.ext === '.svelte' || file.ext === '.html') {
        const vueNoopRe = /(?:@click|v-on:click|on:click)\s*=\s*['"]\s*(?:\(\s*\)\s*=>\s*\{\s*\}|\{\s*\})\s*['"]/g;
        while ((m = vueNoopRe.exec(modData.raw)) !== null) {
          const ln = modData.raw.slice(0, m.index).split('\n').length;
          findings.push({
            id: 'FAKE_UI_HANDLER',
            severity: 'P1',
            title: '假按钮：模板点击事件是空的（点了毫无反应）',
            file: file.relPath,
            line: ln,
            founderImpact: '界面上画了按钮，但模板点击绑定是空的 `{}`，客户点击没有任何反应。',
            oneClickPrompt: `请把 ${file.relPath} 第 ${ln} 行的空点击按钮绑定到真实的业务函数。`,
            aiDirective: `${file.relPath}:${ln}|FAKE_UI_HANDLER|Wire empty @click noop to real handler`
          });
        }
      }

      // Detect Fake Client-Only Save/Toggle (shows "已保存/已上架/保存成功" toast without ANY network request!)
      for (const [, fnObj] of modData.functions.entries()) {
        const claimsSaved = /(?:showToast|notify|toast|alert|message\.success)\s*\([\s\S]{0,140}?(?:已[^\n)'"]{0,12}(?:保存|创建|开通|上架|下架|删除|提交|发布|更新|同步)|(?:保存|创建|开通|上架|删除|提交|修改|设置)成功)/.test(
          fnObj.cleanBody
        );
        const hasNetworkOrPropAction =
          /(?:\b(?:fetch|axios|request|sendBeacon|localStorage\.setItem|on[A-Z][A-Za-z]+)|[A-Za-z0-9_$]*(?:Fetch|Api|Post|Put|Patch|Delete|Request|Client)|api[A-Za-z0-9_$]*)\s*\(|['"`]\/api\//.test(
            fnObj.cleanBody
          );
        if (claimsSaved && !hasNetworkOrPropAction) {
          findings.push({
            id: 'FAKE_CLIENT_ONLY_SAVE',
            severity: 'P1',
            title: `假保存/假开关：函数 ${fnObj.name} 提示操作成功，但根本没连后端！`,
            file: file.relPath,
            line: fnObj.line,
            founderImpact: `你在界面上点击时，它弹出了“已上架/已保存”的成功提示糊弄你，但实际上只改了浏览器临时变量，没有发任何接口请求——按一下刷新键（F5）所有操作瞬间作废！`,
            oneClickPrompt: `请把 ${file.relPath} 第 ${fnObj.line} 行的 ${fnObj.name} 函数接通真实后端 API 与数据库持久化，不要只改前端本地变量假装成功。`,
            aiDirective: `${file.relPath}:${fnObj.line}|FAKE_CLIENT_ONLY_SAVE|${fnObj.name}() shows success toast without backend API/DB persistence`
          });
        }
      }

      const placeholderRe = /(?:敬请期待|功能开发中|即将上线|TODO:\s*implement|coming\s+soon)/gi;
      while ((m = placeholderRe.exec(cleanCode)) !== null) {
        const ln = indexToLine(lineOffsets, m.index);
        const phrase = m[0];
        findings.push({
          id: 'PLACEHOLDER_TOAST',
          severity: 'P2',
          title: `未完工占位提示：「${phrase}」`,
          file: file.relPath,
          line: ln,
          founderImpact: '页面里还留着“敬请期待/开发中”占位词，发给付费客户体验会显得像半成品。',
          oneClickPrompt: `请检查 ${file.relPath} 第 ${ln} 行的「${phrase}」占位提示，把它接通为真实可用功能或先收纳隐藏。`,
          aiDirective: `${file.relPath}:${ln}|PLACEHOLDER_TOAST|Replace placeholder "${phrase}" with real implementation`
        });
      }
    }

    // 6D. Plaintext Password Storage in Auth/DB Module
    if (file.role === 'database' || file.role === 'backend') {
      const hasPlainPwdQuery =
        /SELECT\b[\s\S]{1,120}?FROM\s+users\b[\s\S]{1,80}?password\s*=\s*\?/i.test(cleanCode) ||
        /\buser\.password\s*!==\s*password\b/.test(cleanCode);
      const hasCryptoHash = /\b(?:scrypt|scryptSync|pbkdf2|pbkdf2Sync|bcrypt|argon2|createHash|timingSafeEqual)\b/.test(cleanCode);
      if (hasPlainPwdQuery && !hasCryptoHash) {
        const pwdMatch = cleanCode.match(/password\s*=\s*\?|\buser\.password\s*!==\s*password\b/i);
        const pwdLine = pwdMatch ? indexToLine(lineOffsets, pwdMatch.index) : 1;
        findings.push({
          id: 'PLAINTEXT_PASSWORD_DB',
          severity: 'P2',
          title: '员工/客户登录密码在数据库里「明文裸存」',
          file: file.relPath,
          line: pwdLine,
          founderImpact: '目前数据库直接存了明文密码，正式商用前建议升级为加密存储（兼容已有测试账号平滑升级），保护客户隐私。',
          oneClickPrompt: `请在 ${file.relPath} 第 ${pwdLine} 行将用户密码升级为 node:crypto scrypt 哈希存储，并兼容已有旧明文密码首次登录自动平滑加密升级，确保现有账号不断登。`,
          aiDirective: `${file.relPath}:${pwdLine}|PLAINTEXT_PASSWORD_DB|Use crypto.scryptSync password hashing with legacy plaintext migration`
        });
      }
    }

    // 6E. God File Complexity Wall (> 550 lines)
    if (totalLines > 550) {
      findings.push({
        id: 'GOD_FILE_COMPLEXITY',
        severity: 'P2',
        title: `单文件超载预警（${totalLines} 行，逼近 AI 改崩警戒线）`,
        file: file.relPath,
        line: 1,
        founderImpact: `${file.relPath} 已经堆了 ${totalLines} 行代码。继续往这一个文件里硬塞新功能，AI 极易改A崩B，而且每次读取都会白白多烧几倍的 Token！`,
        oneClickPrompt: `请在不改变任何界面外观和功能的前提下，将 ${file.relPath}（${totalLines}行）按独立业务板块安全拆分为小组件文件。`,
        aiDirective: `${file.relPath}:1|GOD_FILE_COMPLEXITY|${totalLines} lines (>550); modularize before adding large features`
      });
    }
  }

  // 6.4 Demo Shell Architecture Detection (Frontend + Backend exist, but ZERO real database anywhere!)
  const hasFrontend = workspace.codeFiles.some(f => f.role === 'frontend');
  const hasBackend = workspace.codeFiles.some(f => f.role === 'backend');
  const realDbWriteCount = lineage.chains.filter(c => c.status === 'REAL_DB_WRITE' || c.status === 'REAL_AI_AND_DB').length;
  const hasExternalCloudDb = workspace.packageJsons.some(p => {
    try {
      const txt = fs.readFileSync(p.absPath, 'utf8');
      return /supabase|firebase|mongoose|mongodb|pg|mysql2|@planetscale|@neondatabase|prisma|drizzle-orm/.test(txt);
    } catch {
      return false;
    }
  });

  if (
    hasFrontend &&
    hasBackend &&
    workspace.dbFiles.length === 0 &&
    lineage.schemaTables.length === 0 &&
    realDbWriteCount === 0 &&
    !hasExternalCloudDb
  ) {
    findings.push({
      id: 'DEMO_SHELL_NO_DATABASE',
      severity: 'P0',
      title: '纯样板房空壳预警：整个项目尚未接入任何真实数据库！',
      file: workspace.codeFiles.find(f => f.role === 'backend')?.relPath || '.',
      line: 1,
      founderImpact: '当前项目虽然有漂亮的界面和本地服务，但底层一个数据库表都没有！界面上的门店、客户、算力豆全是代码里写死的静态样板数据，无法真正保存客户业务。',
      oneClickPrompt: '请为当前项目接入真实的 SQLite（node:sqlite）数据库持久化层，把写死的静态演示列表改造为真实可增删改查落库的业务数据。',
      aiDirective: `ROOT:1|DEMO_SHELL_NO_DATABASE|Zero DB files/tables/writes detected; app is a static UI prototype shell`
    });
  }

  // 6.5 Zombie Unmounted Frontend Files (Dead code trap where AI edits files not connected to App!)
  if (lineage.zombieFiles && lineage.zombieFiles.length > 0) {
    findings.push({
      id: 'ZOMBIE_UNMOUNTED_FILES',
      severity: 'P2',
      title: `发现 ${lineage.zombieFiles.length} 个未挂载的「僵尸残留页面」（AI 极易误改它们白费功夫）`,
      file: lineage.zombieFiles[0],
      line: 1,
      founderImpact: `文件夹里残留着历史旧文件（${lineage.zombieFiles.join(', ')}），但并未接入当前正式界面。如果不标出来，AI 很容易改错到这些死文件上，导致你刷新网页看不到任何变化且白烧 Token！`,
      oneClickPrompt: `请核实 ${lineage.zombieFiles.join(', ')} 是否为未接入 App 的历史残留文件；若是废弃残留请归档清理，若是遗漏功能请重新挂载进主导航。`,
      aiDirective: `${lineage.zombieFiles[0]}:1|ZOMBIE_UNMOUNTED_FILES|Unreachable from entrypoints (${lineage.zombieFiles.join(',')}); do NOT edit thinking they are live UI`
    });
  }

  // 7. Static Build Lag Trap (`src/` newer than `dist/index.html` or `public/index.html`)
  for (const sb of workspace.staleBuilds) {
    const runBuild = sb.buildCmd || (sb.appDir === '.' ? 'npm run build' : `npm --prefix ${sb.appDir} run build`);
    if (sb.isStale) {
      findings.push({
        id: 'STALE_STATIC_DIST',
        severity: 'P0',
        title: `网页未刷新假象：${sb.newestSrcFile} 改了源码但没重新生成 ${sb.distRelPath}！`,
        file: sb.newestSrcFile,
        line: 1,
        founderImpact: `最新修改的代码在 ${sb.newestSrcFile}，但服务器展示的是旧的 ${sb.distRelPath} 打包文件（落后 ${sb.lagSeconds} 秒）。你现在刷新浏览器看到的根本不是最新代码！`,
        oneClickPrompt: `请立即运行 \`${runBuild}\` 重新生成最新 ${sb.distRelPath} 静态页面，让我刷新浏览器就能看到最新效果。`,
        aiDirective: `${sb.distRelPath}:1|STALE_STATIC_DIST|${sb.newestSrcFile} is ${sb.lagSeconds}s newer than ${sb.distRelPath}; run \`${runBuild}\``
      });
    } else {
      findings.push({
        id: 'STATIC_DIST_ARCHITECTURE_NOTE',
        severity: 'P2',
        title: `静态打包托管提醒（${sb.distRelPath}）`,
        file: sb.distRelPath,
        line: 1,
        founderImpact: `当前通过预编译 ${sb.distRelPath} 提供画面（目前包是最新的）。提醒 AI 以后每次改完源码，必须自动执行 \`${runBuild}\`，否则网页不会变。`,
        oneClickPrompt: `以后每次修改源码后，请务必自动执行 \`${runBuild}\` 更新 ${sb.distRelPath}。`,
        aiDirective: `${sb.distRelPath}:1|STATIC_DIST_NOTE|Always run \`${runBuild}\` after editing source files`
      });
    }
  }

  // 8. Evaluate Self-Evolving Immune Scars (`.vibe/immune-rules.json`)
  const immunePath = path.join(workspace.rootDir, '.vibe', 'immune-rules.json');
  if (fs.existsSync(immunePath)) {
    try {
      const customRules = JSON.parse(fs.readFileSync(immunePath, 'utf8'));
      for (const rule of customRules) {
        if (!rule.pattern) continue;
        const customRe = new RegExp(rule.pattern);
        for (const [, modData] of lineage.fileDataMap.entries()) {
          if (rule.fileHint && !modData.file.relPath.includes(rule.fileHint)) continue;
          const match = modData.lex.cleanCode.match(customRe);
          if (match) {
            const ln = indexToLine(modData.lex.lineOffsets, match.index);
            findings.push({
              id: `SCAR_${rule.id || 'CUSTOM'}`,
              severity: 'P1',
              title: `历史踩坑复发拦截：${rule.symptom}`,
              file: modData.file.relPath,
              line: ln,
              founderImpact: `这个问题之前踩过坑（${rule.rootCause}），免疫系统已自动拦截避免二进宫！`,
              oneClickPrompt: `请按项目免疫铁律「${rule.rule}」修复 ${modData.file.relPath} 第 ${ln} 行。`,
              aiDirective: `${modData.file.relPath}:${ln}|IMMUNE_SCAR|${rule.rule}`
            });
          }
        }
      }
    } catch {
      // ignore malformed custom rules
    }
  }

  // Sort P0 -> P1 -> P2
  const rank = { P0: 0, P1: 1, P2: 2 };
  findings.sort((a, b) => (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9));

  // Compute Launch Readiness Score (0 - 100)
  const p0Count = findings.filter(f => f.severity === 'P0').length;
  const p1Count = findings.filter(f => f.severity === 'P1').length;
  const p2Count = findings.filter(f => f.severity === 'P2').length;
  const rawScore = 100 - p0Count * 22 - p1Count * 8 - p2Count * 3;
  const score = Math.max(8, Math.min(100, rawScore));

  const launchVerdict =
    p0Count > 0
      ? `🔴 暂不可直接发给外部客户（存在 ${p0Count} 项致命阻断项，先点下方一键修复话术处理）`
      : p1Count > 0
      ? `🟡 可内部试用演示，正式商用前建议修完 ${p1Count} 项高危隐患`
      : `🟢 体检通过！核心链路真通落库，可放心发给客户使用`;

  return {
    score,
    p0Count,
    p1Count,
    p2Count,
    launchVerdict,
    findings,
    lineage
  };
}

/**
 * Format dual audit output:
 * 1. `founderMarkdown`: Warm, zero-jargon Chinese report for non-technical founders
 * 2. `aiCompact`: `< 220 tokens` surgical table for AI repair with 90% token savings
 */
export function formatAuditReport(audit) {
  const lines = [
    `# 🩺 GhostCTO（影子 CTO）产品真假与商用体检报告`,
    ``,
    `- **商用健康总分**：**${audit.score} / 100 分**`,
    `- **上线安检结论**：${audit.launchVerdict}`,
    `- **问题分布**：🔴 致命阻断 (P0) **${audit.p0Count}** 项 ｜ 🟠 高危隐患 (P1) **${audit.p1Count}** 项 ｜ 🔵 长期提醒 (P2) **${audit.p2Count}** 项`,
    ``
  ];

  if (audit.findings.length === 0) {
    lines.push(`🎉 太棒了！未检测到假数据、空吞错、断头接口或裸奔管理接口。`);
  } else {
    lines.push(`## 📋 老板白话隐患清单（复制「一键修复话术」发给任意 AI 软件即可修好）`, ``);
    audit.findings.forEach((f, idx) => {
      const badge = f.severity === 'P0' ? '🔴 P0 致命' : f.severity === 'P1' ? '🟠 P1 高危' : '🔵 P2 提醒';
      lines.push(`### ${idx + 1}. [${badge}] ${f.title}`);
      lines.push(`- **所在位置**：\`${f.file}:${f.line}\``);
      lines.push(`- **对生意的实际影响**：${f.founderImpact}`);
      lines.push(`- **👉 复制这句话发给 AI 立即修好**：`);
      lines.push(`  > ${f.oneClickPrompt}`);
      lines.push(``);
    });
  }

  const aiLines = [
    `GHOST_AUDIT|score:${audit.score}/100|P0:${audit.p0Count}|P1:${audit.p1Count}|P2:${audit.p2Count}`
  ];
  for (const f of audit.findings.slice(0, 12)) {
    aiLines.push(`${f.severity}|${f.aiDirective}`);
  }

  return {
    founderMarkdown: lines.join('\n'),
    aiCompact: aiLines.join('\n')
  };
}
