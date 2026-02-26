#!/usr/bin/env python3
"""
用 OAuth 授权码流程获取 Schwab Access Token。
需要：1）在开发者门户把「回调网址」设为本脚本使用的 redirect_uri；
      2）本机已安装 requests：pip install requests

用法一（最简单，不用 ngrok）：
  1. 在 Schwab 应用里添加回调网址：https://developer.schwab.com/oauth2-redirect.html
  2. 运行：python scripts/get_schwab_token.py --manual
  3. 在浏览器里登录授权，跳转后从地址栏复制 code= 后面的整段，粘贴到终端
  4. 脚本用该 code 换 token 并写入 .env

用法二（本地回调）：python scripts/get_schwab_token.py
用法三（ngrok）：python scripts/get_schwab_token.py --redirect-uri https://xxx.ngrok-free.app/callback
"""
import argparse
import http.server
import os
import socketserver
import sys
import urllib.parse
import webbrowser
from pathlib import Path

try:
    import requests
except ImportError:
    print("请先安装 requests: pip install requests")
    sys.exit(1)

# 本地回调：必须在 Schwab 应用里添加此 URL 作为「回调网址」（若只允许 HTTPS，请用 ngrok 等）
REDIRECT_URI = os.environ.get("SCHWAB_REDIRECT_URI", "http://127.0.0.1:8765/callback")
PORT = 8765
AUTH_URL = "https://api.schwabapi.com/v1/oauth/authorize"
TOKEN_URL = "https://api.schwabapi.com/v1/oauth/token"
SCOPE = "readonly"

code_received = None


