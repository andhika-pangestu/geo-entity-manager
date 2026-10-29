#!/usr/bin/env node
/**
 * Enforces the frontend UI guidelines (shadcn/ui + Tailwind) on all .tsx files under src:
 *  1. No raw Tailwind palette colors (use semantic theme tokens).
 *  2. No outer margins (m-, mt-, mb-, ...); spacing is controlled by parents via gap- or space-y- utilities.
 *  3. No raw <button> outside components/ui (use <Button>, with `asChild` when composing).
 *  4. No template-literal / ternary className strings (use cva + cn()).
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const SRC_DIR = new URL('../src', import.meta.url).pathname
const UI_PRIMITIVES_DIR = `components${sep}ui${sep}`

const PALETTE =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black'
const UTILITIES = 'bg|text|border|ring|divide|placeholder|from|via|to|fill|stroke|outline|shadow'

const RULES = [
  {
    name: 'raw-color',
    message: 'Use semantic tokens (bg-background, text-muted-foreground, border-border, ...)',
    pattern: new RegExp(`(?<![\\w-])(?:[a-z-]+:)*(?:${UTILITIES})-(?:${PALETTE})(?:-\\d{2,3})?(?:/\\d+)?(?![\\w-])`, 'g'),
  },
  {
    name: 'outer-margin',
    message: 'No outer margins; control spacing from the parent with gap-*/space-*',
    pattern: /(?<![\w-])(?:[a-z-]+:)*-?m[trblxyse]?-(?:\d|\[|px)/g,
  },
  {
    name: 'raw-button',
    message: 'Use <Button> (and asChild when composing triggers/links)',
    pattern: /<button\b/g,
    skipInPrimitives: true,
  },
  {
    name: 'dynamic-classname',
    message: 'Use cva variants + cn() instead of template-literal/ternary class strings',
    pattern: /className=\{`/g,
  },
]

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) yield* walk(full)
    else if (full.endsWith('.tsx')) yield full
  }
}

const violations = []

for (const file of walk(SRC_DIR)) {
  const rel = relative(SRC_DIR, file)
  const lines = readFileSync(file, 'utf8').split('\n')

  lines.forEach((line, index) => {
    for (const rule of RULES) {
      if (rule.skipInPrimitives && rel.startsWith(UI_PRIMITIVES_DIR)) continue
      rule.pattern.lastIndex = 0
      const match = rule.pattern.exec(line)
      if (match) {
        violations.push(`${rel}:${index + 1}  [${rule.name}] "${match[0].trim()}" — ${rule.message}`)
      }
    }
  })
}

if (violations.length > 0) {
  console.error(`UI guideline violations (${violations.length}):\n`)
  violations.forEach((v) => console.error(`  ${v}`))
  process.exit(1)
}

console.log('UI guidelines OK: no raw colors, outer margins, raw <button>, or dynamic className strings.')
