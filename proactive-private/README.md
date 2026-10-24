# 主动搭话（私聊）· proactive-private

没人在说话的时候，让它**自己开口**。纯本地掷骰，掷中才调一次模型——不掷中的那些轮次一分钱不花。

## 装

**方式一（面板导入，推荐）**

插件页 → 导入插件包 → 选 `proactive-private.tar.gz` → 导入后在列表里打开开关。

**方式二（解压）**

```bash
tar xzf proactive-private.tar.gz -C plugins/
# 解压后应是 plugins/proactive-private/manifest.json
```

然后重启服务，或点面板的「重载」。

## 开之前先设这两样

1. 插件详情里**勾上要让 TA 主动说话的会话**（作用域）；没勾的会话永远不会被唤醒。
2. 打开开关。建议**先开「试运行」**看两天日志再关。

## 怎么判断该不该开口

每 `intervalMin`（默认 30）分钟醒一次，按顺序过筛：

```
安静时段（默认 1~8 点）→ 根本不掷
冷却（默认 20 分钟，刚自己开过口）→ 不掷
会话没安静够（默认 45 分钟）→ 不掷
掷骰：命中线 = 峰/谷时基准 × 时机因子 + 连续没中加成
```

| 参数 | 默认 | 说明 |
|:--|:--|:--|
| `intervalMin` | 30 | 两次掷骰之间隔多久（分钟） |
| `cooldownMin` | 20 | 刚自己开过口，这段时间不再开口 |
| `idleMin` | 45 | 会话要安静这么久才进入候选 |
| `quietStart` / `quietEnd` | 1 / 8 | 安静时段，含起不含止；起 === 止 = 不启用 |
| `peakPct` | 20 | 峰时命中线（周一~周五 09–12、14–18） |
| `offPeakPct` | 60 | 谷时命中线（其余全部） |
| `missBonusPct` | 10 | 每连续没中一次，命中线加多少 |
| `missBonusCapPct` | 40 | 加成最多加到多少 |
| `dryRun` | false | 开着时掷中也不真发，只写日志 |

时机因子：距它上次说话 < 20 分钟 → ×0.15；> 6 小时 → ×1.5；中间 ×1。

## 看日志

插件目录（`data/plugins/proactive-private/proactive.log`）里每次判定都有一行：

```
2026/10/24 21:41:14  命中并开口：掷出 49.4 ／ 命中线 60.0（谷时／×1，已安静 60 分钟）
2026/10/24 21:06:06  没中：掷出 28.4 ／ 命中线 19.0（谷时／刚聊过×0.15／没中加成+10，连没中 2 次）
```

也可以 `GET /api/plugins/proactive-private/log` 直接读。

## 依赖

无外部依赖。需要内核暴露 `ctx.orchestrator.wake`（apiVersion 1 自带）。

## 许可

MIT。基于 [qq-agent](https://github.com/lyyde599/qq-agent) / BG-QQagent 的插件规范编写，参考了
[dsh-speak-up](https://github.com/Yuuyuko-uu/dsh-speak-up) 的掷骰设计。
