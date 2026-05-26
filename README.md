# 定格今日 · 复盘闪卡

**日拱一卒** — 每日复盘 + 认知闪卡 MVP，数据保存在浏览器 LocalStorage。

## 功能

- **领域管理**：工作、副业、生活、学习等，可自定义增删
- **今日复盘**：1-5 星评分 + 今日状态标签（一天一条，保存覆盖）
- **领域复盘**：按领域的 KPT 结构化复盘 + 整体 1-5 星评分（可多条）
- **历史记录**：按日 / 按领域回顾，支持列表/卡片、编辑、删除
- **闪卡库**：概念 + 具体认知 + 标签，支持折叠详情、编辑、删除
- **数据备份**：在「领域设置」页导出/导入 JSON 备份

## 本地运行

ES Module 需要通过本地服务器打开（不要直接双击 `index.html`）。

```bash
cd /path/to/my-cursor-app
npx serve .
```

## 项目结构

```
├── index.html
├── css/style.css
├── js/
│   ├── app.js
│   ├── config.js
│   ├── storage.js
│   ├── backup.js
│   └── ...
└── README.md
```

## 数据存储

- Key：`rigong_flashcards_v1`
- 数据仅存在当前浏览器，清除站点数据会丢失记录
- 换机或多端同步请使用「领域设置」中的 **导出备份 / 导入备份**

## GitHub Pages

推送 `main` 后访问：`https://cc1024xx-sys.github.io/my-flashcard/`
