# 定格今日 · 复盘闪卡

**日拱一卒** — 每日复盘 + 认知闪卡 MVP，本地缓存 + 可选 Supabase 登录云同步。

## 功能

- **领域管理**：工作、副业、生活、学习等，可自定义增删
- **今日复盘**：1-5 星评分 + 今日状态标签（一天一条，保存覆盖）
- **领域复盘**：按领域的 KPT 结构化复盘 + 整体 1-5 星评分（可多条）
- **历史记录**：按日 / 按领域回顾，支持列表/卡片、编辑、删除
- **闪卡库**：概念 + 具体认知 + 标签，支持折叠详情、编辑、删除
- **数据备份**：JSON 导出/导入
- **账号同步**：配置 Supabase 后邮箱验证码登录，手机与电脑数据一致

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
├── supabase/schema.sql   # 数据库 + RLS
├── js/
│   ├── app.js
│   ├── auth.js           # 登录 / 登出
│   ├── supabaseClient.js
│   ├── session.js        # 当前用户与 storage key
│   ├── cloudSync.js      # 按 user_id 同步
│   ├── backup.js
│   ├── storage.js
│   └── ...
└── README.md
```

## 数据存储

- 未登录：`localStorage` key `rigong_flashcards_v1`
- 已登录：`rigong_flashcards_v1::<user_id>`，并同步到 Supabase `app_states`

## Supabase 配置（多端同步）

### 1) 创建项目并开启邮箱登录

1. [Supabase](https://supabase.com) 新建项目  
2. **Authentication → Providers → Email**：开启 Email，建议开启 **Email OTP**  
3. **Authentication → URL Configuration**  
   - Site URL：`https://你的用户名.github.io/my-flashcard/`  
   - Redirect URLs：同上（本地开发可加 `http://localhost:3000`）

### 2) 执行 SQL

在 **SQL Editor** 运行 `supabase/schema.sql`（按 `user_id` 主键 + RLS）。

### 3) 填写前端配置

编辑 `js/config.js`：

```js
export const SUPABASE_URL = 'https://xxxx.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJ...';  // 仅 anon key，不要用 service_role
```

留空则**不显示登录**，仅本地模式。

### 4) 使用方式

1. 手机、电脑用**同一邮箱**登录  
2. 首次登录若本机有未登录数据，会提示是否上传云端  
3. 之后每次保存自动同步（约 400ms 防抖）

## GitHub Pages

推送 `main` 分支后，Settings → Pages → Deploy from branch → `main` / root。
