/**
 * Wazapin OpenClaw Channel Plugin
 * 
 * Registers Wazapin as a WhatsApp channel in OpenClaw.
 * Handles inbound (webhook → OpenClaw) and outbound (OpenClaw → Wazapin API).
 * Multi-org support: one plugin instance per organization.
 */

import type { ChannelPlugin } from "openclaw/plugin-sdk/channel-runtime";
import { defineChannelPluginEntry } from "openclaw/plugin-sdk/channel-core";

export const CHANNEL_ID = "wazapin";
export const CHANNEL_LABEL = "Wazapin";

export interface WazapinAccount {
  apiKey: string;
  orgSlug?: string;
  apiBase: string;
  webhookSecret?: string;
}

/**
 * Normalize phone number to E.164 format.
 * "08123456789" → "+628123456789"
 * "628123456789" → "+628123456789"
 */
export function normalizePhone(input: string): string {
  let phone = input.replace(/\s|-|\.|\(|\)/g, "");
  if (phone.startsWith("0")) phone = "62" + phone.slice(1);
  if (!phone.startsWith("+")) phone = "+" + phone;
  return phone;
}

/**
 * Check if a string looks like a WhatsApp target (phone number).
 */
export function isWhatsAppTarget(input: string): boolean {
  return /^\+?\d{8,15}$/.test(input.replace(/\s|-/g, ""));
}

/**
 * Convert inbound Wazapin webhook event to OpenClaw message.
 */
export function wazapinInboundAdapter(event: any) {
  const { event: eventType, data } = event;
  if (eventType !== "message.received") return null;
  
  return {
    type: "message",
    channel: CHANNEL_ID,
    threadId: data.conversation_id,
    author: {
      id: data.from_phone ?? data.from,
      name: data.contact_name ?? data.from,
    },
    content: {
      kind: data.type ?? "text",
      text: data.content?.text ?? data.text ?? "",
      attachments: data.content?.attachments ?? [],
    },
    timestamp: data.created_at ?? new Date().toISOString(),
    raw: event,
  };
}

/**
 * Convert OpenClaw outbound message to Wazapin API payload.
 */
export function wazapinOutboundAdapter(message: any, account: WazapinAccount) {
  const payload: Record<string, unknown> = {
    channel_id: message.channel_id,
    to: normalizePhone(message.to),
  };

  if (message.type === "template") {
    payload.type = "template";
    payload.content = {
      name: message.template_name,
      language: { code: message.language ?? "en_US" },
    };
  } else {
    payload.type = "text";
    payload.content = { text: message.text };
  }

  // Add org header if multi-org
  const headers: Record<string, string> = {
    "X-Api-Key": account.apiKey,
    "Authorization": `Bearer ${account.apiKey}`,
    "Content-Type": "application/json",
  };
  if (account.orgSlug) {
    headers["X-Organization-Slug"] = account.orgSlug;
  }

  return { payload, headers };
}

/**
 * Channel plugin definition for OpenClaw.
 */
export const wazapinChannelPlugin: ChannelPlugin<WazapinAccount> = {
  id: CHANNEL_ID,
  meta: {
    id: CHANNEL_ID,
    label: CHANNEL_LABEL,
    selectionLabel: "WhatsApp via Wazapin",
    docsPath: "https://docs.wazapin.id",
    docsLabel: "Wazapin docs",
    blurb: "Send and receive WhatsApp messages through Wazapin.",
    aliases: ["wazapin", "whatsapp", "wa"],
    markdownCapable: true,
    showConfigured: true,
    showInSetup: true,
    quickstartAllowFrom: true,
  },
  capabilities: {
    canSendText: true,
    canSendTemplate: true,
    canSendMedia: true,
    canReceiveDelivery: true,
    canReceiveRead: true,
    supportsThreads: true,
  },
  config: {
    fields: [
      { name: "apiKey", label: "Wazapin API Key", type: "password", required: true },
      { name: "orgSlug", label: "Organization Slug", type: "text", required: false },
      { name: "apiBase", label: "API Base URL", type: "text", required: false, default: "https://api.wazapin.id" },
      { name: "webhookSecret", label: "Webhook Secret", type: "password", required: false },
    ],
  },
  // Inbound: Wazapin webhook → OpenClaw message
  async handleInbound(req, account) {
    const body = await req.json();
    const message = wazapinInboundAdapter(body);
    if (!message) return { ok: true, messages: [] };
    return { ok: true, messages: [message] };
  },
  // Outbound: OpenClaw message → Wazapin API
  async send(message, account) {
    const { payload, headers } = wazapinOutboundAdapter(message, account);
    const resp = await fetch(`${account.apiBase}/v1/messages`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    const data = await resp.json();
    return {
      ok: resp.ok,
      messageId: data.id,
      status: data.status,
      raw: data,
    };
  },
};

// OpenClaw entry point
export default defineChannelPluginEntry({
  id: CHANNEL_ID,
  name: CHANNEL_LABEL,
  description: "Official Wazapin WhatsApp channel plugin for OpenClaw.",
  plugin: wazapinChannelPlugin,
  registerCliMetadata(api) {
    api.registerCli(({ program }) => {
      program.command("wazapin:status").description("Check Wazapin channel status").action(async () => {
        console.log("Use: wazapin doctor");
      });
    });
  },
});
