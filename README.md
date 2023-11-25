# discord2telegram-cloudworker

> Cloudworker(Cloudflare) bot that forwards messages from the Discord channel to the Telegram channel

## Run locally
1. Install node_modules
```bash
npm i
```
2. Configure `.dev.vars`
```bash
DISCORD_API_TOKEN = ''
DISCORD_CHAT_ID = ''
DISCORD_GUILD_ID = ''
TELEGRAM_TOKEN = ''
TELEGRAM_CHAT_ID = ''
```
3. Run worker
```bash
npx wrangler dev --test-scheduled
```
4. To execute the worker call this command in new terminal winodow
```bash
curl "http://localhost:8787/__scheduled?cron=0+*+*+*+*"
```

## Deploy to cloud flare
1. You have to set all secrets see `.dev.vars.example`
2. Set KV store and called it `CACHE`
3. Edit `wrangler.toml` with KV id
4. Deploy by command
```bash
npm run deploy
```
