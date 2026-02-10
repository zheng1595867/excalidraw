# 发布指南 - @excalidraw-modify 包

本指南说明如何将核心包发布到 npm 的 `@excalidraw-modify` scope。

## 发布前的准备工作

### 1. 确保包名已切换到 @excalidraw-modify

```bash
# 如果还没有切换，运行：
yarn switch:modify
```

### 2. 登录 npm

```bash
# 登录到 npm（需要 @excalidraw-modify scope 的权限）
npm login

# 或者使用 npm token
npm config set //registry.npmjs.org/:_authToken YOUR_TOKEN
```

### 3. 确保所有包都已构建

```bash
# 构建所有包
yarn build:packages
```

## 发布命令

### 测试发布（推荐先测试）

```bash
# 使用 test tag 发布（默认）
yarn release

# 或者明确指定 test tag
yarn release --tag=test
```

这会发布带有 commit hash 后缀的版本，例如：`0.18.0-8b71db27`

### 预发布版本（next tag）

```bash
yarn release --tag=next
```

### 正式发布（latest tag）

```bash
# 必须指定版本号
yarn release --tag=latest --version=0.18.0
```

### 非交互式发布（用于 CI/CD）

```bash
yarn release --tag=test --non-interactive
yarn release --tag=next --non-interactive
yarn release --tag=latest --version=0.18.0 --non-interactive
```

## 发布流程

发布脚本会自动执行以下步骤：

1. **构建所有包**：按顺序构建 `common` -> `math` -> `element` -> `excalidraw`
2. **更新版本号**：更新所有包的 `package.json` 中的版本号
3. **更新依赖**：更新包之间的相互依赖版本
4. **询问是否提交**：如果是 `latest` tag，会询问是否提交 git
5. **询问是否发布**：询问是否发布到 npm
6. **发布到 npm**：按顺序发布所有包

## 发布的包

以下包会被发布：

- `@excalidraw-modify/common`
- `@excalidraw-modify/math`
- `@excalidraw-modify/element`
- `@excalidraw-modify/excalidraw`

## 注意事项

1. **版本号格式**：
   - `test` 和 `next` tag：自动添加 commit hash 后缀（如 `0.18.0-8b71db27`）
   - `latest` tag：必须手动指定版本号（如 `0.18.0`）

2. **发布顺序**：脚本会按依赖顺序发布（common -> math -> element -> excalidraw）

3. **npm scope 权限**：确保你的 npm 账号有 `@excalidraw-modify` scope 的发布权限

4. **发布后**：发布完成后，建议切换回开发模式：
   ```bash
   yarn switch:excalidraw
   ```

## 验证发布

发布后，可以通过以下方式验证：

```bash
# 查看已发布的包
npm view @excalidraw-modify/excalidraw

# 查看所有版本
npm view @excalidraw-modify/excalidraw versions

# 安装测试
npm install @excalidraw-modify/excalidraw@latest
```

## 故障排除

### 403 Forbidden - Two-Factor Authentication Required
**这是最常见的问题！** npm 现在要求发布包时必须启用双因素认证（2FA）。

**解决方案 1：使用 2FA 验证码（推荐用于本地开发）**

如果你已经启用了 2FA，发布脚本会自动提示你输入 2FA 验证码。

**方法 A：交互式输入（推荐）**
- 运行发布命令时，脚本会提示你输入 2FA 验证码
- 从你的 2FA 应用（如 Google Authenticator）获取 6 位验证码并输入

**方法 B：通过环境变量**
```bash
# Windows PowerShell
$env:NPM_CONFIG_OTP="123456"
yarn release --tag=latest --version=0.18.1

# Linux/Mac
export NPM_CONFIG_OTP="123456"
yarn release --tag=latest --version=0.18.1
```

**方法 C：通过 npm config（临时）**
```bash
npm config set otp 123456
yarn release --tag=latest --version=0.18.1
npm config delete otp  # 发布后删除
```

**解决方案 2：使用 Granular Access Token（推荐用于 CI/CD）**
1. 访问：https://www.npmjs.com/settings/YOUR_USERNAME/access-tokens
2. 创建新的 "Granular Access Token"
3. 启用 "Bypass 2FA" 权限
4. 设置 token：`npm config set //registry.npmjs.org/:_authToken YOUR_TOKEN`
5. 或在 CI/CD 中设置环境变量：`NPM_TOKEN=YOUR_TOKEN`

更多信息：https://docs.npmjs.com/about-two-factor-authentication

### 401 Unauthorized
- 检查是否已登录 npm：`npm whoami`
- 检查是否有 `@excalidraw-modify` scope 的权限
- 如果 token 过期，运行：`npm login`

### 包已存在
- 如果版本已存在，需要更新版本号
- 对于 `test` 和 `next` tag，可以修改 commit hash 来生成新版本

### 构建失败
- 确保所有依赖都已安装：`yarn install`
- 检查 TypeScript 错误：`yarn test:typecheck`


