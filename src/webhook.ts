/**
 * Wazapin developer webhook inbound.
 *
 * Official payload (Svix): { event_id, event_type, data } where message.new
 * data is metadata only: { message_id, conversation_id, contact_id,
 * channel_id, direction, from_phone, msg_type, ... }. Fetch the message text
 * via GET /v1/messages/{message_id} (see client.fetchMessageText).
 *
 * Signature: Svix scheme — HMAC-SHA256 of `${id}.${timestamp}.${body}` keyed
 * by the base64-decoded secret, base64-encoded, compared against the
 * svix-signature header (values may be "v1,<sig>"), with a 5-minute
 * timestamp tolerance.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export interface WazapinInboundMessage {
  chatId: string;
  authorId: string;
  authorName: string;
  messageId?: string;
  conversationId?: string;
  channelId?: string;
  msgType: string;
  raw: unknown;
}

export function verifySvixSignature(params: {
  id: string;
  timestamp: string;
  body: string;
  signatureHeader: string;
  secret: string;
}): boolean {
  const { id, timestamp, body, signatureHeader, secret } = params;
  if (!signatureHeader || !secret) return false;

  // 5-minute timestamp tolerance.
  const now = Math.floor(Date.now() / 1000);
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(now - ts) > 300) return false;

  let secretBytes: Buffer;
  try {
    secretBytes = Buffer.from(secret, "base64");
  } catch {
    return false;
  }

  const expected = createHmac("sha256", secretBytes)
    .update(`${id}.${timestamp}.${body}`)
    .digest("base64");

  for (const item of signatureHeader.split(" ")) {
    const candidate = item.trim().replace(/^v1,/, "");
    if (!candidate) continue;
    const a = Buffer.from(candidate);
    const b = Buffer.from(expected);
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  }
  return false;
}

export function parseInboundEvent(payload: Record<string, any>): WazapinInboundMessage | null {
  if (payload.event_type !== "message.new") return null;
  const data = payload.data ?? {};
  return {
    chatId: String(data.from_phone ?? ""),
    authorId: String(data.from_phone ?? ""),
    authorName: String(data.from_phone ?? ""),
    messageId: data.message_id ? String(data.message_id) : undefined,
    conversationId: data.conversation_id ? String(data.conversation_id) : undefined,
    channelId: data.channel_id ? String(data.channel_id) : undefined,
    msgType: String(data.msg_type ?? "text"),
    raw: payload,
  };
}
