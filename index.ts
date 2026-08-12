/**
 * Wazapin channel plugin entry point.
 *
 * Inbound webhook handling: the Wazapin developer webhook (event_type =
 * message.new) is received by the plugin's webhook receiver. Session dispatch
 * into OpenClaw follows the channel-inbound lifecycle (see docs
 * /plugins/sdk-channel-inbound). The receiver + parser live in src/webhook.ts;
 * wire them to your gateway's HTTP surface at runtime.
 */
import { defineChannelPluginEntry } from "openclaw/plugin-sdk/channel-core";
import { CHANNEL_KEY, wazapinChannelPlugin } from "./src/channel.js";

export { CHANNEL_KEY, resolveAccount, wazapinChannelPlugin } from "./src/channel.js";
export type { ResolvedAccount } from "./src/channel.js";
export { parseInboundEvent, verifySignature } from "./src/webhook.js";

export default defineChannelPluginEntry({
  id: CHANNEL_KEY,
  name: "Wazapin",
  description: "Wazapin WhatsApp channel plugin",
  plugin: wazapinChannelPlugin,
});
