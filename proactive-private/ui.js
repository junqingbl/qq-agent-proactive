/**
 * 主动搭话 · 设置页
 * 内核通过 mount(root, ctx) 调用；这里自己画表单、自己调接口。
 */
const FIELDS = [
  {
    "key": "dryRun",
    "label": "试运行（只写日志不真发）",
    "type": "bool"
  },
  {
    "key": "intervalMin",
    "label": "掷骰间隔（分钟）",
    "type": "number",
    "min": 1,
    "max": 1440
  },
  {
    "key": "cooldownMin",
    "label": "开口后冷却（分钟）",
    "type": "number",
    "min": 0,
    "max": 1440
  },
  {
    "key": "idleMin",
    "label": "会话要安静多久（分钟）",
    "type": "number",
    "min": 5,
    "max": 1440
  },
  {
    "key": "quietStart",
    "label": "安静时段起（点）",
    "type": "number",
    "min": 0,
    "max": 23,
    "hint": "起 === 止 表示不启用"
  },
  {
    "key": "quietEnd",
    "label": "安静时段止（点）",
    "type": "number",
    "min": 0,
    "max": 23
  },
  {
    "key": "peakPct",
    "label": "峰时命中线（%）",
    "type": "number",
    "min": 0,
    "max": 100
  },
  {
    "key": "offPeakPct",
    "label": "谷时命中线（%）",
    "type": "number",
    "min": 0,
    "max": 100
  },
  {
    "key": "missBonusPct",
    "label": "连续没中每次加（%）",
    "type": "number",
    "min": 0,
    "max": 100
  },
  {
    "key": "missBonusCapPct",
    "label": "加成上限（%）",
    "type": "number",
    "min": 0,
    "max": 100
  }
]

export async function mount(root, ctx) {
  const esc = ctx?.esc || ((s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])))
  const toast = ctx?.toast || ((m) => console.log(m))

  async function loadConfig() {
    try {
      const r = await fetch('/api/plugins')
      const j = await r.json()
      const list = j.plugins || j.items || []
      const me = list.find((p) => p.id === 'proactive-private')
      return (me && me.config) || {}
    } catch {
      return {}
    }
  }

  async function save(patch) {
    const r = await fetch('/api/plugins/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'proactive-private', patch })
    })
    const j = await r.json().catch(() => ({}))
    if (j && j.ok === false) throw new Error(j.error || '保存失败')
    return j
  }

  const cfg = await loadConfig()

  const rows = FIELDS.map((f) => {
    const v = cfg[f.key]
    if (f.type === 'bool') {
      return '<div class="row" style="align-items:center;gap:10px;margin:10px 0">'
        + '<label style="flex:1">' + esc(f.label) + '</label>'
        + '<input type="checkbox" data-k="' + f.key + '" data-t="bool"' + (v ? ' checked' : '') + '>'
        + '</div>'
    }
    const type = f.type === 'number' ? 'number' : 'text'
    const attrs = [f.min !== undefined ? 'min="' + f.min + '"' : '', f.max !== undefined ? 'max="' + f.max + '"' : '', f.step !== undefined ? 'step="' + f.step + '"' : ''].filter(Boolean).join(' ')
    return '<div style="margin:10px 0">'
      + '<label style="display:block;margin-bottom:4px">' + esc(f.label) + '</label>'
      + '<input type="' + type + '" data-k="' + f.key + '" data-t="' + (f.type === 'number' ? 'num' : 'str') + '" ' + attrs
      + ' value="' + esc(v === undefined || v === null ? '' : v) + '" style="width:100%">'
      + (f.hint ? '<div class="muted" style="font-size:12px;margin-top:4px">' + esc(f.hint) + '</div>' : '')
      + '</div>'
  }).join('')

  root.innerHTML = '<div class="card">'
    + '<h3 style="margin:0 0 4px">主动搭话</h3>'
    + '<p class="muted" style="font-size:13px;margin:0 0 8px">本地掷骰，掷中才叫她开口。改完下一轮生效。</p>'
    + rows
    + '<div style="margin-top:14px;display:flex;gap:8px">'
    + '<button class="btn primary" id="pl-save">保存</button>'
    + '<button class="btn" id="pl-reset">恢复默认</button>'
    + '</div></div>'

  root.querySelector('#pl-save').addEventListener('click', async () => {
    const patch = {}
    root.querySelectorAll('[data-k]').forEach((el) => {
      const k = el.dataset.k
      const t = el.dataset.t
      if (t === 'bool') patch[k] = el.checked
      else if (t === 'num') {
        const n = Number(el.value)
        patch[k] = Number.isFinite(n) ? n : undefined
      } else patch[k] = String(el.value)
    })
    Object.keys(patch).forEach((k) => patch[k] === undefined && delete patch[k])
    try {
      await save(patch)
      toast('已保存')
    } catch (e) {
      toast('保存失败：' + (e.message || e))
    }
  })

  root.querySelector('#pl-reset').addEventListener('click', async () => {
    try {
      const r = await fetch('/api/plugins/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'proactive-private', reset: true })
      })
      const j = await r.json().catch(() => ({}))
      if (j && j.ok === false) throw new Error(j.error || '恢复失败')
      toast('已恢复默认，刷新面板可见')
    } catch (e) {
      toast('恢复失败：' + (e.message || e))
    }
  })
}
