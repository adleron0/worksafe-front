import { useState } from "react";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import { RowActionsTrigger } from "@/components/general-components/DataTable";
import { COMMERCIAL_ABILITY } from "../-shared/commercial";
import { ProposalRow, ProposalStatus } from "../-shared/proposals";

/** Situações em que a proposta já tem link do cliente. */
const LINKED: ProposalStatus[] = ["enviada", "visualizada", "aceita", "recusada", "expirada"];

export type ProposalRowAction = "duplicate" | "revise" | "cancelada" | "inactive" | "active";

export interface ProposalRowHandlers {
  open: (id: number) => void;
  openPanel: (row: ProposalRow) => void;
  pdf: (row: ProposalRow) => void;
  copyLink: (row: ProposalRow) => void;
  send: (row: ProposalRow, notify: boolean) => void;
  decide: (row: ProposalRow, kind: "aceita" | "recusada") => void;
  act: (row: ProposalRow, action: ProposalRowAction) => void;
}

type Confirm = "link" | "email" | "cancel" | "archive";

/** Menu ⋯ de uma proposta: o mesmo na linha da lista e no cartão do kanban. */
export default function ProposalRowActions({ row, handlers, onCard = false }: { row: ProposalRow; handlers: ProposalRowHandlers; onCard?: boolean }) {
  const { can } = useVerify();
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const canCreate = can(`create_${COMMERCIAL_ABILITY}`);
  const canUpdate = can(`update_${COMMERCIAL_ABILITY}`);
  const { open, openPanel, pdf, copyLink, send, decide, act } = handlers;

  const CONFIRMS: Record<Confirm, { title: string; description: string; run: () => void }> = {
    link: {
      title: `Criar o link de ${row.number}?`,
      description: "O documento é congelado e a proposta ganha um link para o cliente ler e aceitar. Nenhum e-mail é enviado: o link é copiado para você mandar por onde quiser. Depois disso ela não é mais editada: para mudar algo, cria-se uma revisão.",
      run: () => send(row, false),
    },
    email: {
      title: `Enviar ${row.number} por e-mail?`,
      description: "O documento é congelado e o link é enviado para o e-mail do contato do cliente desta proposta. Depois de enviada ela não é mais editada: para mudar algo, cria-se uma revisão.",
      run: () => send(row, true),
    },
    cancel: { title: `Cancelar ${row.number}?`, description: "A proposta deixa de valer. Ela continua no histórico.", run: () => act(row, "cancelada") },
    archive: {
      title: `Arquivar ${row.number}?`,
      description: 'A proposta sai da lista e do kanban. Nada é apagado: marque "Mostrar arquivadas" para vê-la de novo e trazê-la de volta.',
      run: () => act(row, "inactive"),
    },
  };

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          {onCard
            ? <Button className="h-6 w-6 p-0 shrink-0" variant="ghost" size="sm" aria-label={`Ações de ${row.number}`}><Icon name="ellipsis-vertical" className="w-3 h-3" /></Button>
            : <RowActionsTrigger label={`Ações de ${row.number}`} />}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="gap-2" onSelect={() => open(row.id)}>
            <Icon name={row.status === "rascunho" ? "pencil" : "eye"} className="w-3 h-3" /> {row.status === "rascunho" ? "Editar" : "Abrir"}
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2" onSelect={() => window.open(`/proposta/rascunho/${row.id}`, "_blank", "noopener")}><Icon name="monitor" className="w-3 h-3" /> Ver como o cliente</DropdownMenuItem>
          <DropdownMenuItem className="gap-2" onSelect={() => openPanel(row)}><Icon name="panel-right-open" className="w-3 h-3" /> Painel da proposta</DropdownMenuItem>
          <DropdownMenuItem className="gap-2" onSelect={() => pdf(row)}><Icon name="file-down" className="w-3 h-3" /> Baixar PDF</DropdownMenuItem>
          {LINKED.includes(row.status) && <DropdownMenuItem className="gap-2" onSelect={() => copyLink(row)}><Icon name="link" className="w-3 h-3" /> Copiar link do cliente</DropdownMenuItem>}
          {canUpdate && row.status === "rascunho" && !row.inactiveAt && (<>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2" onSelect={() => setConfirm("link")}><Icon name="copy" className="w-3 h-3" /> Criar e copiar o link</DropdownMenuItem>
            <DropdownMenuItem className="gap-2" onSelect={() => setConfirm("email")}><Icon name="send" className="w-3 h-3" /> Enviar por e-mail</DropdownMenuItem>
          </>)}
          {canUpdate && (row.status === "enviada" || row.status === "visualizada") && !row.inactiveAt && (<>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2" onSelect={() => decide(row, "aceita")}><Icon name="check" className="w-3 h-3" /> Registrar aceite</DropdownMenuItem>
            <DropdownMenuItem className="gap-2" onSelect={() => decide(row, "recusada")}><Icon name="x" className="w-3 h-3" /> Registrar recusa</DropdownMenuItem>
          </>)}
          <DropdownMenuSeparator />
          {canCreate && <DropdownMenuItem className="gap-2" onSelect={() => act(row, "duplicate")}><Icon name="copy" className="w-3 h-3" /> Duplicar</DropdownMenuItem>}
          {canCreate && ["enviada", "visualizada", "recusada", "expirada"].includes(row.status) && (
            <DropdownMenuItem className="gap-2" onSelect={() => act(row, "revise")}><Icon name="git-branch" className="w-3 h-3" /> Criar revisão</DropdownMenuItem>
          )}
          {canUpdate && ["rascunho", "enviada", "visualizada"].includes(row.status) && !row.inactiveAt && (
            <DropdownMenuItem className="gap-2" onSelect={() => setConfirm("cancel")}><Icon name="ban" className="w-3 h-3" /> Cancelar proposta</DropdownMenuItem>
          )}
          {can(`inactive_${COMMERCIAL_ABILITY}`) && ["rascunho", "cancelada", "recusada"].includes(row.status) && !row.inactiveAt && (
            <DropdownMenuItem className="gap-2" onSelect={() => setConfirm("archive")}><Icon name="archive" className="w-3 h-3" /> Arquivar (tirar da lista)</DropdownMenuItem>
          )}
          {can(`activate_${COMMERCIAL_ABILITY}`) && row.inactiveAt && (
            <DropdownMenuItem className="gap-2" onSelect={() => act(row, "active")}><Icon name="archive-restore" className="w-3 h-3" /> Trazer de volta à lista</DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {confirm && (
        <ConfirmDialog open onOpenChange={(isOpen) => { if (!isOpen) setConfirm(null); }} title={CONFIRMS[confirm].title} description={CONFIRMS[confirm].description}
          onConfirm={() => { CONFIRMS[confirm].run(); setConfirm(null); }} />
      )}
    </>
  );
}
