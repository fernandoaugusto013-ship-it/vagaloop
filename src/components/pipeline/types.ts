import type { AiSummary } from "@/lib/types";

export type PipelineStage = { id: string; name: string; kind: string; position: number };
export type PipelineCard = {
  id: string; stage_id: string | null; match_score: number | null; ai_status: "pendente" | "ok" | "erro";
  ai_summary: AiSummary | null; rating: number | null; tags: string[]; knockout_failed: boolean; source: string;
  created_at: string; name: string; headline: string | null; place: string | null;
};
