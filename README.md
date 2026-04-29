# Linnin TopBar Text

GNOME Shell 顶栏自定义文本扩展，支持动态变量和句子 API。

## 功能

- 在 GNOME 顶栏显示自定义文本
- 支持动态变量：`{time}` `{date}` `{cpu}` `{memory}` `{okbang}`
- 定时从 API 获取句子（https://linnin.cn/api/sentence）
- 可自定义文本位置（左/中/右）
- 可调节刷新间隔

## 安装

```bash
cp -r linnin-topbar-text@linnin ~/.local/share/gnome-shell/extensions/
cd ~/.local/share/gnome-shell/extensions/linnin-topbar-text@linnin/schemas
glib-compile-schemas .
gnome-extensions enable linnin-topbar-text@linnin
```

按 `Alt+F2` 输入 `r` 回车重启 GNOME Shell。

## 配置

打开扩展管理器或运行：

```bash
gsettings --schemadir ~/.local/share/gnome-shell/extensions/linnin-topbar-text@linnin/schemas set org.gnome.shell.extensions.linnin-topbar-text text "CPU: {cpu} | 内存: {memory} | {okbang}"
```

## 支持版本

GNOME Shell 45 - 50
