const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("inkmind_token");
}

export function setToken(token: string) {
  window.localStorage.setItem("inkmind_token", token);
}

export function clearToken() {
  window.localStorage.removeItem("inkmind_token");
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const data = await res.json();
      detail = data.detail || detail;
    } catch {
      // ignore
    }
    throw new ApiError(detail, res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  upload: <T>(path: string, formData: FormData) =>
    request<T>(path, { method: "POST", body: formData }),
};

export function fileUrl(path: string | null | undefined): string {
  if (!path) return "";
  // Backend stores absolute-ish local paths like "uploads/doc_1/xyz.png"
  const normalized = path.replace(/^.*uploads/, "uploads");
  return `${API_URL}/${normalized}`;
}

// ---------- Types ----------

export type User = { id: number; name: string; email: string; role: string };

export type Document = {
  id: number;
  title: string;
  subject: string | null;
  topic: string | null;
  status: string;
  status_detail: string | null;
  language: string;
  page_count: number;
  word_count: number;
  created_at: string;
};

export type Page = {
  id: number;
  page_number: number;
  original_path: string;
  enhanced_path: string | null;
  raw_text: string | null;
  corrected_text: string | null;
  confidence_data: { word: string; confidence: number }[] | null;
  quality_data: {
    image_quality: number;
    lighting: string;
    sharpness: string;
    skew: string;
    recommendation: string | null;
  } | null;
};

export type DocumentDetail = Document & { pages: Page[] };

export type Summary = {
  id: number;
  level: string;
  content: string;
  key_points: string[] | null;
  keywords: string[] | null;
};

export type Question = {
  id: number;
  type: string;
  prompt: string;
  options: string[] | null;
  answer: string | null;
  explanation: string | null;
};

export type ChatSource = {
  document_id: number;
  document_title: string;
  page_number: number;
  snippet: string;
  relevance: number;
};

export type DashboardStats = {
  total_documents: number;
  total_pages: number;
  words_extracted: number;
  topics_detected: number;
  questions_generated: number;
};
