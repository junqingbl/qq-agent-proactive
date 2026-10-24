# 手机端舒适化补丁 · qq-agent 面板

> 只在小屏（≤ 820px）生效，桌面端**一点不动**。

## 为什么不是一个"内核插件"

内核的插件机制只允许插件**加一个页签**（`uiTab` + `mount(root, ctx)`），没有"给整个面板注入全局样式"的接口。想改整个面板的观感，只能在**页面被发出去之前**插一行 `<link>`。

所以这个补丁走的是**反向代理层**（nginx），不改内核、不改 `ui/` 里任何文件，升级内核也不会被覆盖。

如果你的面板是直接暴露的、没有反向代理，用文末的「方式二」。

## 改了什么

| 项 | 变化 |
|---|---|
| 字号 | 正文 15.5px、行高 1.65；输入框强制 16px（**小于 16px 时 iOS 聚焦会自动放大页面**，这是手机上最烦人的一跳） |
| 点按 | 按钮、页签、选择器最小 44×44，复选框 22×22 |
| 溢出 | 长串（key、路径、id）自动换行；表格自己横向滚；图片 `max-width:100%` |
| 间距 | 卡片圆角 14px、内边距放大、卡片之间 12px 呼吸 |
| 顶栏/页签 | 吸顶；页签可横滑、隐藏滚动条 |
| 设置页 | 左侧栏在手机上变成上方横滑的一排 |
| 弹窗 | 占满宽度、贴底、圆角，内部自己滚 |
| 底部 | 留 `safe-area-inset-bottom`，不被 home indicator 挡住 |

## 方式一：nginx 注入（推荐）

1. 把 `mobile.css` 放到 `/var/www/luoluo/mobile.css`；
2. 在你面板的 `server {}` 里加两段：

```nginx
    location /m/ {
        alias /var/www/luoluo/;
        expires 1h;
    }

    location /你们的面板路径/ {
        auth_basic "luoluo";
        auth_basic_user_file /etc/nginx/.htpasswd;

        proxy_pass http://127.0.0.1:3210/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;

        # 关键三行：拿到明文 HTML，再往 </head> 前插一行
        proxy_set_header Accept-Encoding "";
        sub_filter_once on;
        sub_filter "</head>" "<link rel=\"stylesheet\" href=\"/m/mobile.css\"></head>";

        proxy_buffering off;
    }
```

3. `nginx -t && systemctl reload nginx`；
4. 手机刷新一下（**不是**开新标签——旧页面还在用老 CSS）。

验证：`curl -u 用户名:密码 http://你的地址/路径/ | grep mobile.css` 能看到那行 `<link>` 就成了。

## 方式二：直接改 index.html（没有反代时）

在 `ui/index.html` 的 `</head>` 前加一行：

```html
<link rel="stylesheet" href="./mobile.css" />
```

再把 `mobile.css` 复制到 `ui/` 目录下。

> 注意：这是改内核文件，**升级 qq-agent 会丢**。升级后重做一次。

## 想调

整份 CSS 只有一层 `@media (max-width: 820px)`，改数字就生效：

- 觉得字还是小 → `body { font-size: 15.5px }` 往上调；
- 觉得卡片太松 → 把 `.card { padding: 14px }` 和 `margin-bottom: 12px` 收小；
- 平板也想用 → 把 `820px` 改成 `1024px`。

## 许可

MIT。
