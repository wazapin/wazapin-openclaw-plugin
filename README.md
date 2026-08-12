# Wazapin OpenClaw Plugin

WhatsApp channel plugin for [OpenClaw](https://github.com/openclaw/openclaw) — send and receive WhatsApp messages through Wazapin.

## Install
```bash
openclaw plugin install @wazapin/openclaw-plugin
```

## Config
```env
WAZAPIN_API_KEY=wzp_xxx        # Required: API key from app.wazapin.com
WAZAPIN_ORG_SLUG=ujang         # Optional: organization slug (multi-org)
WAZAPIN_API_BASE=https://api.wazapin.id  # Optional: API base URL
WAZAPIN_WEBHOOK_SECRET=xxx     # Optional: webhook signature verification
```

## Features
- ✅ Send text, template, media messages
- ✅ Receive inbound messages via webhook
- ✅ Delivery + read receipts
- ✅ Conversation threading
- ✅ Multi-org support
- ✅ Webhook signature verification

## Architecture
```
WhatsApp → Wazapin API → Webhook → OpenClaw (inbound)
OpenClaw → Wazapin API → WhatsApp (outbound)
```

## Status

⚠️ **Port in progress.** The current `src/index.ts` targets an older
`ChannelPlugin` API (`canSendText`, `config.fields`, `handleInbound`,
`send(message, account)`) that does not exist in the published `openclaw`
package. It must be ported to the current contract —
`createChatChannelPlugin` / `createChannelPluginBase` from
`openclaw/plugin-sdk/channel-core` (config / setup / security.dm / outbound /
inbound). Build currently fails typecheck until the port lands.
