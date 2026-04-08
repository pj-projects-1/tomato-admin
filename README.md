# 四月红番天 - 有机番茄销售管理系统

有机番茄销售管理后台系统，专为小型有机番茄农场设计。

## 功能特性

- **仪表盘** - 销售数据概览、图表分析、今日待办
- **客户管理** - 客户信息、多地址管理、客户订单历史
- **订单管理** - 创建订单、付款状态跟踪、配送地址分配
- **库存管理** - 入库/出库记录、库存余额、采摘日期追溯
- **配送规划** - 配送任务创建、路线规划、高德地图导航链接
- **移动适配** - 响应式设计，手机端直接使用

## 技术栈

- **前端框架**: Vue 3 + TypeScript
- **构建工具**: Vite 7
- **UI 组件库**: Element Plus
- **状态管理**: Pinia
- **地图服务**: 高德地图 (Amap)
- **后端服务**: Supabase (PostgreSQL + Auth)
- **部署**: Cloudflare Pages

## 开发环境要求

- Node.js 18+
- npm 或 pnpm

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/pj-projects-1/tomato-admin.git
cd tomato-admin
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

复制 `.env.example` 为 `.env` 并填入你的配置：

```bash
cp .env.example .env
```

必需的环境变量：

| 变量名 | 说明 | 获取方式 |
|--------|------|----------|
| `VITE_SUPABASE_URL` | Supabase 项目 URL | [Supabase Dashboard](https://supabase.com/dashboard) |
| `VITE_SUPABASE_ANON_KEY` | Supabase 匿名密钥 | Supabase Dashboard → Settings → API |
| `VITE_AMAP_KEY` | 高德地图 Web服务 Key | [高德开放平台](https://lbs.amap.com/) |
| `VITE_AMAP_JS_KEY` | 高德地图 JS API Key | 高德开放平台 |
| `VITE_AMAP_JS_SECURITY_KEY` | 高德地图 JS 安全密钥 | 高德开放平台 |

### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

## 可用脚本

```bash
# 开发模式
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview

# 运行测试
npm run test

# 代码检查
npm run lint
```

## 项目结构

```
src/
├── api/           # API 调用和外部服务
│   ├── amap.ts    # 高德地图服务
│   ├── export.ts  # 数据导出工具
│   └── supabase.ts # Supabase 客户端
├── components/    # 可复用组件
├── lib/           # 工具库
├── router/        # 路由配置
├── stores/        # Pinia 状态管理
├── types/         # TypeScript 类型定义
├── utils/         # 工具函数
└── views/         # 页面组件
    ├── Dashboard.vue
    ├── Customers.vue
    ├── Orders.vue
    ├── Stocks.vue
    ├── Deliveries.vue
    └── DeliveryDetail.vue
```

## 部署

### Cloudflare Pages

项目已配置为部署到 Cloudflare Pages。

**重要**: 生产环境部署必须使用 `--branch=master` 标志。

```bash
# 生产部署
npm run build && npx wrangler pages deploy dist --project-name=tomato-admin --branch=master
```

**完整部署文档请参考**: [docs/WORKFLOWS.md](docs/WORKFLOWS.md)

### 自定义域名

生产环境域名: https://hongfantian.dpdns.org

## 开发工作流文档

详细的开发、预览和生产部署流程请参考:

- [WORKFLOWS.md](docs/WORKFLOWS.md) - 完整工作流文档
  - 本地开发流程
  - 预览分支部署
  - 生产环境部署
  - 数据库安全注意事项
  - 紧急回滚方案
  - 分支结构说明

## 数据库结构

应用使用 Supabase (PostgreSQL)，主要表结构：

- `customers` - 客户信息
- `orders` - 订单
- `deliveries` - 配送记录
- `stocks` - 库存流水
- `delivery_tasks` - 配送任务

## 测试

```bash
# 运行单元测试
npm run test

# 运行 e2e 测试
npm run test:e2e
```

## 常见问题

### 地图无法加载？

检查高德地图 API Key 是否正确配置，以及是否添加了正确的域名白名单。

### 登录失败？

确保 Supabase 项目已启用 Email 认证，并检查用户是否已创建。

### 手机端页面加载问题？

PWA 缓存可能导致旧版本残留，尝试：
1. 清除浏览器缓存
2. 或在浏览器设置中清除网站数据

## 许可证

MIT

## 联系方式

如有问题，请提交 GitHub Issue。
