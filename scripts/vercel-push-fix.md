# 修复 Vercel 构建后推送

在 **项目根目录**（`cursor_AI_STOCK`，即 `client` 的上一级）打开终端，执行：

```powershell
cd C:\Users\Franc\OneDrive\Desktop\cursor_AI_STOCK

git add client/src/vite-env.d.ts client/src/components/IvSmileComparison.tsx client/tsconfig.json client/src/api.ts
git status
git commit -m "fix: Vercel build - Vite env types, Tooltip formatter, tsconfig types"
git push origin main
```

说明：路径 `client/src/...` 是相对于**仓库根目录**的，必须在根目录下执行 `git add`。
