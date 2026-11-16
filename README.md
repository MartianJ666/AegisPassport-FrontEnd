# AegisPassport-FrontEnd

[![Vue](https://img.shields.io/badge/Vue-3.x-4FC08D?logo=vue.js&logoColor=white)](https://vuejs.org/)
[![Vuetify](https://img.shields.io/badge/Vuetify-3.x-1867C0?logo=vuetify&logoColor=white)](https://vuetifyjs.com/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A522-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![License: GPL-3.0-only](https://img.shields.io/badge/License-GPL--3.0--only-blue.svg)](./LICENSE)

**AegisPassport** 统一身份认证中心（IdP）的账户管理与 OAuth 2.0 / OIDC 授权前端界面，基于 **Vue 3**、**Vuetify** 与 **Vite** 构建，需与后端服务 [AegisPassport-BackEnd](https://github.com/MartianJ666/AegisPassport-BackEnd) 配套部署。

---

## 核心特性

- **多模式身份认证**：支持用户名或邮箱密码登录（前端 RSA 公钥加密传输）、邮箱验证码自助注册、上游第三方 OIDC 登录、首次外部登录新账号初始化及多账号绑定。
- **OAuth 2.0 / OIDC 授权交互**：完整的授权同意（Consent）页面、多账号切换与账号确认（Account Confirm）流程、授权续接（Login Continuation）及已授权应用撤销。
- **个人账户与安全中心**：个人资料维护、密码修改（支持密码二次确认验证）、活跃登录设备会话管理与远程下线、个人 API 密钥管理。
- **细粒度管理后台**：
  - 用户、组织架构、RBAC 角色权限与用户级临时/永久应用访问规则配置。
  - OAuth 2.0 客户端应用注册与管理、第三方 OIDC 登录源配置、全局 API 密钥管控。
  - SMTP 邮件服务配置、定向应用系统公告发布、自定义登录页背景图配置。
- **安全审计与可视化**：支持按条件检索操作与安全审计日志、中文语义化事件还原、IPv6 地址完整展示及 CSV 报表导出。
- **响应式与主题适配**：内置浅色 / 深色（Light / Dark）双主题切换及移动端窄屏自适应布局。

---

## 前后端路由与代理拓扑

由于授权同意页（`/oauth2/consent`）与账号确认页（`/oauth2/account-confirm`）由前端 SPA 渲染，而标准 OAuth 2.0 / OIDC 协议端点（`/oauth2/authorize`、`/oauth2/token` 等）由后端处理，系统在开发代理（Vite）与生产网关（Nginx）中均执行精细化路由分流：

```text
Browser ──▶ Nginx / Vite Dev Server (:8420)
              ├── /auth/* , /oauth2/consent , /oauth2/account-confirm ──▶ 前端 SPA (index.html)
              ├── /api/* , /.well-known/* , /userinfo , /connect/*   ──▶ 后端服务 (:8421)
              ├── 其他 /oauth2/* (authorize / token / jwks / revoke)   ──▶ 后端服务 (:8421)
              └── /uploads/* , /oauth-continue.js                      ──▶ 后端服务 (:8421)
```

> **重要提示**：若使用自定义反向代理或静态托管服务，**切勿**将 `/oauth2/*` 整段无差别转发至后端，必须为 `/oauth2/consent` 与 `/oauth2/account-confirm` 保留前端 SPA 回退规则，否则会导致授权重定向死循环。

---

## 本地启动

### 1. 环境要求
- **Node.js** `>= 22.0.0`
- 已启动并运行在 `8421` 端口的 `AegisPassport-BackEnd` 服务

### 2. 安装与运行

```bash
git clone https://github.com/MartianJ666/AegisPassport-FrontEnd.git
cd AegisPassport-FrontEnd

# 严格按照锁文件安装依赖
npm ci

# 启动开发服务器（默认监听 8420 端口）
npm run dev -- --host 127.0.0.1
```

启动后访问 `http://localhost:8420`。开发服务器默认将所有 `/api`、`/oauth2`（除前端页面外）及 `/uploads` 请求代理至 `http://localhost:8421`。

### 3. 初始管理员账号
- **默认用户名**：`admin`
- **默认密码**：后端首次初始化时随机生成的 20 位高强度密码，仅在后端启动日志中打印一次：
  - 本地启动：查看后端控制台输出的 `username:` 与 `password:` 行。
  - 容器部署：执行 `docker logs server` 查看初始化日志。
  - 自定义密码：可在首次启动后端前通过环境变量 `BOOTSTRAP_ADMIN_PASSWORD` 指定（详见后端 README）。
- **自助注册说明**：系统默认开启自助注册，但需先使用管理员账号登录并在 **「系统管理 -> 邮件配置」** 中填写并启用 SMTP 服务，用户方可接收注册验证码。

---

## 环境变量配置

复制 `.env.example` 为 `.env.local` 进行本地调试配置，修改后需重启开发服务器；生产构建默认读取 `.env.production`。

| 变量名 | 默认值 | 说明 |
| :--- | :--- | :--- |
| `VITE_API_TARGET` | `http://localhost:8421` | Vite 开发服务器的后端反向代理目标地址 |
| `VITE_AUTH_ORIGIN` | 当前页面 `origin` | 登录与账户管理界面的公开 Origin（仅含协议、域名和可选端口，不含路径） |
| `VITE_CONSENT_ORIGIN` | 当前页面 `origin` | 授权同意与账号确认页面的公开 Origin |

- **同源部署**：前后端挂载在同一域名下时，`VITE_AUTH_ORIGIN` 与 `VITE_CONSENT_ORIGIN` 留空即可。
- **独立授权域名部署**：若将授权页面拆分至独立子域名，需同步配置后端的 `FRONTEND_URL`、`CONSENT_BASE_URL` 与 `CORS_ALLOWED_ORIGINS`。
- **安全红线**：`VITE_*` 变量会在构建时打包进前端静态资源，仅可存放公开访问地址；`JWT_SECRET`、数据库密码及 OIDC 客户端密钥等敏感凭据严禁配置在前端。

---

## 测试与构建

```bash
# 运行前端回归测试（覆盖授权续接、同意表单提交、二次密码验证失败处理、注册续接及代理规则）
npm test

# 构建生产环境静态资源（输出至 dist/ 目录）
npm run build
```

---

## 生产部署

### 方式一：Docker 容器部署（推荐）

仓库内置了多阶段构建 `Dockerfile` 及生产级 `nginx/default.conf`（已集成安全响应头 `nginx/proxy_headers.conf` 与精确路由分流规则）。

1. 确保已按后端 README 创建 `passport` Docker 网络，且后端容器名为 `server`。
2. 构建并启动前端容器：

```bash
docker build -t aegis-passport-frontend:local .

docker run -d --name passport-web \
  --network passport \
  -p 127.0.0.1:8080:80 \
  aegis-passport-frontend:local
```

> 容器内 Nginx 默认将后端请求代理至 `server:8421`。若后端容器名称或端口不同，请修改 `nginx/default.conf` 后重新构建镜像。

### 方式二：外层 HTTPS 网关接入

生产环境强烈建议在前端容器外层挂载 HTTPS 反向代理（如 Nginx、Caddy 或 Cloudflare），并确保透传以下请求头，以便后端正确识别公开协议与域名并签发 OIDC Issuer 地址：

```nginx
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

---

## 项目目录结构

```text
AegisPassport-FrontEnd/
├── nginx/                  # 生产环境 Nginx 路由分流与代理头配置
├── src/
│   ├── api/                # Axios 实例封装、业务接口模块及前端 RSA 密码加密
│   ├── components/         # 通用弹窗、权限控制门卫 (PermissionGate) 及认证壳组件
│   ├── composables/        # 登录背景动态加载等组合式函数
│   ├── layouts/            # 控制台主框架与动态侧边栏导航配置
│   ├── plugins/            # Vuetify 主题与图标库初始化
│   ├── router/             # 路由表定义与登录态/权限路由守卫
│   ├── stores/             # Pinia 状态管理（用户认证态、UI 主题与布局）
│   ├── styles/             # 全局样式表
│   ├── utils/              # URL 校验、审计日志格式化、授权续接与错误处理工具
│   └── views/              # 页面视图（auth 认证流、admin 管理后台、个人安全中心）
├── tests/                  # Node 原生回归测试套件
├── Dockerfile              # 前端镜像构建文件
└── vite.config.js          # Vite 构建与开发服务器代理规则
```

---

## 开源许可证

本仓库源码基于 **GNU General Public License v3.0 only**（SPDX：`GPL-3.0-only`）协议开源，完整条款请参阅 [LICENSE](./LICENSE)。第三方开源依赖保留其各自原始许可证，详情见 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)。