import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTheme } from "@/context/ThemeContext";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { QRCode } from "@/components/ui/kibo-ui/qr-code";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import Dialog from "@/components/general-components/Dialog";
import { RowActionsTrigger } from "@/components/general-components/DataTable";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";
import { IEntity } from "../-interfaces/entity.interface";
import { ActiveAction, useActiveToggle } from "../../-shared/useActiveToggle";
import DuplicateTurmaModal from "./DuplicateTurmaModal";
import ListaPresenca from "../-lista-presenca";
import VagasEmpresas from "../-empresas/VagasEmpresas";
import DivulgarDialog from "../../_divulgacao/-components/DivulgarDialog";
import AlunosDestaqueDialog from "./AlunosDestaqueDialog";
import EmitirCertificadosDialog from "./EmitirCertificadosDialog";

/** Abre o diálogo depois que o menu fecha (menu aberto bloqueia os cliques do diálogo). */
const later = (fn: () => void) => () => { setTimeout(fn, 0); };

/**
 * Menu ⋯ da turma: editar, duplicar, instrutores, inscrições, links, divulgação,
 * presença, vagas de empresas, certificados, destaques, prova, cancelar e reabrir.
 */
export default function TurmasRowActions({ item, entity, onInstructors, onSubscriptions }: {
  item: IEntity;
  entity: IDefaultEntity;
  onInstructors: (item: IEntity) => void;
  onSubscriptions: (item: IEntity) => void;
}) {
  const { can } = useVerify();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [openQrModal, setOpenQrModal] = useState(false);
  const [openHighlights, setOpenHighlights] = useState(false);
  const [openIssue, setOpenIssue] = useState(false);
  const [openDuplicateModal, setOpenDuplicateModal] = useState(false);
  const [openAttendanceModal, setOpenAttendanceModal] = useState(false);
  const [openCompanies, setOpenCompanies] = useState(false);
  const [openDivulgar, setOpenDivulgar] = useState(false);
  const [confirm, setConfirm] = useState<ActiveAction | null>(null);
  const toggle = useActiveToggle(entity, {
    deactivate: { title: `${entity.name} ${item.name} inativado!`, description: `${entity.name} inativado com sucesso.` },
    activate: { title: `${entity.name} ${item.name} reativado!`, description: `O ${entity.name} foi reativado com sucesso.` },
  });

  // Links públicos do WorkSafe (sem slug: uma empresa por domínio).
  const generateProvaLink = (classId: number) =>
    `${process.env.NODE_ENV === "development" ? "http://localhost:5173" : window.location.origin}/prova/${classId}`;

  const generateEnrollmentLink = (classId: number) => {
    const baseUrl =
      process.env.NODE_ENV === "development"
        ? "http://localhost:5173"
        : theme.companyData?.lp_domain
          ? `https://${theme.companyData.lp_domain}`
          : "https://worksafebrasil.com.br";
    return `${baseUrl}/turma/${classId}`;
  };

  const copyEnrollmentLink = () => {
    navigator.clipboard
      .writeText(generateEnrollmentLink(item.id!))
      .then(() => toast({ title: "Link copiado com sucesso!", description: "O link de inscrição foi copiado para a área de transferência.", variant: "success" }))
      .catch(() => toast({ title: "Erro ao copiar link", description: "Não foi possível copiar o link. Tente novamente.", variant: "destructive" }));
  };

  const canInactive = !!item.active && can(`inactive_${entity.ability}`);
  const canActivate = !item.active && can(`activate_${entity.ability}`);

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild><RowActionsTrigger label={`Ações da turma ${item.name}`} /></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {can(`update_${entity.ability}`) && (
            <DropdownMenuItem className="gap-2" onSelect={() => navigate({ to: "/treinamentos/turmas/$turmaId", params: { turmaId: String(item.id) } })}>
              <Icon name="pencil" className="w-3.5 h-3.5" /> Editar
            </DropdownMenuItem>
          )}
          {can(`create_${entity.ability}`) && <DropdownMenuItem className="gap-2" onSelect={later(() => setOpenDuplicateModal(true))}><Icon name="copy" className="w-3.5 h-3.5" /> Duplicar turma</DropdownMenuItem>}
          <DropdownMenuItem className="gap-2" onSelect={later(() => onInstructors(item))}><Icon name="contact" className="w-3.5 h-3.5" /> Instrutores</DropdownMenuItem>
          <DropdownMenuItem className="gap-2" onSelect={later(() => onSubscriptions(item))}><Icon name="users" className="w-3.5 h-3.5" /> Inscrições</DropdownMenuItem>
          <DropdownMenuItem className="gap-2" onSelect={copyEnrollmentLink}><Icon name="link" className="w-3.5 h-3.5" /> Link inscrição</DropdownMenuItem>
          {can("list_divulgacao") && <DropdownMenuItem className="gap-2" onSelect={later(() => setOpenDivulgar(true))}><Icon name="megaphone" className="w-3.5 h-3.5" /> Divulgar (arte e legenda)</DropdownMenuItem>}
          <DropdownMenuItem className="gap-2" onSelect={later(() => setOpenAttendanceModal(true))}><Icon name="clipboard-check" className="w-3.5 h-3.5" /> Lista de presença</DropdownMenuItem>
          {!item.customerId && (can("list_classes") || can("list_comercial")) && (
            <DropdownMenuItem className="gap-2" onSelect={later(() => setOpenCompanies(true))}><Icon name="building-2" className="w-3.5 h-3.5" /> Vagas de empresas</DropdownMenuItem>
          )}
          <DropdownMenuItem className="gap-2" onSelect={later(() => setOpenIssue(true))}><Icon name="award" className="w-3.5 h-3.5" /> Emitir certificados</DropdownMenuItem>
          <DropdownMenuItem className="gap-2" onSelect={later(() => setOpenHighlights(true))}><Icon name="sparkles" className="w-3.5 h-3.5" /> Alunos destaque</DropdownMenuItem>
          {item.allowExam && <DropdownMenuItem className="gap-2" onSelect={later(() => setOpenQrModal(true))}><Icon name="qr-code" className="w-3.5 h-3.5" /> Link prova</DropdownMenuItem>}
          {(canInactive || canActivate) && <DropdownMenuSeparator />}
          {canInactive && <DropdownMenuItem className="gap-2" onSelect={() => setConfirm("deactivate")}><Icon name="power-off" className="w-3.5 h-3.5" /> Cancelar</DropdownMenuItem>}
          {canActivate && <DropdownMenuItem className="gap-2" onSelect={() => setConfirm("activate")}><Icon name="power" className="w-3.5 h-3.5" /> Reabrir</DropdownMenuItem>}
        </DropdownMenuContent>
      </DropdownMenu>

      {confirm && (
        <ConfirmDialog open onOpenChange={(open) => { if (!open) setConfirm(null); }}
          title={confirm === "activate" ? `Reabrir o ${entity.name} ${item.name}?` : `Cancelar o ${entity.name} ${item.name}?`}
          description={confirm === "activate"
            ? `Ao prosseguir, o ${entity.name} ${item.name} será reaberto e poderá acessar a plataforma.`
            : `Ao prosseguir, o ${entity.name} ${item.name} será cancelado e não poderá acessar a plataforma.`}
          onConfirm={() => { toggle(item.id, confirm); setConfirm(null); }} />
      )}

      {/* Emitir certificados (seleção + destaque) */}
      {item.id && openIssue && (
        <EmitirCertificadosDialog classId={item.id} open={openIssue} onOpenChange={setOpenIssue} />
      )}

      {/* Alunos destaque */}
      {item.id && openHighlights && (
        <AlunosDestaqueDialog
          classId={item.id}
          open={openHighlights}
          onOpenChange={setOpenHighlights}
        />
      )}

      {/* Modal do QR Code */}
      <Dialog
        open={openQrModal}
        onOpenChange={setOpenQrModal}
        title="QR Code da Prova"
        description="Escaneie o QR Code para acessar a prova"
        showBttn={false}
        className="w-sm"
        // altura do conteúdo (o Dialog genérico fixa 80vh sem rodapé)
        classNameContent="h-auto max-h-[75vh] pb-2"
      >
        <div className="flex flex-col items-center space-y-4 py-4">
          {/* Código do curso */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Código do curso</p>
            <p className="text-lg font-semibold">
              {item.classCode || "Não disponível"}
            </p>
          </div>
          {/* QR Code */}
          <QRCode
            data={generateProvaLink(item.id!)}
          />
          {/* Link da prova com botão de copiar */}
          <div className="w-full space-y-2">
            <p className="text-sm text-muted-foreground text-center">
              Link da prova
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={generateProvaLink(item.id!)}
                className="flex-1 px-3 py-2 text-sm border rounded-md bg-background cursor-pointer"
                onClick={(e) => e.currentTarget.select()}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const provaLink = generateProvaLink(item.id!);
                  navigator.clipboard
                    .writeText(provaLink)
                    .then(() => {
                      toast({
                        title: "Link copiado!",
                        description:
                          "O link da prova foi copiado para a área de transferência.",
                        variant: "success",
                      });
                    })
                    .catch(() => {
                      toast({
                        title: "Erro ao copiar",
                        description:
                          "Não foi possível copiar o link. Tente novamente.",
                        variant: "destructive",
                      });
                    });
                }}
              >
                <Icon name="copy" className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </Dialog>

      {/* Divulgação: arte e legenda */}
      <DivulgarDialog
        classId={item.id ?? null}
        open={openDivulgar}
        onOpenChange={setOpenDivulgar}
      />

      {/* Modal de Duplicação */}
      <DuplicateTurmaModal
        turma={item}
        open={openDuplicateModal}
        onOpenChange={setOpenDuplicateModal}
      />

      {/* Vagas compradas por empresas (turma aberta) */}
      <Dialog
        open={openCompanies}
        onOpenChange={setOpenCompanies}
        title={`Vagas de empresas - ${item.name}`}
        description="Empresas que compraram vagas nesta turma. Os alunos delas entram sem cobrança e o certificado sai com a empresa."
        showBttn={false}
        className="max-w-2xl"
      >
        {openCompanies && <VagasEmpresas classId={item.id!} isClosed={Boolean(item.customerId)} />}
      </Dialog>

      {/* Modal de Lista de Presença */}
      <Dialog
        open={openAttendanceModal}
        onOpenChange={setOpenAttendanceModal}
        title={`Lista de Presença - ${item.name}`}
        description="Gerencie a presença dos alunos para cada dia da turma"
        showBttn={false}
        // showHeader={false}
      >
        <ListaPresenca
          classId={item.id!}
          className={item.name}
          daysDuration={item.daysDuration || 1}
        />
      </Dialog>
    </>
  );
}
