# 定格今日 · 复盘闪卡

**日拱一卒** — 每日复盘 + 认知闪卡 MVP，默认本地存储，支持同步到 Supabase 云端。

## 功能

- **领域管理**：工作、副业、生活、学习等，可自定义增删
- **今日复盘**：1-5 星评分 + 今日状态标签（一天一条，保存覆盖）
- **领域复盘**：按领域的 KPT 结构化复盘 + 整体 1-5 星评分（可多条）
- **历史记录**：今日复盘与领域复盘分栏回顾；领域支持列表/卡片、编辑、删除
- **闪卡库**：概念 + 具体认知 + 标签，从历史复盘提炼，支持编辑、删除
- **数据备份**：在「领域设置」页导出/导入 JSON 备份（导入会覆盖当前数据）

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
│   ├── cloudSync.js    # Supabase 云同步
│   ├── backup.js       # JSON 备份导出/导入
│   ├── storage.js      # LocalStorage 读写
│   ├── utils.js        # 工具函数
│   ├── domains.js      # 领域管理
│   ├── reviews.js      # 复盘与历史
│   └── flashcards.js   # 闪卡提炼
└── README.md
```

## 数据存储

- Key：`rigong_flashcards_v1`
- 清除站点数据会丢失记录，可开启 Supabase 同步减少风险

## Supabase 云同步（可选）

项目已内置云同步适配层：

- 启动时：尝试从 Supabase 拉取最新状态并回填本地
- 保存时：先写 LocalStorage，再异步 upsert 到 Supabase

### 1) 在 Supabase 建表

在 SQL Editor 执行：

```sql
create table if not exists public.app_states (
  id text primary key,
  state jsonb not null,
  updated_at timestamptz not null default now()
);
```

### 2) 配置前端常量

编辑 `js/config.js`：

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_STATE_ID`（建议按环境区分，如 `prod` / `dev`）

留空则自动退回纯本地模式。
