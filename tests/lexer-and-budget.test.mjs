import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { analyzeSource, findMatchingBrace, indexToLine, estimateTokens } from '../kernel/lexer.mjs';
import { GHOST_PACKAGE_ROOT } from '../kernel/installer.mjs';

test('Lexer strips comments and strings while preserving exact 1-based line numbers and JSX', () => {
  const sample = [
    '// Line 1 comment with fake catch {} and sk-123456789012345678901234',
    'const msg = "string with { unmatched brace and /api/fake";',
    '/* Multi-line',
    '   comment on line 4 */',
    'export function renderBox(id) {',
    '  const url = `/api/orders/${id}`;',
    '  return <div className="box">{url}</div>;',
    '}'
  ].join('\n');

  const res = analyzeSource(sample);
  assert.equal(res.totalLines, 8);
  assert.ok(!res.cleanCode.includes('fake catch'));
  assert.ok(res.strings.some(s => s.value === '/api/orders/${expr}' && s.line === 6));

  const fnOpen = res.skeleton.indexOf('{');
  const fnClose = findMatchingBrace(res.skeleton, fnOpen);
  assert.equal(indexToLine(res.lineOffsets, fnOpen), 5);
  assert.equal(indexToLine(res.lineOffsets, fnClose), 8);
});

test('KV Prefix Cache & Token Budget Gate: AGENTS.md < 420 tokens and every SKILL.md < 500 tokens', () => {
  const agentsPath = path.join(GHOST_PACKAGE_ROOT, 'plugin', 'rules', 'AGENTS.md');
  const agentsContent = fs.readFileSync(agentsPath, 'utf8');
  const agentsTokens = estimateTokens(agentsContent);

  assert.ok(
    agentsTokens < 420,
    `AGENTS.md must stay under 420 tokens for ultra-low KV cache footprint (got ${agentsTokens})`
  );
  // Ensure byte-immutability: no dynamic ISO timestamps inside static router
  assert.ok(!/\d{4}-\d{2}-\d{2}T\d{2}:/.test(agentsContent));

  const skillsRoot = path.join(GHOST_PACKAGE_ROOT, 'plugin', 'skills');
  for (const dir of fs.readdirSync(skillsRoot, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    const skillText = fs.readFileSync(path.join(skillsRoot, dir.name, 'SKILL.md'), 'utf8');
    const tok = estimateTokens(skillText);
    assert.ok(tok < 500, `${dir.name}/SKILL.md exceeded 500 tokens (got ${tok})`);
  }
});
