# qq-agent-proactive

给 QQ Agent 加一颗会自己起话头的心：**没人在说话的时候，它也可能先开口。**

纯本地掷骰：掷骰本身不花一分钱，只有掷中、真的叫它开口那一步才花模型。

给 **[qq-agent](https://github.com/lyyde599/qq-agent)** 与基于其插件内核的版本（BG-QQagent v3 一类）用。

## 这个仓库里有两个版本

| 你的程序 | 怎么认 | 用哪个目录 |
|:--|:--|:--|
| 插件内核版 | 目录里有 `plugins/` 和 `src/core/` | **`proactive-private/`** |
| 单文件版 | 有 `src/orchestrator.js`，没有 `plugins/` | **`qq-agent-patch/`** |

两个都试也不会坏。插件版装错了最多是「插件列表里多一个不工作的条目」；补丁版装错了会直接告诉你「没找到 startProactiveLoop()」然后什么都不改。

---

## 一、插件版

### 装

把 `proactive-private/` 整个复制到程序的 `plugins/` 下，变成 `plugins/proactive-private/manifest.json` 这个结构，然后重启服务或点面板的「重载」。

也可以用面板：插件页 → 导入插件包 → 选打包好的 `proactive-private.tar.gz`。

### 装完必须做的两件事

不做的話它永远不会开口：

1. 插件详情里**勾上会话**（作用域）；
2. 先开着**「试运行」**跑两天，看日志确认节奏，再关掉。

日志在 `data/plugins/proactive-private/proactive.log`，或 `GET /api/plugins/proactive-private/log`：

```
2026/10/24 21:41:14  命中并开口：掷出 49.4 ／ 命中线 60.0（谷时／×1，已安静 60 分钟）
2026/10/24 21:06:06  没中：掷出 28.4 ／ 命中线 19.0（谷时／刚聊过×0.15／没中加成+10，连没中 2 次）
```

---

## 二、单文件版补丁

```bash
# 在 qq-agent 目录里
node install.mjs

# 或指定目录
node install.mjs D:\bots\qq-agent
```

它会备份 `src/orchestrator.js` 为 `.bak-proactive`，然后**只替换 `startProactiveLoop()` 这一个方法**，其它代码不动。重复跑会说「已经打过」然后退出。

> 升级 qq-agent 会覆盖补丁，升级完重跑一次 `install.mjs` 即可。

---

## 三、它怎么决定开不开口

```
每 intervalMin（默认 30）分钟醒一次，按顺序过筛：

安静时段（默认 1~8 点）        → 根本不掷
冷却（默认 20 分钟，刚开过口）  → 不掷
会话没安静够（默认 45 分钟）    → 不掷
掷骰：命中线 = 峰/谷时基准 × 时机因子 + 连续没中加成
```

| 参数 | 默认 | 说明 |
|:--|:--|:--|
| `intervalMin` | 30 | 两次掷骰之间隔多久 |
| `cooldownMin` | 20 | 刚自己开过口，这段时间不再开口 |
| `idleMin` | 45 | 会话要安静这么久才进入候选 |
| `quietStart` / `quietEnd` | 1 / 8 | 安静时段，含起不含止；起 === 止 = 不启用 |
| `peakPct` | 20 | 峰时命中线（周一~周五 09–12、14–18） |
| `offPeakPct` | 60 | 谷时命中线（其余全部） |
| `missBonusPct` / `missBonusCapPct` | 10 / 40 | 连续没中一次加 10，最多加 40 |
| `dryRun` | false | 开着时掷中也不真发，只写日志 |

时机因子：距它上次说话 < 20 分钟 → ×0.15（更难开口）；> 6 小时 → ×1.5（更容易）；中间 ×1。

**调参建议**：觉得太吵就调小 `offPeakPct`（比如 30），觉得太冷就调大它，或者把 `intervalMin` 收到 15。

---

## 四、它不负责的事

- **不负责它说什么**。这个插件只决定「什么时候叫它开口」，内容还是人设的事。想让它别一开口就是「好久没聊了」，去人设里写死。
- **不保证不被风控**。主动发消息比只回消息更像机器人，频率别调太高。

## 许可

MIT。基于 [qq-agent](https://github.com/lyyde599/qq-agent) 与其插件内核规范编写；
掷骰设计参考了 [dsh-speak-up](https://github.com/Yuuyuko-uu/dsh-speak-up)。
