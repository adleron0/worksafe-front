import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import { cn } from "@/lib/utils";
import { COMMERCIAL_ABILITY, commercialApi, dateBr, errorMessage, money } from "../-shared/commercial";
import { SELLERS_KEY, SellerCandidate, SellersResponse, WalletDetail, initials } from "../-shared/sellers";

export const Route = createFileRoute("/_authenticated/comercial/_vendedores/vendedores")({
  component: SellersPage,
});

/**
 * Vendedores: quem vende e quanto cada um tem a receber de comissão.
 * Vendedor é só um usuário do sistema marcado como vendedor; clicar abre a carteira dele.
 */
function SellersPage() {
  const { can } = useVerify();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const params = search.trim() ? { search: search.trim() } : undefined;
  const { data, isLoading, error } = useQuery({
    queryKey: [SELLERS_KEY, params],
    queryFn: () => commercialApi.get<SellersResponse>("sellers", params),
    placeholderData: (previous) => previous,
  });
  if (!can(`view_${COMMERCIAL_ABILITY}`)) return null;
  const canUpdate = can(`update_${COMMERCIAL_ABILITY}`);
  const open = (id: number) => navigate({ to: "/comercial/vendedores/$sellerId", params: { sellerId: String(id) } });
  const summary = data?.summary;

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Vendedores</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Cada vendedor tem uma carteira com as comissões de treinamentos e de serviços. A comissão entra no saldo quando o cliente paga; o pagamento ao vendedor é lançado na carteira.
          </p>
        </div>
        {canUpdate && <Button type="button" className="shrink-0" onClick={() => setAdding(true)}><Icon name="plus" className="w-4 h-4 mr-1" /> Novo vendedor</Button>}
      </div>

      <div className="grid sm:grid-cols-3 gap-3 my-4">
        <Total label="A pagar agora" value={summary?.balance} highlight hint="Comissões liberadas e ainda não pagas, somando todos os vendedores." />
        <Total label="A liberar" value={summary?.pending} hint="Vendas feitas cujo cliente ainda não pagou." />
        <Total label="Já pago" value={summary?.paid} hint="Soma dos pagamentos lançados nas carteiras." />
      </div>

      <div className="mb-3 w-full sm:w-80">
        <Input name="search" value={search} onValueChange={(_, value) => setSearch(String(value))} placeholder="Buscar por nome ou e-mail..." icon="search" />
      </div>

      <div className="rounded-lg border overflow-hidden">
        <div className="hidden lg:flex items-center py-2 px-4 bg-primary font-semibold text-sm text-inverse-foreground">
          <div className="flex-1">Vendedor</div>
          <div className="w-36 text-right">A pagar</div>
          <div className="w-36 text-right">A liberar</div>
          <div className="w-36 text-right">Já pago</div>
          <div className="w-44 text-right">Última movimentação</div>
        </div>
        {isLoading && Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-14 w-full my-1" />)}
        {error && <p className="p-4 text-destructive font-medium">Erro: {errorMessage(error)}</p>}
        {!isLoading && !error && !data?.rows.length && (
          <p className="p-6 text-sm text-muted-foreground">
            {search ? "Nenhum vendedor para essa busca." : "Nenhum vendedor ainda. Use “Novo vendedor” para marcar um usuário do sistema como vendedor."}
          </p>
        )}
        {data?.rows.map((row) => (
          <button key={row.id} type="button" onClick={() => open(row.id)}
            className="w-full text-left flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-0 px-4 py-3 border-b last:border-b-0 text-sm hover:bg-muted/40">
            <div className="flex-1 min-w-0 flex items-center gap-3 lg:pr-4">
              <Avatar className="border h-9 w-9">
                <AvatarImage src={row.imageUrl || undefined} alt={row.name} />
                <AvatarFallback className="text-xs">{initials(row.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-medium truncate">{row.name}{row.inactiveAt && <span className="ml-2 text-xs rounded bg-muted px-1.5 py-0.5 font-normal">Inativo</span>}</p>
                <p className="text-xs text-muted-foreground truncate">{row.email}</p>
              </div>
            </div>
            <div className={cn("lg:w-36 lg:text-right font-semibold tabular-nums", row.wallet.balance > 0.005 && "text-primary", row.wallet.balance < -0.005 && "text-destructive")}>
              <span className="lg:hidden text-xs font-normal text-muted-foreground">A pagar: </span>{money(row.wallet.balance)}
            </div>
            <div className="lg:w-36 lg:text-right tabular-nums text-muted-foreground"><span className="lg:hidden text-xs">A liberar: </span>{money(row.wallet.pending)}</div>
            <div className="lg:w-36 lg:text-right tabular-nums text-muted-foreground"><span className="lg:hidden text-xs">Já pago: </span>{money(row.wallet.paid)}</div>
            <div className="lg:w-44 lg:text-right text-muted-foreground"><span className="lg:hidden text-xs">Última movimentação: </span>{dateBr(row.wallet.lastMovementAt)}</div>
          </button>
        ))}
      </div>

      {adding && <NewSellerDialog onClose={() => setAdding(false)} onCreated={(id) => { setAdding(false); open(id); }} />}
    </>
  );
}

const Total = ({ label, value, hint, highlight }: { label: string; value?: number; hint: string; highlight?: boolean }) => (
  <div className={cn("rounded-lg border p-4", highlight && "border-primary/50 bg-primary/5")}>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className={cn("text-2xl font-bold tabular-nums leading-tight mt-0.5", highlight && "text-primary")}>{value === undefined ? "—" : money(value)}</p>
    <p className="text-xs text-muted-foreground mt-1">{hint}</p>
  </div>
);

/** Novo vendedor: escolher um usuário do sistema. Marcar cria a carteira dele — só isso. */
function NewSellerDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (id: number) => void }) {
  const queryClient = useQueryClient();
  const [term, setTerm] = useState("");
  const [picked, setPicked] = useState<SellerCandidate | null>(null);
  const params = term.trim() ? { search: term.trim() } : undefined;
  const { data, isFetching, error } = useQuery({
    queryKey: [SELLERS_KEY, "candidates", params],
    queryFn: () => commercialApi.get<SellerCandidate[]>("sellers/candidates", params),
    placeholderData: (previous) => previous,
  });
  const { mutate, isPending } = useMutation({
    mutationFn: () => commercialApi.post<WalletDetail>(`sellers/${picked!.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SELLERS_KEY] });
      toast({ title: `${picked!.name} agora é vendedor`, description: "A carteira foi criada.", variant: "success" });
      onCreated(picked!.id);
    },
    onError: (err) => toast({ title: "Não foi possível marcar como vendedor", description: errorMessage(err), variant: "destructive" }),
  });

  return (
    <Dialog open onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo vendedor</DialogTitle>
          <DialogDescription>Escolha um usuário do sistema. Ele passa a ser vendedor e ganha uma carteira de comissões; nada mais muda no cadastro dele.</DialogDescription>
        </DialogHeader>
        <Input name="candidateSearch" value={term} onValueChange={(_, value) => setTerm(String(value))} placeholder="Digite o nome ou o e-mail para filtrar" icon="search" aria-label="Filtrar usuários" />
        <ul className="grid gap-1 max-h-[46vh] overflow-y-auto" role="listbox" aria-label="Usuários">
          {error && <li className="px-3 py-2 text-sm text-destructive">Não foi possível carregar os usuários: {errorMessage(error)}</li>}
          {isFetching && !data && <li className="px-3 py-2 text-sm text-muted-foreground">Buscando…</li>}
          {data?.map((user) => {
            const active = picked?.id === user.id;
            return (
              <li key={user.id}>
                <button type="button" role="option" aria-selected={active} onClick={() => setPicked(user)}
                  className={cn("w-full min-w-0 flex items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors", active ? "border-primary bg-primary/10" : "bg-background hover:bg-muted/60")}>
                  <Avatar className="border h-8 w-8">
                    <AvatarImage src={user.imageUrl || undefined} alt={user.name} />
                    <AvatarFallback className="text-xs">{initials(user.name)}</AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{user.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
                  </span>
                  {active && <Icon name="check" className="w-4 h-4 shrink-0 text-primary" />}
                </button>
              </li>
            );
          })}
          {data && data.length === 0 && <li className="px-3 py-2 text-sm text-muted-foreground">{term ? "Nenhum usuário para essa busca." : "Todos os usuários ativos já são vendedores."}</li>}
        </ul>
        {data && data.length === 10 && <p className="text-xs text-muted-foreground">Mostrando os 10 primeiros. Digite para filtrar.</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="button" disabled={!picked || isPending} onClick={() => mutate()}>{isPending ? "Marcando..." : "Marcar como vendedor"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
