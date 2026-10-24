Add-Type -AssemblyName System.Drawing

$W = 1200
$H = 820
$bmp = New-Object System.Drawing.Bitmap($W, $H)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
$g.Clear([System.Drawing.Color]::FromArgb(252, 252, 253))

$fontTitle = New-Object System.Drawing.Font("Microsoft YaHei", 26, [System.Drawing.FontStyle]::Bold)
$fontSub = New-Object System.Drawing.Font("Microsoft YaHei", 13)
$fontBox = New-Object System.Drawing.Font("Microsoft YaHei", 13)
$fontBoxB = New-Object System.Drawing.Font("Microsoft YaHei", 13, [System.Drawing.FontStyle]::Bold)
$fontSmall = New-Object System.Drawing.Font("Microsoft YaHei", 11)
$fontMono = New-Object System.Drawing.Font("Consolas", 12)

$ink = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(32, 34, 40))
$gray = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(118, 124, 136))
$green = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(22, 138, 92))
$red = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(196, 78, 78))
$blue = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(46, 98, 186))

$penBox = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(210, 214, 222), 1.6)
$penGreen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(22, 138, 92), 1.8)
$penRed = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(196, 78, 78), 1.8)
$penArrow = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(150, 156, 168), 1.6)

function RoundRect($x, $y, $w, $h, $r) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $p.AddArc($x, $y, $r * 2, $r * 2, 180, 90)
  $p.AddArc($x + $w - $r * 2, $y, $r * 2, $r * 2, 270, 90)
  $p.AddArc($x + $w - $r * 2, $y + $h - $r * 2, $r * 2, $r * 2, 0, 90)
  $p.AddArc($x, $y + $h - $r * 2, $r * 2, $r * 2, 90, 90)
  $p.CloseFigure()
  return $p
}

function Box($x, $y, $w, $h, $text, $pen) {
  $p = RoundRect $x $y $w $h 10
  $g.FillPath((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)), $p)
  $g.DrawPath($pen, $p)
  $fmt = New-Object System.Drawing.StringFormat
  $fmt.Alignment = [System.Drawing.StringAlignment]::Center
  $fmt.LineAlignment = [System.Drawing.StringAlignment]::Center
  $rect = New-Object System.Drawing.RectangleF($x, $y, $w, $h)
  $g.DrawString($text, $fontBox, $ink, $rect, $fmt)
  $p.Dispose()
}

function ArrowDown($cx, $y1, $y2) {
  $g.DrawLine($penArrow, $cx, $y1, $cx, $y2 - 6)
  $g.DrawLine($penArrow, $cx - 5, $y2 - 8, $cx, $y2 - 1)
  $g.DrawLine($penArrow, $cx + 5, $y2 - 8, $cx, $y2 - 1)
}

function ArrowRight($x1, $x2, $cy, $pen) {
  $g.DrawLine($pen, $x1, $cy, $x2 - 6, $cy)
  $g.DrawLine($pen, $x2 - 8, $cy - 5, $x2 - 1, $cy)
  $g.DrawLine($pen, $x2 - 8, $cy + 5, $x2 - 1, $cy)
}

# 标题
$g.DrawString("主动搭话是怎么判断「该不该开口」的", $fontTitle, $ink, 60, 46)
$g.DrawString("本地掷骰不花 token —— 只有掷中、真的叫它开口那一步才花钱", $fontSub, $gray, 62, 92)

# 左侧流程
$lx = 60
$lw = 430
$y = 150
Box $lx $y $lw 56 "每 30 分钟醒一次（纯本地）" $penBox
ArrowDown ($lx + $lw / 2) ($y + 56) ($y + 86)

$y = 236
Box $lx $y $lw 56 "安静时段？（默认 1~8 点）" $penBox
ArrowRight ($lx + $lw) ($lx + $lw + 60) ($y + 28) $penRed
$g.DrawString("不掷", $fontSmall, $red, ($lx + $lw + 68), ($y + 16))
ArrowDown ($lx + $lw / 2) ($y + 56) ($y + 86)

