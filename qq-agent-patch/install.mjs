#!/usr/bin/env node
/**
 * 给 qq-agent 打「私聊主动搭话」补丁。
 *
 *   node 安装.mjs                # 在当前目录找 qq-agent
 *   node 安装.mjs D:\bots\qq-agent
 *
 * 只替换 src/orchestrator.js 里的 startProactiveLoop() 这一个方法，
 * 备份成 src/orchestrator.js.bak-proactive，打完后重启 qq-agent。
 */
import { readFileSync, writeFileSync, copyFileSync, existsSync, statSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const BLOCK = path.join(here, 'patch', 'proactive-block.txt')

function findRoot(start) {
  const looksRight = (dir) =>
    existsSync(path.join(dir, 'src', 'orchestrator.js')) && existsSync(path.join(dir, 'package.json'))
  if (looksRight(start)) return start
  for (const name of readdirSync(start)) {
    const sub = path.join(start, name)
    try {
      if (!statSync(sub).isDirectory()) continue
    } catch {
      continue
    }
    if (looksRight(sub)) return sub
  }
  return ''
}

const arg = process.argv[2]
const startDir = arg ? path.resolve(arg) : process.cwd()
const root = findRoot(startDir)
if (!root) {
  console.error('没找到 qq-agent（要有 src/orchestrator.js 和 package.json）。用法：node 安装.mjs <qq-agent目录>')
  process.exit(1)
}
console.log('qq-agent 目录：' + root)

const target = path.join(root, 'src', 'orchestrator.js')
const src = readFileSync(target, 'utf8')

if (src.includes('#pHit(')) {
  console.log('这个补丁已经打过了，什么都没做。')
  process.exit(0)
}
if (!src.includes('startProactiveLoop() {')) {
  console.error('没找到 startProactiveLoop()，版本可能不匹配。')
  process.exit(1)
}
if (!existsSync(BLOCK)) {
  console.error('补丁内容丢了：' + BLOCK)
  process.exit(1)
}

const lines = src.split('\n')
const a = lines.findIndex((l) => l.trim().startsWith('startProactiveLoop() {'))
let depth = 0
let end = -1
for (let i = a; i < lines.length; i += 1) {
  for (const ch of lines[i]) {
    if (ch === '{') depth += 1
    else if (ch === '}') {
      depth -= 1
      if (depth === 0) { end = i; break }
    }
  }
  if (end >= 0) break
}
if (end < 0) {
  console.error('括号配对失败，为了安全没有改动。')
  process.exit(1)
}

const block = readFileSync(BLOCK, 'utf8').replace(/\r/g, '').replace(/\n$/, '').split('\n')
copyFileSync(target, target + '.bak-proactive')
writeFileSync(target, [...lines.slice(0, a), ...block, ...lines.slice(end + 1)].join('\n'), 'utf8')
console.log('已替换 startProactiveLoop（第 ' + (a + 1) + ' 行到第 ' + (end + 1) + ' 行），备份：orchestrator.js.bak-proactive')

// 顺手把参数补进 config.json（保留已有值）
const cfgFile = path.join(root, 'data', 'config.json')
if (existsSync(cfgFile)) {
  try {
    const cfg = JSON.parse(readFileSync(cfgFile, 'utf8'))
    const defaults = {
      enabled: true,
      dryRun: true,
      intervalMinMs: 1800000,
      cooldownMs: 1200000,
      quietStartHour: 1,
      quietEndHour: 8,
      missBonusPct: 10,
      missCapPct: 40,
      peakPct: 20,
      offPeakPct: 60,
      idleThresholdMs: 2700000
    }
    cfg.proactive = { ...defaults, ...(cfg.proactive || {}) }
    cfg.proactive.enabled = true
    writeFileSync(cfgFile, JSON.stringify(cfg, null, 2), 'utf8')
    console.log('已写入 proactive 参数（dryRun=true，先试运行）')
  } catch (error) {
    console.log('config.json 没改成功（' + error.message + '），你自己加也行，README 里有参数表。')
  }
} else {
  console.log('没找到 data/config.json（还没跑过 qq-agent？），参数自己加，README 里有参数表。')
}

console.log('')
console.log('下一步：重启 qq-agent，然后看 data/proactive-log.txt。')
console.log('确认节奏合适后，把 data/config.json 里的 proactive.dryRun 改成 false。')
