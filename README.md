# 定格今日 · 复盘闪卡

**日拱一卒** — 每日复盘 + 认知闪卡 MVP，数据保存在浏览器 LocalStorage。

## 功能

- **领域管理**：工作、副业、生活、学习等，可自定义增删
- **今日复盘**：1-5 星评分 + 今日状态标签（一天一条，保存覆盖）
- **领域复盘**：按领域的 KPT 结构化复盘 + 整体 1-5 星评分（可多条）
- **历史记录**：今日复盘与领域复盘分栏回顾；领域支持列表/卡片、编辑、删除
- **闪卡库**：正面概念 + 背面具体认知 + 标签，从历史复盘提炼，支持编辑、删除

## 本地运行

ES Module 需要通过本地服务器打开（不要直接双击 `index.html`）。

### 方式一：Live Server（推荐）

在 Cursor / VS Code 安装 Live Server 扩展，右键 `index.html` → **Open with Live Server**。

### 方式二：npx

```bash
cd /path/to/my-cursor-app
npx serve .
```

浏览器访问终端提示的地址（通常是 `http://localhost:3000`）。

## 项目结构

```
├── index.html
├── css/style.css
├── js/
│   ├── app.js          # 启动与视图切换
│   ├── config.js       # 常量与默认领域
│   ├── storage.js      # LocalStorage 读写
│   ├── utils.js        # 工具函数
│   ├── domains.js      # 领域管理
│   ├── reviews.js      # 复盘与历史
│   └── flashcards.js   # 闪卡提炼
└── README.md
```

## 数据存储

- Key：`rigong_flashcards_v1`
- 清除站点数据会丢失记录，后续可扩展导出 JSON 备份
