/**
 * 主动搭话（私聊）· 插件版
 *
 * 思路：每 60 秒醒一次，只要距上次「掷骰」够了一个间隔，就本地掷一次骰子。
 * 掷中才调 ctx.orchestrator.wake(chatKey, { proactive: true }) 让它开口——那一步才花模型。
 *
 * 命中线 = min(100, 峰时/谷时基准 × 时机因子 + min(加成上限, 连续没中 × 没中加成))
 *   时机因子：距它上次说话 < 20 分钟 → ×0.15；> 6 小时 → ×1.5；中间 ×1
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const MIN = 60000

export async function activate(ctx) {
  const dir = ctx.data?.dir || ''
  const logFile = dir ? ctx.data.file('proactive.log') : ''

  function cfg() {
    return ctx.config?.get?.() || {}
  }

  function num(value, fallback) {
    const n = Number(value)
    return Number.isFinite(n) ? n : fallback
  }

  function inQuiet(c, now) {
    const a = num(c.quietStart, -1)
    const b = num(c.quietEnd, -1)
    if (a < 0 || b < 0 || a === b) return false
    const h = now.getHours()
    return a < b ? h >= a && h < b : h >= a || h < b
  }

  function hitLine(c, streak, gapMin, now) {
    const day = now.getDay()
    const h = now.getHours()
    const peak = day >= 1 && day <= 5 && ((h >= 9 && h < 12) || (h >= 14 && h < 18))
    const base = peak ? num(c.peakPct, 20) : num(c.offPeakPct, 60)
    let factor = 1
    const why = [peak ? '峰时' : '谷时']
    if (gapMin < 20) {
      factor = 0.15
      why.push('刚聊过×0.15')
    } else if (gapMin > 360) {
      factor = 1.5
      why.push('冷太久×1.5')
    } else {
      why.push('×1')
    }
    const bonus = Math.min(num(c.missBonusCapPct, 40), streak * num(c.missBonusPct, 10))
    if (bonus > 0) why.push('没中加成+' + bonus)
    return { hit: Math.min(100, base * factor + bonus), why: why.join('／') }
  }

  function candidates(c) {
    const idleMs = Math.max(5 * MIN, num(c.idleMin, 45) * MIN)
    const store = ctx.store
    const chats = typeof store?.listChats === 'function' ? store.listChats() : []
    const now = Date.now()
    const out = []
    for (const chatKey of chats) {
      if (typeof ctx.isEnabled === 'function' && !ctx.isEnabled(chatKey)) continue
      const meta = store.getChatMeta?.(chatKey)
      if (!meta) continue
      if (meta.unread > 0) continue
      const last = Number(meta.lastTs) || 0
      if (now - last < idleMs) continue
      out.push({ chatKey, gapMin: Math.round((now - last) / MIN) })
    }
    out.sort((a, b) => b.gapMin - a.gapMin)
    return out
  }

  function note(message) {
    const line = new Date().toLocaleString('zh-CN', { hour12: false }) + '  ' + message + '\n'
    try {
      if (dir) {
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
        appendFileSync(logFile, line, 'utf8')
        const rows = readFileSync(logFile, 'utf8').split('\n')
        if (rows.length > 400) writeFileSync(logFile, rows.slice(-200).join('\n'), 'utf8')
      }
    } catch {
      /* 记不上不影响主流程 */
    }
    ctx.log?.(message)
  }

  async function tick() {
    const c = cfg()
    if (c.enabled === false) return

    const now = new Date()
    const lastCheck = Number(ctx.state.get('lastCheck') || 0)
    const intervalMs = Math.max(MIN, num(c.intervalMin, 30) * MIN)
    if (Date.now() - lastCheck < intervalMs) return
    ctx.state.set('lastCheck', String(Date.now()))

    if (inQuiet(c, now)) {
      note('安静时段（' + c.quietStart + '~' + c.quietEnd + ' 点），不掷')
      return
    }

    const lastSpokeAt = Number(ctx.state.get('lastSpokeAt') || 0)
    const cooldownMs = Math.max(0, num(c.cooldownMin, 20) * MIN)
    if (lastSpokeAt && Date.now() - lastSpokeAt < cooldownMs) {
      note('冷却中（上次开口 ' + Math.round((Date.now() - lastSpokeAt) / MIN) + ' 分钟前）')
      return
    }

    const list = candidates(c)
    if (!list.length) {
      note('没有符合条件的会话（要安静够 ' + num(c.idleMin, 45) + ' 分钟）')
      return
    }

    const picked = list[0]
    let streak = Number(ctx.state.get('streak') || 0)
    const line = hitLine(c, streak, picked.gapMin, now)
    const roll = Math.random() * 100

    if (roll >= line.hit) {
      streak += 1
      ctx.state.set('streak', String(streak))
      note('没中：掷出 ' + roll.toFixed(1) + ' ／ 命中线 ' + line.hit.toFixed(1) + '（' + line.why + '，连没中 ' + streak + ' 次）')
      return
    }

    ctx.state.set('streak', '0')

    if (c.dryRun === true) {
      note('试运行命中：掷出 ' + roll.toFixed(1) + ' ／ 命中线 ' + line.hit.toFixed(1) + '，没真发')
      return
    }

    const orchestrator = ctx.orchestrator
    if (!orchestrator?.wake) {
      note('内核没有暴露 orchestrator.wake，跳过一次')
      return
    }

    ctx.state.set('lastSpokeAt', String(Date.now()))
    note('命中并开口：掷出 ' + roll.toFixed(1) + ' ／ 命中线 ' + line.hit.toFixed(1) + '（' + line.why + '，已安静 ' + picked.gapMin + ' 分钟）')
    try {
      await orchestrator.wake(picked.chatKey, { proactive: true })
      ctx.emit?.('proactive-spoke', { chatKey: picked.chatKey })
    } catch (error) {
      note('唤醒失败：' + (error?.message ?? error))
    }
  }

  ctx.data?.ensure?.()
  const stop = ctx.scheduler.every(MIN, () => {
    tick().catch((error) => ctx.log?.('tick 出错：' + (error?.message ?? error)))
  })

  ctx.http.route('GET', '/log', () => {
    let text = ''
    try {
      text = readFileSync(logFile, 'utf8')
    } catch {
      text = '（还没有记录）'
    }
    return { ok: true, log: text }
  })

  ctx.log?.('已装好：每 ' + num(cfg().intervalMin, 30) + ' 分钟掷一次骰子，安静时段 ' + num(cfg().quietStart, 1) + '~' + num(cfg().quietEnd, 8) + ' 点')

  return {
    dispose() {
      try {
        stop?.()
      } catch {
        /* 忽略 */
      }
    }
  }
}
