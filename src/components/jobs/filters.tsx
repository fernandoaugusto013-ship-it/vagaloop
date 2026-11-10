import { CONTRACT_TYPES, SECTORS, UFS, WORK_MODES } from "@/lib/constants";
import type { JobFilters } from "@/lib/public-data";
import { Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

/** Formulário GET: filtros na URL, compartilháveis e indexáveis. */
export function JobFiltersForm({ f, action = "/vagas", hideCity = false }: { f: JobFilters; action?: string; hideCity?: boolean }) {
  return (
    <form action={action} method="get" role="search" aria-label="Filtrar vagas" className="space-y-4">
      <div>
        <label htmlFor="q" className="mb-1.5 block text-sm font-semibold">Palavra-chave</label>
        <Input id="q" name="q" defaultValue={f.q} placeholder="Cargo, área ou habilidade" />
      </div>
      <Pick id="modalidade" label="Modalidade" value={f.modalidade} options={WORK_MODES} />
      <Pick id="contrato" label="Tipo de contrato" value={f.contrato} options={CONTRACT_TYPES} />
      {!hideCity ? <Pick id="uf" label="Estado" value={f.uf} options={Object.fromEntries(UFS.map((u) => [u, u]))} /> : null}
      <Pick id="salario" label="Salário a partir de" value={f.salario?.toString()} options={{ "2000": "R$ 2.000", "4000": "R$ 4.000", "6000": "R$ 6.000", "10000": "R$ 10.000", "15000": "R$ 15.000" }} />
      <Pick id="dias" label="Publicada" value={f.dias?.toString()} options={{ "1": "Últimas 24 horas", "3": "Últimos 3 dias", "7": "Última semana", "30": "Último mês" }} />
      <Pick id="setor" label="Setor" value={f.setor} options={Object.fromEntries(SECTORS.map((s) => [s, s]))} />
      <div className="flex gap-2 pt-1">
        <Button type="submit" className="flex-1">Filtrar</Button>
        <a href={action} className="inline-flex h-11 items-center rounded-full px-4 text-sm font-semibold text-muted hover:text-ink">Limpar</a>
      </div>
    </form>
  );
}

function Pick({ id, label, value, options }: { id: string; label: string; value?: string; options: Record<string, string> }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">{label}</label>
      <Select id={id} name={id} defaultValue={value ?? ""}>
        <option value="">Todos</option>
        {Object.entries(options).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </Select>
    </div>
  );
}
