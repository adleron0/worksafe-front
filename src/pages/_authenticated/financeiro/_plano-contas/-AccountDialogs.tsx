import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Input from "@/components/general-components/Input";
import { ApiError } from "@/general-interfaces/api.interface";
import AccountSelect from "../-shared/AccountSelect";
import { CHART_KEY, ChartAccount, financialApi } from "../-shared/financial";

interface BaseProps {
  accounts: ChartAccount[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const errorMessage = (error: ApiError) => {
  const message = error.response?.data?.message;
  return Array.isArray(message) ? message.join(" ") : message || "Erro desconhecido.";
};

/** Criar conta filha (com a mãe já escolhida ao vir do "+" da linha) ou renomear. */
export function AccountFormDialog({ accounts, open, onOpenChange, account, parentId }: BaseProps & { account?: ChartAccount; parentId?: number }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(account?.name ?? "");
  const [parent, setParent] = useState(parentId ? String(parentId) : "");
  const [error, setError] = useState("");
  const parentAccount = accounts.find((a) => String(a.id) === parent);

  const { mutate, isPending } = useMutation({
    mutationFn: () => account
      ? financialApi.put<ChartAccount>(`chart-accounts/${account.id}`, { name })
      : financialApi.post<ChartAccount & { movedEntries: number }>("chart-accounts", { name, parentId: Number(parent) }),
    onSuccess: (result) => {
      const moved = (result as { movedEntries?: number }).movedEntries ?? 0;
      toast({
        title: account ? "Conta atualizada!" : `Conta ${result.code} criada!`,
        description: moved > 0 ? `${moved} lançamento(s) da conta mãe passaram para a nova conta.` : undefined,
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: [CHART_KEY] });
      onOpenChange(false);
    },
    onError: (err: ApiError) => setError(errorMessage(err)),
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const clean = name.trim().replace(/\s+/g, " ");
    if (clean.length < 2) return setError("Informe o nome da conta");
    if (!account && !parent) return setError("Escolha a conta mãe");
    setError("");
    mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{account ? `Editar ${account.code}` : "Nova conta"}</DialogTitle>
          <DialogDescription>
            {account ? "O código não muda ao renomear." : "O código é gerado a partir da conta mãe."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!account && (
            <div>
              <Label>Conta mãe <span>*</span></Label>
              <AccountSelect accounts={accounts} value={parent} onChange={setParent} mode="parent" placeholder="Selecione a conta mãe" />
              {parentAccount?.acceptsEntries && parentAccount.entries > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {parentAccount.code} {parentAccount.name} tem {parentAccount.entries} lançamento(s). Eles passam para a nova conta,
                  porque conta mãe não recebe lançamento.
                </p>
              )}
            </div>
          )}
          <div>
            <Label htmlFor="accountName">Nome <span>*</span></Label>
            <Input id="accountName" name="name" value={name} maxLength={120} autoFocus={Boolean(account || parentId)}
              onValueChange={(_, value) => setName(String(value))} placeholder="Ex.: Turmas fechadas" className="mt-1" />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>{account ? "Salvar" : "Criar conta"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Trocar a conta de mãe: recodifica a conta e as filhas. */
export function MoveAccountDialog({ accounts, open, onOpenChange, account }: BaseProps & { account: ChartAccount }) {
  const queryClient = useQueryClient();
  const [target, setTarget] = useState("");
  const [error, setError] = useState("");

  const { mutate, isPending } = useMutation({
    mutationFn: () => financialApi.patch<ChartAccount>(`chart-accounts/move/${account.id}`, { parentId: Number(target) }),
    onSuccess: (result) => {
      toast({ title: `Conta movida: agora é ${result.code}`, variant: "success" });
      queryClient.invalidateQueries({ queryKey: [CHART_KEY] });
      onOpenChange(false);
    },
    onError: (err: ApiError) => setError(errorMessage(err)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mover {account.code} {account.name}</DialogTitle>
          <DialogDescription>
            A conta{account.children > 0 ? " e as filhas dela ganham" : " ganha"} um código novo dentro da conta mãe escolhida.
            Os lançamentos continuam ligados a ela.
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4"
          onSubmit={(event) => { event.preventDefault(); if (!target) return setError("Escolha a conta mãe de destino"); setError(""); mutate(); }}>
          <div>
            <Label>Nova conta mãe <span>*</span></Label>
            <AccountSelect accounts={accounts.filter((a) => a.id !== account.parentId)} value={target} onChange={setTarget}
              mode="parent" excludeCode={account.code} placeholder="Selecione o destino" />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>Mover</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
