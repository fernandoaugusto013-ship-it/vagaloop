import { Card, PageHeader } from "@/components/ui/misc";
import { ResumeUpload } from "@/components/candidate/resume-upload";
import { ProfileEditor } from "@/components/candidate/profile-editor";
import { requireRole } from "@/lib/auth";
import type { ProfileInput } from "@/app/actions/candidate";

export default async function PerfilCandidato() {
  const { supabase, user, profile } = await requireRole("candidate");
  const [{ data: cp }, { data: contact }, { data: cv }] = await Promise.all([
    supabase.from("candidate_profiles").select("*").eq("user_id", user.id).single(),
    supabase.from("candidate_contacts").select("phone, whatsapp, linkedin_url").eq("user_id", user.id).single(),
    supabase.from("resumes").select("file_name, created_at").eq("user_id", user.id).eq("is_primary", true).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const initial: ProfileInput = {
    full_name: profile.full_name, headline: cp?.headline ?? null, summary: cp?.summary ?? null, city: cp?.city ?? null, uf: cp?.uf ?? null,
    salary_expectation: cp?.salary_expectation ?? null, skills: cp?.skills ?? [], experiences: cp?.experiences ?? [], education: cp?.education ?? [],
    languages: cp?.languages ?? [], links: cp?.links ?? [], is_pcd: cp?.is_pcd ?? false, pcd_details: cp?.pcd_details ?? null,
    pref_work_modes: cp?.pref_work_modes ?? [], pref_contracts: cp?.pref_contracts ?? [], pref_cities: cp?.pref_cities ?? [],
    phone: contact?.phone ?? null, whatsapp: contact?.whatsapp ?? null, linkedin_url: contact?.linkedin_url ?? null,
  };
  return (
    <>
      <PageHeader title="Meu perfil" description="É isto que as empresas veem quando você se candidata (sem seu contato)." />
      <Card className="mb-6 max-w-4xl"><ResumeUpload current={cv} /></Card>
      {/* key: remonta o editor quando o CV preenche novos dados */}
      <Card className="max-w-4xl"><ProfileEditor key={cp?.updated_at ?? "novo"} initial={initial} /></Card>
    </>
  );
}
