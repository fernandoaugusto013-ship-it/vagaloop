import { Badge, Card, PageHeader } from "@/components/ui/misc";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { addFaq, addTestimonial, deleteContent, togglePublished } from "@/app/actions/admin";
import { requireRole } from "@/lib/auth";

export default async function Conteudo() {
  const { supabase } = await requireRole("admin");
  const [{ data: faqs }, { data: testimonials }] = await Promise.all([
    supabase.from("faqs").select("*").order("scope").order("position"),
    supabase.from("testimonials").select("*").order("created_at", { ascending: false }),
  ]);
  return (
    <>
      <PageHeader title="FAQ e depoimentos" description="Os números da home vêm direto do banco. Depoimentos só aparecem depois de publicados." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-bold">FAQ</h2>
          <form action={addFaq} className="space-y-3 rounded-xl bg-surface-2 p-4">
            <Select name="scope" aria-label="Página"><option value="home">Home</option><option value="contratar">Quero contratar</option><option value="recrutadores">Recrutadoras</option><option value="candidatos">Candidatos</option></Select>
            <Input name="question" placeholder="Pergunta" required aria-label="Pergunta" />
            <Textarea name="answer" placeholder="Resposta" rows={3} required aria-label="Resposta" />
            <Button type="submit" size="sm">Adicionar pergunta</Button>
          </form>
          <ul className="mt-4 divide-y divide-line">
            {(faqs ?? []).map((f) => (
              <li key={f.id} className="py-3 text-sm">
                <div className="flex items-start gap-2"><Badge>{f.scope}</Badge><p className="flex-1 font-semibold">{f.question}</p></div>
                <div className="mt-1 flex gap-3">
                  <Toggle table="faqs" id={f.id} published={f.is_published} />
                  <form action={deleteContent}><input type="hidden" name="table" value="faqs" /><input type="hidden" name="id" value={f.id} /><button className="text-xs font-semibold text-danger hover:underline">Excluir</button></form>
                </div>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="mb-4 font-bold">Depoimentos</h2>
          <form action={addTestimonial} className="space-y-3 rounded-xl bg-surface-2 p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Input name="author_name" placeholder="Nome" required aria-label="Nome" />
              <Input name="author_role" placeholder="Cargo" aria-label="Cargo" />
              <Input name="company" placeholder="Empresa" aria-label="Empresa" />
            </div>
            <Textarea name="quote" placeholder="Depoimento, nas palavras da pessoa" rows={3} required aria-label="Depoimento" />
            <Field label="Onde aparece" htmlFor="t-scope"><Select id="t-scope" name="scope"><option value="home">Home</option><option value="contratar">Quero contratar</option><option value="recrutadores">Recrutadoras</option></Select></Field>
            <Checkbox name="consent" required label="Tenho autorização por escrito desta pessoa para publicar o depoimento e o nome dela." />
            <Button type="submit" size="sm">Adicionar (fica oculto até publicar)</Button>
          </form>
          <ul className="mt-4 divide-y divide-line">
            {(testimonials ?? []).map((t) => (
              <li key={t.id} className="py-3 text-sm">
                <p>“{t.quote}”</p><p className="mt-1 text-muted">{t.author_name}{t.company ? `, ${t.company}` : ""} · {t.scope}</p>
                <div className="mt-1 flex gap-3">
                  <Toggle table="testimonials" id={t.id} published={t.is_published} />
                  <form action={deleteContent}><input type="hidden" name="table" value="testimonials" /><input type="hidden" name="id" value={t.id} /><button className="text-xs font-semibold text-danger hover:underline">Excluir</button></form>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}

function Toggle({ table, id, published }: { table: string; id: string; published: boolean }) {
  return (
    <form action={togglePublished}>
      <input type="hidden" name="table" value={table} /><input type="hidden" name="id" value={id} /><input type="hidden" name="value" value={String(!published)} />
      <button className="text-xs font-semibold text-brand hover:underline">{published ? "Ocultar" : "Publicar"}</button>
    </form>
  );
}
