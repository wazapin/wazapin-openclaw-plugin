/**
 * Wazapin developer webhook inbound: signature verification + event parsing.
 *
 * Payload shape: { event_id, event_type, data, ... }
 *   - event_type "message.new" -> inbound WhatsApp message
 *   - event_type "message.sent" / "contact.updated" / "conversation.updated" -> ignored
 *
 * Dispatch into OpenClaw sessions uses the channel-inbound lifecycle
 * (openclaw/plugin-sdk/inbound-reply-dispatch); plug this receiver into your
 * gateway's HTTP surface (see README "Webhooks").
 */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export interface WazapinInboundMessage {
  chatId: string;
  authorId: string;
  authorName: string;
  text: string;
  messageId?: string;
  timestamp?: string;
  raw: unknown;
}

export function verifySignature(body: Buffer | string, signature: string, secret: string): boolean {
  if (!signature || !secret) return false;
  const expected = "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function parseInboundEvent(payload: Record<string, any>): WazapinInboundMessage | null {
  if (payload.event_type !== "message.new") return null;
  const data = payload.data ?? {};
  const content =
    typeof data.content === "object" && data.content !== null ? data.content : {};
  return {
    chatId: String(data.from_phone ?? data.from ?? ""),
    authorId: String(data.from_phone ?? data.from ?? ""),
    authorName: String(data.contact_name ?? data.from ?? ""),
    text: String(content.text ?? data.text ?? ""),
    messageId: data.id ? String(data.id) : undefined,
    timestamp: data.created_at ? String(data.created_at) : undefined,
    raw: payload,
  };
}
