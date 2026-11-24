import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { get, patch } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import { docLabel, formatDocumento } from "@/utils/documento";
import { RecordFilesPanel } from "../arquivos/-shared/record-files";
import { errorMessage } from "../comercial/-shared/commercial";
import CustomerForm from "./-components/CustomerForm";
import { CustomerContactsPanel } from "./-components/CustomerContacts";
import { IEntity } from "./-interfaces/entity.interface";

export const Route = createFileRoute("/_authenticated/clientes/$customerId")({
  component: CustomerPage,
});

const entity = { name: "Cliente", pluralName: "Clientes", model: "customer", ability: "clientes" };

/**
 * Página do cliente: dados cadastrais em cima; depois de cadastrado, os
 * contatos (com papel comercial / financeiro / fiscal) e os arquivos.
 * `/clientes/novo` abre o cadastro em branco.
 */
function CustomerPage() {
  const { customerId } = Route.useParams();
  const isNew = customerId === "novo";
  const id = Number(customerId);
  const { can } = useVerify();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: customer, isLoading, isError } = useQuery({
    queryKey: ["customer", id],
    queryFn: () => get<IEntity>("customer", String(id)),
    enabled: !isNew && id > 0,
  });

  const toggle = useMutation({
    mutationFn: () => patch(entity.model, `${customer?.active ? "inactive" : "active"}/${id}`),
    onSuccess: () => {
      toast({ title: customer?.active ? "Cliente inativado" : "Cliente reativado", variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["customer", id] });
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
    },
    onError: (error) => toast({ title: "Não foi possível concluir", description: errorMessage(error), variant: "destructive" }),
  });

  if (!can(`view_${entity.ability}`)) return null;
  if (!isNew && (Number.isNaN(id) || isError)) {
    return <p className="mt-6 text-sm text-destructive">Cliente não encontrado.</p>;
  }
  if (!isNew && (isLoading || !customer)) {
    return (
      <div className="space-y-3 mt-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  const canEdit = isNew ? can(`create_${entity.ability}`) : can(`update_${entity.ability}`);

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to="/clientes" className="text-xs text-muted-foreground hover:underline inline-flex items-center gap-1">
            <Icon name="arrow-left" className="w-3 h-3" /> Clientes
          </Link>
          {isNew ? (
            <h1 className="text-xl font-bold mt-1">Novo cliente</h1>
          ) : (
            <div className="flex items-center gap-3 mt-1 min-w-0">
              <Avatar className="border">
                <AvatarImage src={customer!.imageUrl || undefined} alt={customer!.name} />
                <AvatarFallback>{customer!.name[0]}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold truncate">{customer!.name}</h1>
                  {!customer!.active && <span className="rounded-full bg-red-200 text-red-900 dark:bg-red-900 dark:text-red-200 px-2 py-0.5 text-xs">Inativo</span>}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {docLabel(customer!.cnpj)} {formatDocumento(customer!.cnpj)}
                  {customer!.corporateName && customer!.corporateName !== customer!.name ? ` · ${customer!.corporateName}` : ""}
                </p>
              </div>
            </div>
          )}
        </div>
        {!isNew && can(customer!.active ? `inactive_${entity.ability}` : `activate_${entity.ability}`) && (
          <ConfirmDialog
            title={customer!.active ? `Inativar ${customer!.name}?` : `Reativar ${customer!.name}?`}
            description={customer!.active
              ? "O cliente some das listas de escolha (propostas, financeiro). O histórico continua."
              : "O cliente volta a aparecer nas listas de escolha."}
            onConfirm={() => toggle.mutate()}
          >
            <Button type="button" variant="outline" className="gap-1 shrink-0">
              <Icon name={customer!.active ? "power-off" : "power"} className="w-4 h-4" /> {customer!.active ? "Inativar" : "Reativar"}
            </Button>
          </ConfirmDialog>
        )}
      </div>

      <div className="mt-4 grid gap-4">
        <section className="rounded-card border bg-card p-4">
          <h2 className="font-semibold">Dados do cliente</h2>
          <p className="text-xs text-muted-foreground mb-3">
            {isNew ? "Comece pelo CNPJ: os dados da empresa vêm sozinhos. Depois de cadastrar, aparecem os contatos e os arquivos." : "Cadastro, endereço e classificação."}
          </p>
          {canEdit ? (
            <CustomerForm
              key={customer?.id ?? "novo"}
              page
              formData={isNew ? undefined : customer}
              entity={entity}
              onSaved={(row) => {
                if (isNew && row?.id) navigate({ to: "/clientes/$customerId", params: { customerId: String(row.id) }, replace: true });
              }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Você pode ver este cliente, mas não editar.</p>
          )}
        </section>

        {!isNew && (
          <>
            <CustomerContactsPanel customerId={id} />
            <section className="rounded-card border bg-card p-4">
              <RecordFilesPanel
                entity="customer"
                entityId={id}
                title="Arquivos"
                hint="Contrato, cadastro, certidões e o que mais for deste cliente. Quem vê o cliente vê os arquivos; quem pode editar envia e apaga."
                className="border-0 p-0"
              />
            </section>
          </>
        )}
      </div>
    </>
  );
}
