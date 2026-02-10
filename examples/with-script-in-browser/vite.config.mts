import path from "node:path";
import { defineConfig } from "vite";
import type { Plugin } from "vite";

// Vite 插件：处理 @excalidraw-modify 的子路径导入（如果需要额外处理）
// 注意：CSS 和子路径导入现在主要通过 alias 处理
function excalidrawSubpathAliasPlugin(): Plugin {
  return {
    name: "excalidraw-subpath-alias",
    enforce: "pre", // 确保在其他插件之前运行
    resolveId(id, importer) {
      // 所有处理都通过 alias 完成，这里不需要额外处理
      return null;
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: [
      // CSS 文件需要优先匹配，放在最前面
      {
        find: "@excalidraw-modify/excalidraw/index.css",
        replacement: path.resolve(__dirname, "../../packages/excalidraw/dist/dev/index.css"),
      },
      // 子路径导入（需要在基础包之前匹配）
      {
        find: /^@excalidraw-modify\/(common|math|element|excalidraw)\/(.+)$/,
        replacement: path.resolve(__dirname, "../../packages/$1/dist/dev/index.js"),
      },
      // 基础包导入
      {
        find: "@excalidraw-modify/excalidraw",
        replacement: path.resolve(__dirname, "../../packages/excalidraw"),
      },
      {
        find: "@excalidraw-modify/common",
        replacement: path.resolve(__dirname, "../../packages/common"),
      },
      {
        find: "@excalidraw-modify/element",
        replacement: path.resolve(__dirname, "../../packages/element"),
      },
      {
        find: "@excalidraw-modify/math",
        replacement: path.resolve(__dirname, "../../packages/math"),
      },
      {
        find: "react",
        replacement: path.resolve(__dirname, "../../node_modules/react"),
      },
      {
        find: "react-dom",
        replacement: path.resolve(__dirname, "../../node_modules/react-dom"),
      },
    ],
  },
  plugins: [excalidrawSubpathAliasPlugin()],
  server: {
    port: 3001,
    // open the browser
    open: true,
  },
  publicDir: "public",
  optimizeDeps: {
    exclude: ["@excalidraw-modify/common", "@excalidraw-modify/element", "@excalidraw-modify/math", "@excalidraw-modify/excalidraw"],
    esbuildOptions: {
      // Bumping to 2022 due to "Arbitrary module namespace identifier names" not being
      // supported in Vite's default browser target https://github.com/vitejs/vite/issues/13556
      target: "es2022",
      treeShaking: true,
    },
  },
});