def load_env(env_path: Path) -> dict:
    out = {}
    if not env_path.exists():
        return out
    with open(env_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                k, v = line.split("=", 1)
                v = v.strip().strip('"').strip("'").strip("\ufeff")
                out[k.strip()] = v
    return out


class CallbackHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        global code_received
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/callback" or parsed.path == "/":
            qs = urllib.parse.parse_qs(parsed.query)
            code_received = (qs.get("code") or [None])[0]
            if code_received:
                self.send_response(200)
                self.send_header("Content-type", "text/html; charset=utf-8")
                self.end_headers()
                self.wfile.write(
                    b"<html><body><p>Token received. You can close this tab and check the terminal.</p></body></html>"
                )
            else:
                err = (qs.get("error") or [""])[0]
                self.send_response(400)
                self.end_headers()
                self.wfile.write(f"Error: {err}".encode())
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        pass


def main():
    parser = argparse.ArgumentParser(description="Get Schwab OAuth token via local callback")
    parser.add_argument("--env", default=".env", help="Path to .env file (default: .env)")
    parser.add_argument("--redirect-uri", default=REDIRECT_URI, help="Redirect URI (must be registered in Schwab app)")
    parser.add_argument("--code", help="Manual: paste the authorization code from browser URL (use with --manual)")
    parser.add_argument("--manual", action="store_true", help="Use developer portal callback, then paste code (no ngrok)")
    args = parser.parse_args()

    server_dir = Path(__file__).resolve().parent.parent
    env_path = (server_dir / args.env) if not Path(args.env).is_absolute() else Path(args.env)
    env = load_env(env_path)

    client_id = env.get("SCHWAB_APP_KEY") or os.environ.get("SCHWAB_APP_KEY")
    client_secret = env.get("SCHWAB_APP_SECRET") or os.environ.get("SCHWAB_APP_SECRET")
    if not client_id or not client_secret:
        print("请在 server/.env 中设置 SCHWAB_APP_KEY 和 SCHWAB_APP_SECRET")
        sys.exit(1)
    print(f"[自检] App Key 长度: {len(client_id)}, Secret 长度: {len(client_secret)}（若为 0 或异常请检查 .env）")

    if args.manual:
        redirect_uri = "https://developer.schwab.com/oauth2-redirect.html"
    else:
        redirect_uri = args.redirect_uri

    auth_link = (
        f"{AUTH_URL}?response_type=code&client_id={urllib.parse.quote(client_id)}"
        f"&redirect_uri={urllib.parse.quote(redirect_uri)}&scope={SCOPE}"
    )

    code_decoded = None
    if args.code:
        code_decoded = urllib.parse.unquote(args.code.strip())
    elif args.manual:
        print("【不用 ngrok，手动复制 code】")
        print()
        print("1. 请在 Schwab 应用里添加回调网址：")
        print("   https://developer.schwab.com/oauth2-redirect.html")
        print()
        print("2. 即将打开浏览器，请用 Schwab 账号登录并授权。")
        print("   授权后会跳转，地址栏里会有 code=xxxxx，请复制 code= 后面的整段。")
        print()
        input("按回车打开浏览器…")
        webbrowser.open(auth_link)
        print()
        code_decoded = input("请粘贴刚才复制的 code（或整段 URL 中 code= 后面的内容）：").strip()
        if "code=" in code_decoded:
            code_decoded = code_decoded.split("code=", 1)[1]
        code_decoded = code_decoded.split("&")[0].strip()
        code_decoded = urllib.parse.unquote(code_decoded)
    else:
        print("1. 请在 Schwab 应用设置里添加以下「回调网址」：")
        print(f"   {redirect_uri}")
        print()
        print("2. 即将打开浏览器，请用 Schwab 账号登录并授权…")
        webbrowser.open(auth_link)
        with socketserver.TCPServer(("", PORT), CallbackHandler) as httpd:
            httpd.handle_request()
        if code_received:
            code_decoded = urllib.parse.unquote(code_received)

    if not code_decoded:
        print("未收到授权码，请重试。")
        sys.exit(1)

    client_id = client_id.strip()
    client_secret = client_secret.strip()
    resp = requests.post(
        TOKEN_URL,
        auth=(client_id, client_secret),
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        data={
            "grant_type": "authorization_code",
            "code": code_decoded,
            "redirect_uri": redirect_uri,
        },
        timeout=15,
    )
    if not resp.ok:
        print(f"换 token 失败: {resp.status_code} {resp.text}")
        if resp.status_code == 401 and "invalid_client" in resp.text:
            print()
            print("提示：401 invalid_client 多为 App Key / App Secret 不被接受。请检查：")
            print("  1. 打开 https://developer.schwab.com → 你的应用，确认 Consumer Key / Consumer Secret 与 .env 里完全一致（可重新复制粘贴）")
            print("  2. 若曾在门户里「重新生成」过 Secret，必须用最新的 Secret 更新 .env，旧 Secret 会失效")
            print("  3. 替代办法：在开发者门户的 API 文档页点「Authorize」，用 App Key + Secret 登录授权，从返回结果里复制 access_token 填到 .env 的 SCHWAB_ACCESS_TOKEN")
        sys.exit(1)

    data = resp.json()
    access = data.get("access_token")
    refresh = data.get("refresh_token")
    if not access:
        print("响应中无 access_token:", data)
        sys.exit(1)

    print()
    print("成功获取 Token。正在写入 .env …")
    wrote_access = wrote_refresh = False
    lines = []
    if env_path.exists():
        with open(env_path, encoding="utf-8") as f:
            for line in f:
                s = line.strip()
                if s.startswith("SCHWAB_ACCESS_TOKEN=") or s.startswith("# SCHWAB_ACCESS_TOKEN="):
                    lines.append(f"SCHWAB_ACCESS_TOKEN={access}\n")
                    wrote_access = True
                    continue
                if s.startswith("SCHWAB_REFRESH_TOKEN=") or s.startswith("# SCHWAB_REFRESH_TOKEN="):
                    lines.append(f"SCHWAB_REFRESH_TOKEN={refresh or ''}\n")
                    wrote_refresh = True
                    continue
                lines.append(line)
    if not wrote_access:
        lines.append(f"SCHWAB_ACCESS_TOKEN={access}\n")
    if refresh and not wrote_refresh:
        lines.append(f"SCHWAB_REFRESH_TOKEN={refresh}\n")

    with open(env_path, "w", encoding="utf-8") as f:
        f.writelines(lines)
    print(f"已写入 {env_path}")
    print("重启应用后即可使用 Schwab 数据。")

if __name__ == "__main__":
    main()
