"use client";
import { useState } from "react";
import { JobForm, emptyDraft } from "./job-form";
import type { PartialJobDraft } from "@/lib/job-schema";

export function ManualWorkspace({ companyName, initial, jobId }: { companyName: string; initial?: PartialJobDraft; jobId?: string }) {
  const [draft, setDraft] = useState<PartialJobDraft>(initial ?? emptyDraft());
  return <JobForm draft={draft} onChange={setDraft} via="manual" jobId={jobId} companyName={companyName} />;
}
