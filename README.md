# AegisPassport-FrontEnd

AegisPassport 的账户管理与 OAuth 授权界面，使用 Vue 3、Vuetify 和 Vite。与 [AegisPassport-BackEnd](https://github.com/MartianJ666/AegisPassport-BackEnd) 配套部署。

## 功能

- 用户名或邮箱登录、邮箱验证码注册、第三方 OIDC 登录与账号绑定。
- 个人资料、密码修改、登录设备管理与应用授权撤销。
- 用户、组织、角色权限和个人应用访问规则管理。
- OAuth 应用、API 密钥、SMTP 配置和系统公告管理。
- 审计日志查询、中文事件描述、IPv6 地址展示与 CSV 导出。
- 登录背景设置、浅色与深色主题，以及窄屏布局。

## 本地启动

需要 Node.js 22 或更新版本，以及已启动的 Passport 后端。

```sh
git clone https://github.com/MartianJ666/AegisPassport-FrontEnd.git
cd AegisPassport-FrontEnd
npm ci
npm run dev -- --host 127.0.0.1
```

打开 <http://localhost:8420>。开发服务器默认把 API、OAuth 和上传请求代理到 `http://localhost:8421`。

首次管理员账号由后端初始化。自助注册默认开放，但需要先在“邮件配置”中启用 SMTP，才能发送注册验证码。

## 环境变量

将 `.env.example` 复制为 `.env.local` 后修改，保存后重启开发服务器。生产构建读取 `.env.production`。

| 变量 | 默认值 | 用途 |
| --- | --- | --- |
| `VITE_API_TARGET` | `http://localhost:8421` | 开发服务器的后端代理目标 |
| `VITE_AUTH_ORIGIN` | 当前页面 origin | 登录与账户管理的公开 origin |
| `VITE_CONSENT_ORIGIN` | 当前页面 origin | 授权同意与账号确认的公开 origin |

默认同源部署时，后两个变量留空即可。拆分授权域名时，需要同步后端的 `FRONTEND_URL`、`CONSENT_BASE_URL` 和 `CORS_ALLOWED_ORIGINS`。origin 只包含协议、域名和可选端口，不包含路径。

`VITE_*` 配置会进入浏览器代码，只用于公开地址等前端设置。JWT 签名密钥、数据库密码和 OIDC 客户端密钥应配置在后端。

## 测试与构建

```sh
npm test
npm run build
```

构建结果位于 `dist/`。回归测试覆盖授权续接、同意表单提交、二次密码验证失败处理、注册续接和开发代理规则。

## 部署

可以直接托管 `dist/`，也可以构建仓库提供的 Nginx 镜像：

```sh
docker build -t aegis-passport-frontend:local .
docker run -d --name passport-web \
  --network passport \
  -p 127.0.0.1:8080:80 \
  aegis-passport-frontend:local
```

该示例要求先按后端 README 准备 `passport` 容器网络，并将后端容器命名为 `server`。镜像中的 `nginx/default.conf` 默认代理到 `server:8421`；使用其他后端地址时，修改该文件后重新构建。

生产入口使用 HTTPS。外层反向代理需要传递 `Host` 和 `X-Forwarded-Proto`，使后端生成正确的公开地址。

自行配置静态托管时，需要保留以下路由区别：

| 路径 | 处理方式 |
| --- | --- |
| `/auth/*` 和账户管理页面 | 返回前端 `index.html` |
| `/oauth2/consent`、`/oauth2/account-confirm` | 返回前端 `index.html` |
| `/api/*`、其他 `/oauth2/*`、`/.well-known/*`、`/userinfo`、`/connect/*` | 代理到后端 |
| `/uploads/*`、`/oauth-continue.js` | 代理到后端 |

授权同意页和账号确认页不能被通用 `/oauth2/*` 代理覆盖，否则可能出现跳转循环。仓库中的 Nginx 配置和 Vite 开发代理已处理这两个页面。

## 目录

```text
src/views/          账户、管理与授权页面
src/components/     通用表单、弹窗和认证页面布局
src/stores/         登录状态与界面设置
src/api/            API 请求与密码传输处理
src/utils/          地址校验、审计展示等工具
tests/              前端回归测试
nginx/              容器反向代理配置
```

## 许可证

本仓库源码采用 GNU GPL v3.0 only，SPDX 标识为 `GPL-3.0-only`。完整条款见 [LICENSE](LICENSE)。第三方依赖保留各自的许可证，见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) 和锁文件。
