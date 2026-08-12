/**
 * Wazapin WhatsApp channel plugin for OpenClaw.
 *
 * Follows the official "Building channel plugins" walkthrough:
 * createChatChannelPlugin + createChannelPluginBase with config / setup /
 * security.dm / outbound.attachedResults / threading.
 */
import {
  createChannelPluginBase,
  createChatChannelPlugin,
} from "openclaw/plugin-sdk/channel-core";
import type { OpenClawConfig } from "openclaw/plugin-sdk/channel-core";
import { wazapinSendMedia, wazapinSendText } from "./client.js";

export const CHANNEL_KEY = "wazapin";

export type ResolvedAccount = {
  accountId: string | null;
  apiKey: string;
  orgSlug?: string;
  apiBase: string;
  channelId?: string;
  webhookSecret?: string;
  allowFrom: string[];
  dmPolicy: string | undefined;
};

function section(cfg: OpenClawConfig): Record<string, any> | undefined {
  return (cfg.channels as Record<string, any> | undefined)?.[CHANNEL_KEY];
}

function apiKeyOf(cfg: OpenClawConfig): string {
  const s = section(cfg);
  return (s?.apiKey ?? s?.token ?? "") as string;
}

export function resolveAccount(
  cfg: OpenClawConfig,
  accountId?: string | null,
): ResolvedAccount {
  const s = section(cfg);
  const key = apiKeyOf(cfg);
  if (!key) throw new Error("wazapin: apiKey is required (channels.wazapin.apiKey)");
  return {
    accountId: accountId ?? null,
    apiKey: key,
    orgSlug: s?.orgSlug,
    apiBase: s?.apiBase ?? "https://api.wazapin.id",
    channelId: s?.channelId,
    webhookSecret: s?.webhookSecret,
    allowFrom: (s?.allowFrom ?? []) as string[],
    dmPolicy: s?.dmSecurity,
  };
}

// createChannelPluginBase returns `capabilities` as optional, but
// createChatChannelPlugin requires it — a type mismatch in openclaw
// 2026.7.1-2's own types. Build the base separately and cast it to the
// chat builder's expected base shape.
type ChatPluginBase<T extends { accountId?: string | null }> = Parameters<
  typeof createChatChannelPlugin<T>
>[0]["base"];

export const wazapinChannelPlugin = createChatChannelPlugin<ResolvedAccount>({
  base: createChannelPluginBase({
    id: CHANNEL_KEY,
    capabilities: {
      chatTypes: ["direct", "thread"],
    },
    config: {
      listAccountIds: () => ["default"],
      resolveAccount,
      inspectAccount(cfg, accountId) {
        const key = apiKeyOf(cfg);
        return {
          enabled: Boolean(key),
          configured: Boolean(key),
          tokenStatus: key ? "available" : "missing",
        };
      },
    },
    setup: {
      applyAccountConfig: ({ cfg, input }) => ({
        ...cfg,
        channels: {
          ...(cfg.channels as Record<string, any>),
          [CHANNEL_KEY]: {
            ...(cfg.channels as Record<string, any>)?.[CHANNEL_KEY],
            ...input,
          },
        },
      }),
    },
  }) as unknown as ChatPluginBase<ResolvedAccount>,

  security: {
    dm: {
      channelKey: CHANNEL_KEY,
      resolvePolicy: (account) => account.dmPolicy,
      resolveAllowFrom: (account) => account.allowFrom,
      defaultPolicy: "allowlist",
    },
  },

  threading: { topLevelReplyToMode: "reply" },

  outbound: {
    base: { deliveryMode: "direct" },
    attachedResults: {
      channel: CHANNEL_KEY,
      sendText: async (ctx) => {
        const account = resolveAccount(ctx.cfg, ctx.accountId);
        const result = await wazapinSendText({
          apiKey: account.apiKey,
          to: ctx.to,
          text: ctx.text,
          orgSlug: account.orgSlug,
          apiBase: account.apiBase,
          channelId: account.channelId,
        });
        return { messageId: result.id ?? "unknown" };
      },
      sendMedia: async (ctx) => {
        if (!ctx.mediaUrl) return { messageId: "skipped" };
        const account = resolveAccount(ctx.cfg, ctx.accountId);
        const result = await wazapinSendMedia({
          apiKey: account.apiKey,
          to: ctx.to,
          mediaUrl: ctx.mediaUrl,
          orgSlug: account.orgSlug,
          apiBase: account.apiBase,
          channelId: account.channelId,
        });
        return { messageId: result.id ?? "unknown" };
      },
    },
  },
});
