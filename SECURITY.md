# 安全说明（上传 GitHub / 部署）

## 不要提交的敏感信息

- **Schwab API**（在 `server/.env` 中，仅本地或部署环境使用）：
  - `SCHWAB_APP_KEY`（App Key / Client ID）
  - `SCHWAB_APP_SECRET`（App Secret / Client Secret）
  - `SCHWAB_ACCESS_TOKEN`、`SCHWAB_REFRESH_TOKEN`
  - 以上**绝不能**提交到 GitHub 或写进代码。
- **OpenAI / Google API Key**：同样不要写进代码或提交到仓库。
- **做法**：所有密钥、Token 只放在 **环境变量** 或 **`server/.env`** 中；`.env` 已在 `.gitignore` 中，不会被 git 跟踪。

## 已做的防护

- 根目录 `.gitignore` 已忽略：`.env`、`server/.env`、`.env.local`、`.env.*.local`。
- 代码中**没有**硬编码任何密钥，仅通过 `process.env.SCHWAB_*` 等读取。
- 仓库中提供 `server/.env.example`（仅变量名与占位符），用于说明需要配置哪些项，**不包含真实密钥**。
- 部署时（Railway、Render 等）在平台里配置环境变量，不要上传 `.env` 文件。

## 上传前自检：确认 .env 未被跟踪

在项目根目录执行：

```bash
git check-ignore -v server/.env
```

应看到一行输出，说明 `server/.env` 被某条 `.gitignore` 规则忽略。再执行：

```bash
git status
```

确认 **Untracked files** 或 **Changes** 里**没有** `server/.env`。若出现，说明 `.env` 曾被加入过版本库，需从历史中删除并轮换密钥。

## 若曾误提交过 .env

1. **立即**在 [Schwab Developer Portal](https://developer.schwab.com/) 撤销/重新生成该应用的密钥，并重新走 OAuth 获取新的 Refresh Token。
2. 从 Git 历史中彻底删除该文件（例如用 `git filter-repo` 或 [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)），再 `git push --force`。
3. 之后确保 `server/.env` 始终在 `.gitignore` 中，且永不 `git add server/.env`。
