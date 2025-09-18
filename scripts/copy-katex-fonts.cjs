#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

const srcDir = path.resolve(__dirname, '../node_modules/katex/dist/fonts')
const destDir = path.resolve(__dirname, '../public/fonts')

if (!fs.existsSync(srcDir)) {
  console.warn('[copy-katex-fonts] katex not installed; skipping')
  process.exit(0)
}

fs.mkdirSync(destDir, { recursive: true })

for (const entry of fs.readdirSync(srcDir)) {
  const from = path.join(srcDir, entry)
  const to = path.join(destDir, entry)
  const stat = fs.statSync(from)
  if (stat.isFile()) {
    fs.copyFileSync(from, to)
  }
}

console.log('[copy-katex-fonts] Copied KaTeX fonts to public/fonts')

