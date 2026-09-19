import { secrets } from "base44:runtime";

// Shared helper for the external Lab API.
// Settings are read from the LabSettings entity (admin-configurable) with fallback to secrets.
// API key ALWAYS stays in secrets — never exposed to frontend or stored in the DB.

export async function getLabSettings(base44) {
  try {
    const list = await base44.asServiceRole.entities.LabSettings.list();
    return list && list.length > 0 ? list[0] : null;
  } catch {
    return null;
  }
}

export async function getLabApiConfig(base44) {
  const settings = await getLabSettings(base44);
  // Base URL and API key ALWAYS come from Application Secrets — never from LabSettings or hardcoded URLs.
  const baseUrl = (secrets.get("LAB_API_BASE_URL") || "").replace(/\/+$/, "");
  const apiKey = secrets.get("LAB_API_KEY") || "";
  if (!baseUrl) throw new Error("LAB_API_BASE_URL not configured");
  if (!apiKey) throw new Error("LAB_API_KEY not configured");
  const startEndpoint = "/labs/start";
  const statusTemplate = "/labs/{session_id}";
  const stopTemplate = "/labs/{session_id}";
  const timeoutSeconds = (settings && settings.timeout_seconds) || 30;
  return {
    baseUrl,
    apiKey,
    startEndpoint,
    statusTemplate,
    stopTemplate,
    timeoutMs: timeoutSeconds * 1000,
    settings,
  };
}

export function buildEndpoint(template, sessionId) {
  return template.replace("{session_id}", sessionId);
}

export async function labApiRequest(base44, fullPath, method, body, timeoutMs) {
  const config = await getLabApiConfig(base44);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs || config.timeoutMs);
  try {
    const res = await fetch(`${config.baseUrl}${fullPath}`, {
      method,
      headers: { "Content-Type": "application/json", "X-API-Key": config.apiKey },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const text = await res.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
    return { ok: res.ok, status: res.status, data };
  } finally {
    clearTimeout(timeout);
  }
}

export async function logLabOperation(base44, logData) {
  try {
    await base44.asServiceRole.entities.LabLog.create({
      user_id: logData.user_id || '',
      user_name: logData.user_name || '',
      lab_id: logData.lab_id || '',
      lab_title: logData.lab_title || '',
      session_id: logData.session_id || '',
      operation: logData.operation,
      status: logData.status,
      http_status: logData.http_status || null,
      error_message: logData.error_message || '',
      response_data: logData.response_data || null,
      duration_ms: logData.duration_ms || null,
    });
  } catch {
    // Best-effort logging — never block the main operation
  }
}