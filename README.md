# Wazapin OpenClaw Plugin

Wazapin WhatsApp channel plugin for [OpenClaw](https://github.com/openclaw/openclaw) — send and receive WhatsApp messages through the Wazapin API.

## Status

✅ **Ported to the current OpenClaw `ChannelPlugin` contract** (`createChatChannelPlugin` / `createChannelPluginBase` from `openclaw/plugin-sdk/channel-core`) and typecheck-verified against `openclaw@2026.7.1-2`.

## What it implements

- **Config** — `channels.wazapin` account resolution (`apiKey`, `orgSlug`, `apiBase`, `channelId`, `webhookSecret`, `allowFrom`, `dmSecurity`)
- **Setup** — `applyAccountConfig` writes channel config
- **Security** — `security.dm` allowlist (from `allowFrom`) + DM policy
- **Outbound** — `sendText` / `sendMedia` via the Wazapin API (`POST /v1/messages`)
- **Threading** — `topLevelReplyToMode: "reply"`
- **Inbound** — webhook receiver + parser (`message.new` → inbound message; `message.sent` / `contact.updated` / `conversation.updated` ignored), HMAC-SHA256 signature verification (`X-Webhook-Signature`)

## Config

```yaml
# config.yaml
channels:
  wazapin:
    enabled: true
    apiKey: "wzp_xxx"            # or token:
    orgSlug: "acme"              # optional
    apiBase: "https://api.wazapin.id"
    channelId: "wzp_ch_xxx"      # optional default channel
    webhookSecret: "..."         # optional
    allowFrom: ["+628123456789"] # DM allowlist
    dmSecurity: "allowlist"
```

## Files

```
├── index.ts              # defineChannelPluginEntry
├── openclaw.plugin.json  # manifest + channel config schema
└── src/
    ├── channel.ts        # createChatChannelPlugin (config/setup/security/outbound)
    ├── client.ts         # Wazapin API client (sendText/sendMedia)
    └── webhook.ts        # inbound: signature verify + message.new parser
```

## Webhooks

Point the Wazapin dashboard webhook at your gateway's HTTP surface and route
`event_type=message.new` payloads into `parseInboundEvent` (see `src/webhook.ts`).
Session dispatch follows the OpenClaw channel-inbound lifecycle.

## Dev

```bash
npm install
npm run typecheck   # tsc --noEmit against openclaw@2026.7.1-2
npm run build
```