$y = 322
Box $lx $y $lw 56 "刚自己开过口？冷却 20 分钟" $penBox
ArrowRight ($lx + $lw) ($lx + $lw + 60) ($y + 28) $penRed
$g.DrawString("不掷", $fontSmall, $red, ($lx + $lw + 68), ($y + 16))
ArrowDown ($lx + $lw / 2) ($y + 56) ($y + 86)

$y = 408
Box $lx $y $lw 56 "这个会话安静够 45 分钟了吗" $penBox
ArrowRight ($lx + $lw) ($lx + $lw + 60) ($y + 28) $penRed
$g.DrawString("不掷", $fontSmall, $red, ($lx + $lw + 68), ($y + 16))
ArrowDown ($lx + $lw / 2) ($y + 56) ($y + 86)

$y = 494
Box $lx $y $lw 64 "掷一次骰子（Math.random）" $penBox
ArrowDown ($lx + $lw / 2) ($y + 64) ($y + 92)

$y = 586
$x1 = 60
$w1 = 205
Box $x1 $y $w1 62 "掷中 → 开口" $penGreen
Box ($x1 + $w1 + 20) $y $w1 62 "没中 → 下次 +10" $penRed
$g.DrawString("花一次模型", $fontSmall, $green, ($x1 + 52), ($y + 68))
$g.DrawString("只记一笔", $fontSmall, $red, ($x1 + $w1 + 92), ($y + 68))

# 右侧：命中线怎么来的
$rx = 620
$rw = 520
$card = RoundRect $rx 150 $rw 500 12
$g.FillPath((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(247, 248, 250))), $card)
$g.DrawPath($penBox, $card)

$g.DrawString("命中线是怎么算出来的", $fontBoxB, $ink, ($rx + 28), 172)
$g.DrawString("掷出的数小于命中线，它就开口", $fontSmall, $gray, ($rx + 28), 202)

$rows = @(
  @("峰时基准", "20%", "周一~周五 09–12、14–18"),
  @("谷时基准", "60%", "其余全部（夜里、午休、周末）"),
  @("时机因子", "×0.15", "距上次说话 < 20 分钟"),
  @("", "×1.5", "距上次说话 > 6 小时"),
  @("没中加成", "+10", "每连续没中一次，最多 +40")
)

$yy = 240
foreach ($r in $rows) {
  $g.DrawString($r[0], $fontSmall, $gray, ($rx + 28), $yy)
  $g.DrawString($r[1], $fontMono, $blue, ($rx + 200), $yy - 2)
  $g.DrawString($r[2], $fontSmall, $gray, ($rx + 280), $yy)
  $yy += 38
}

$line = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(226, 229, 235), 1)
$g.DrawLine($line, ($rx + 28), 438, ($rx + $rw - 28), 438)

$g.DrawString("举例", $fontBoxB, $ink, ($rx + 28), 456)
$g.DrawString("晚上九点，已经安静了两小时：", $fontSmall, $gray, ($rx + 28), 488)
$g.DrawString("60% × 1 = 60  ->  掷出 49.4，就开口了", $fontMono, $ink, ($rx + 28), 514)
$g.DrawString("刚聊完还在冷却外：", $fontSmall, $gray, ($rx + 28), 552)
$g.DrawString("60% × 0.15 = 9  ->  基本不会来打扰", $fontMono, $ink, ($rx + 28), 578)

$g.DrawString("所有判断都写进日志，能看能调。", $fontSmall, $gray, ($rx + 28), 612)

$out = "L:\制作洛\分享\qq-agent-proactive\docs\how-it-works.png"
New-Item -ItemType Directory -Force -Path (Split-Path $out) | Out-Null
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()
Write-Host "已生成: $out"
Write-Host ("尺寸: " + (Get-Item $out).Length + " 字节")
