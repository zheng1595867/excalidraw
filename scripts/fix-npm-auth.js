#!/usr/bin/env node

/**
 * 修复 npm 认证问题的辅助脚本
 * 清除过期的 token 并指导用户重新登录
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");

const userNpmrcPath = path.join(os.homedir(), ".npmrc");

console.info("🔧 Fixing npm authentication...\n");

// 检查用户目录的 .npmrc 文件
if (fs.existsSync(userNpmrcPath)) {
  console.info(`Found .npmrc at: ${userNpmrcPath}\n`);
  
  let content = fs.readFileSync(userNpmrcPath, "utf-8");
  const lines = content.split("\n");
  const originalLineCount = lines.length;
  
  // 移除所有 _authToken 行
  const filteredLines = lines.filter((line) => {
    return !line.includes("_authToken") && line.trim() !== "";
  });
  
  if (filteredLines.length < originalLineCount) {
    // 备份原文件
    const backupPath = `${userNpmrcPath}.backup.${Date.now()}`;
    fs.writeFileSync(backupPath, content, "utf-8");
    console.info(`✓ Backed up original .npmrc to: ${backupPath}`);
    
    // 写入清理后的内容
    fs.writeFileSync(userNpmrcPath, filteredLines.join("\n") + "\n", "utf-8");
    console.info("✓ Removed expired auth tokens from .npmrc\n");
  } else {
    console.info("✓ No auth tokens found in .npmrc\n");
  }
} else {
  console.info("✓ No .npmrc file found (this is OK)\n");
}

// 尝试清除 npm 缓存
console.info("Clearing npm cache...");
try {
  execSync("npm cache clean --force", { stdio: "inherit" });
  console.info("✓ npm cache cleared\n");
} catch (error) {
  console.warn("⚠ Could not clear npm cache (this is OK)\n");
}

console.info("📝 Next steps:\n");
console.info("1. Run: npm login");
console.info("2. Verify: npm whoami");
console.info("3. Then retry your release command\n");

