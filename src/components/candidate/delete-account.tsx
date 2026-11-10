"use client";
import { useActionState } from "react";
import { deleteMyAccount } from "@/app/actions/candidate";
import { Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export function DeleteAccount() {
  const [state, action, pending] = useActionState(deleteMyAccount, {});
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <div>
        <label htmlFor="confirm" className="mb-1.5 block text-sm font-semibold">Digite EXCLUIR para confirmar</label>
        <Input id="confirm" name="confirm" autoComplete="off" className="w-48" />
      </div>
      <Button type="submit" variant="danger" disabled={pending}>{pending ? "Excluindo…" : "Excluir conta"}</Button>
      {state.error ? <p role="alert" className="w-full text-sm text-danger">{state.error}</p> : null}
    </form>
  );
}
