# 切换包名说明

## 项目说明

这个代码库是 **Excalidraw 的源码**，使用 `@excalidraw-modify` 作为包名。

当你需要发布**二次开发版本**时，需要将包名切换为 `@excalidraw-modify`。

## 使用场景

### 日常开发
- **保持使用 `@excalidraw-modify`**：源码开发时使用原始包名
- 这是默认状态，与上游仓库保持一致

### 发布二开版本
- **切换到 `@excalidraw-modify`**：发布前切换包名
- 发布完成后可以切换回 `@excalidraw-modify` 继续开发

## 快速使用

### 切换到 @excalidraw-modify（日常开发，默认状态）
```bash
yarn switch:excalidraw
```

### 切换到 @excalidraw-modify（发布前）
```bash
yarn switch:modify
```

## 工作流程

### 日常开发流程（使用 @excalidraw-modify）

1. **保持源码状态**：代码库默认使用 `@excalidraw-modify`，与上游仓库保持一致
2. **正常开发**：进行功能开发、bug 修复等
3. **提交代码**：提交到你的 fork 仓库

### 发布流程（切换到 @excalidraw-modify）

1. **切换到发布包名**：
   ```bash
   yarn switch:modify
   ```

2. **构建所有包**：
   ```bash
   yarn build:packages
   ```

3. **发布到 npm**（使用现有的 release 脚本）：
   ```bash
   yarn release --tag=latest --version=0.19.0
   # 或
   yarn release --tag=next
   # 或
   yarn release --tag=test
   ```

4. **切换回源码状态**（发布完成后）：
   ```bash
   yarn switch:excalidraw
   ```

## 详细说明

### 脚本功能

`scripts/switch-package-name.js` 脚本会自动替换项目中所有文件里的包名引用，包括：

- ✅ TypeScript/JavaScript 源文件 (`.ts`, `.tsx`, `.js`, `.jsx`)
- ✅ JSON 配置文件 (`.json`)
- ✅ Markdown 文档 (`.md`, `.mdx`)
- ✅ 测试快照文件 (`.snap`)
- ✅ 构建脚本和配置文件

### 替换范围

脚本会替换以下内容：
- `@excalidraw-modify/common` ↔ `@excalidraw-modify/common`
- `@excalidraw-modify/element` ↔ `@excalidraw-modify/element`
- `@excalidraw-modify/excalidraw` ↔ `@excalidraw-modify/excalidraw`
- `@excalidraw-modify/math` ↔ `@excalidraw-modify/math`
- `@excalidraw/utils` ↔ `@excalidraw/utils`

### 注意事项

1. **切换前建议提交代码**：切换会修改大量文件，建议先提交当前更改
2. **切换后需要重新构建**：切换包名后，需要重新构建所有包
3. **发布后切换回来**：发布完成后记得切换回 `@excalidraw-modify`，保持与上游一致
4. **排除目录**：脚本会自动排除 `node_modules`、`dist`、`types`、`.git` 等目录

### 发布脚本说明

现有的 `yarn release` 脚本已经配置为发布 `@excalidraw-modify` 包（见 `scripts/release.js` 中的 `PACKAGE_SCOPE`）。

**重要**：使用 `yarn release` 前，请确保已经切换到 `@excalidraw-modify`：
```bash
yarn switch:modify
yarn release --tag=latest --version=0.19.0
```

