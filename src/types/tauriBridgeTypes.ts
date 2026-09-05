export interface FileOperationResult {
  success: boolean;
  path: string;
  message: string;
  content?: string;
  word_count?: number;
}

export interface RewritePassageRequest {
  text: string;
  tone: string;
  length: string;
  goal: string;
  api_key?: string;
  base_url?: string;
  model?: string;
}

export interface RewritePassageResponse {
  variations: string[];
  latency_ms: number;
  provider: string;
}
