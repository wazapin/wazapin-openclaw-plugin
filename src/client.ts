/**
 * Minimal Wazapin Public API client used by the channel outbound adapter.
 */

export interface WazapinSendParams {
  apiKey: string;
  to: string;
  orgSlug?: string;
  apiBase?: string;
  channelId?: string;
}

export interface WazapinSendTextParams extends WazapinSendParams {
  text: string;
}

export interface WazapinSendMediaParams extends WazapinSendParams {
  mediaUrl: string;
}

export interface WazapinSendResult {
  id?: string;
  status?: string;
}

const DEFAULT_API_BASE = "https://api.wazapin.id";

function headers(apiKey: string, orgSlug?: string): Record<string, string> {
  const h: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  if (orgSlug) h["X-Organization-Slug"] = orgSlug;
  return h;
}

async function post(
  apiBase: string,
  path: string,
  apiKey: string,
  orgSlug: string | undefined,
  body: unknown,
): Promise<WazapinSendResult> {
  const resp = await fetch(`${apiBase}${path}`, {
    method: "POST",
    headers: headers(apiKey, orgSlug),
    body: JSON.stringify(body),
  });
  const data = (await resp.json().catch(() => ({}))) as {
    data?: { id?: string; status?: string };
    error?: { message?: string };
  };
  if (!resp.ok) {
    throw new Error(`Wazapin API ${resp.status}: ${data.error?.message ?? resp.statusText}`);
  }
  return data.data ?? {};
}

export function wazapinSendText(params: WazapinSendTextParams): Promise<WazapinSendResult> {
  return post(
    params.apiBase ?? DEFAULT_API_BASE,
    "/v1/messages",
    params.apiKey,
    params.orgSlug,
    {
      channel_id: params.channelId ?? "",
      to: params.to,
      type: "text",
      content: { text: params.text },
    },
  );
}

export function wazapinSendMedia(params: WazapinSendMediaParams): Promise<WazapinSendResult> {
  return post(
    params.apiBase ?? DEFAULT_API_BASE,
    "/v1/messages",
    params.apiKey,
    params.orgSlug,
    {
      channel_id: params.channelId ?? "",
      to: params.to,
      type: "media",
      content: { mediaUrl: params.mediaUrl },
    },
  );
}

export async function wazapinFetchMessageText(params: {
  apiKey: string;
  messageId: string;
  orgSlug?: string;
  apiBase?: string;
}): Promise<string> {
  const resp = await fetch(
    `${params.apiBase ?? DEFAULT_API_BASE}/v1/messages/${params.messageId}`,
    {
      method: "GET",
      headers: headers(params.apiKey, params.orgSlug),
    },
  );
  if (!resp.ok) return "";
  const body = (await resp.json().catch(() => ({}))) as {
    data?: { content?: { text?: string } | string; text?: string };
  };
  const data = body.data ?? {};
  if (typeof data.content === "object" && data.content !== null) {
    return data.content.text ?? "";
  }
  return data.text ?? "";
}
