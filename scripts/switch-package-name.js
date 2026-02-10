#!/usr/bin/env node

/**
 * 脚本用于在 @excalidraw-modify 和 @excalidraw 之间切换包名
 * 
 * 项目说明:
 *   - 这是 Excalidraw 的源码仓库，默认使用 @excalidraw（与上游保持一致）
 *   - 发布二次开发版本时，需要切换到 @excalidraw-modify
 * 
 * 使用方法:
 *   yarn switch:excalidraw  # 切换到 @excalidraw（日常开发，默认状态）
 *   yarn switch:modify      # 切换到 @excalidraw-modify（发布前）
 * 
 * 或者直接使用:
 *   node scripts/switch-package-name.js excalidraw        # 切换到 @excalidraw
 *   node scripts/switch-package-name.js excalidraw-modify # 切换到 @excalidraw
 * 
 * 发布流程:
 *   1. yarn switch:modify        # 切换到发布包名
 *   2. yarn build:packages        # 构建所有包
 *   3. yarn release --tag=latest  # 发布到 npm
 *   4. yarn switch:excalidraw     # 切换回源码状态
 * 
 * 注意: 此脚本会替换所有文件中的包名引用，包括:
 *   - TypeScript/JavaScript 源文件 (.ts, .tsx, .js, .jsx)
 *   - JSON 配置文件 (.json)
 *   - Markdown 文档 (.md, .mdx)
 *   - 测试快照文件 (.snap)
 *   - HTML 文件 (.html)
 *   - YAML 配置文件 (.yml, .yaml)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const targetName = process.argv[2];

if (!targetName || !['excalidraw', 'excalidraw-modify'].includes(targetName)) {
  console.error('错误: 请指定目标包名 (excalidraw 或 excalidraw-modify)');
  console.error('使用方法: node scripts/switch-package-name.js <excalidraw|excalidraw-modify>');
  process.exit(1);
}

const targetPrefix = `@${targetName}`;
const otherPrefix = targetName === 'excalidraw' ? '@excalidraw' : '@excalidraw';

console.log(`正在切换到: ${targetPrefix}`);
console.log(`替换: ${otherPrefix} -> ${targetPrefix}`);

// 需要替换的文件类型
const fileExtensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.mdx', '.snap', '.html', '.yml', '.yaml'];
const excludeDirs = ['node_modules', 'dist', 'types', '.git', 'build'];

// 递归查找所有需要替换的文件
function findFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!excludeDirs.includes(file)) {
        findFiles(filePath, fileList);
      }
    } else {
      const ext = path.extname(file);
      if (fileExtensions.includes(ext)) {
        fileList.push(filePath);
      }
    }
  });
  
  return fileList;
}

// 替换文件内容
function replaceInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // 替换所有出现的包名
    content = content.replace(new RegExp(otherPrefix.replace('@', '\\@'), 'g'), targetPrefix);
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }
    return false;
  } catch (error) {
    console.error(`处理文件 ${filePath} 时出错:`, error.message);
    return false;
  }
}

// 主要逻辑
const rootDir = path.resolve(__dirname, '..');
const files = findFiles(rootDir);
let changedCount = 0;

console.log(`找到 ${files.length} 个文件需要检查...`);

files.forEach(file => {
  if (replaceInFile(file)) {
    changedCount++;
    console.log(`已更新: ${path.relative(rootDir, file)}`);
  }
});

console.log(`\n完成! 共更新了 ${changedCount} 个文件`);
console.log(`当前包名前缀: ${targetPrefix}`);

