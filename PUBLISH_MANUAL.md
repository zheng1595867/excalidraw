# 手动发布到 npm - 使用 2FA

## 方法 1：使用 2FA 验证码发布

### 步骤 1：获取 2FA 验证码
从你的 2FA 应用（如 Google Authenticator）获取 6 位验证码

### 步骤 2：发布每个包（按顺序）

#### 发布 common 包
```powershell
cd packages/common
npm publish --tag latest --access public --registry https://registry.npmjs.org/ --otp=YOUR_2FA_CODE
cd ../..
```

#### 发布 math 包
```powershell
cd packages/math
npm publish --tag latest --access public --registry https://registry.npmjs.org/ --otp=YOUR_2FA_CODE
cd ../..
```

#### 发布 element 包
```powershell
cd packages/element
npm publish --tag latest --access public --registry https://registry.npmjs.org/ --otp=YOUR_2FA_CODE
cd ../..
```

#### 发布 excalidraw 包
```powershell
cd packages/excalidraw
npm publish --tag latest --access public --registry https://registry.npmjs.org/ --otp=YOUR_2FA_CODE
cd ../..
```

**注意**：每次发布都需要新的 2FA 验证码（通常 30 秒刷新一次）

## 方法 2：使用 Granular Access Token（推荐）

### 步骤 1：创建新的 Granular Access Token
1. 访问：https://www.npmjs.com/settings/zhengxinjie/access-tokens
2. 点击 "Generate New Token" → "Granular Access Token"
3. 设置：
   - **Token name**: `excalidraw-publish` (或任意名称)
   - **Expiration**: 根据需要选择（建议 90 天或更长）
   - **Type**: 选择 "Automation" 或 "Publish"
   - **Permissions**: 
     - ✅ 启用 "Publish" 权限
     - ✅ **重要**：启用 "Bypass 2FA" 选项
4. 点击 "Generate Token"
5. **复制 token**（只显示一次，请保存好）

### 步骤 2：设置新 token
```powershell
npm config set //registry.npmjs.org/:_authToken YOUR_NEW_TOKEN
```

### 步骤 3：验证 token
```powershell
npm whoami
```

### 步骤 4：发布包（不需要 2FA 验证码）
```powershell
# 发布 common
cd packages/common
npm publish --tag latest --access public --registry https://registry.npmjs.org/
cd ../..

# 发布 math
cd packages/math
npm publish --tag latest --access public --registry https://registry.npmjs.org/
cd ../..

# 发布 element
cd packages/element
npm publish --tag latest --access public --registry https://registry.npmjs.org/
cd ../..

# 发布 excalidraw
cd packages/excalidraw
npm publish --tag latest --access public --registry https://registry.npmjs.org/
cd ../..
```

## 方法 3：使用环境变量设置 OTP（适合脚本）

```powershell
# 设置 2FA 验证码
$env:NPM_CONFIG_OTP="123456"

# 发布包
cd packages/common
npm publish --tag latest --access public --registry https://registry.npmjs.org/
cd ../..
```

## 验证发布

发布后验证：
```powershell
npm view @excalidraw-modify/common
npm view @excalidraw-modify/math
npm view @excalidraw-modify/element
npm view @excalidraw-modify/excalidraw
```

