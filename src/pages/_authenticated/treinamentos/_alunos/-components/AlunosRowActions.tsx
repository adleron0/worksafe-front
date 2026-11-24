import { useState } from "react";
import useVerify from "@/hooks/use-verify";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Icon from "@/components/general-components/Icon";
import Dialog from "@/components/general-components/Dialog";
import { RowActionsTrigger } from "@/components/general-components/DataTable";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";
import { IEntity } from "../-interfaces/entity.interface";
import AlunosExames from "../-alunos-exames";
import AlunosCertificados from "../../_certificados/certificados";

/** Menu ⋯ do aluno: provas e certificados (cada um num diálogo). */
export default function AlunosRowActions({ item, entity }: { item: IEntity; entity: IDefaultEntity }) {
  const { can } = useVerify();
  const [openExames, setOpenExames] = useState(false);
  const [openCertificados, setOpenCertificados] = useState(false);
  if (!can(`view_${entity.ability}`)) return null;

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild><RowActionsTrigger label={`Ações de ${item.name}`} /></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="gap-2" onSelect={() => setOpenExames(true)}><Icon name="file-text" className="w-3.5 h-3.5" /> Ver provas</DropdownMenuItem>
          <DropdownMenuItem className="gap-2" onSelect={() => setOpenCertificados(true)}><Icon name="award" className="w-3.5 h-3.5" /> Ver certificados</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={openExames} onOpenChange={setOpenExames} title="Exames do Aluno" description={`Lista de exames realizados pelo aluno ${item.name}`} showBttn={false} showHeader={true}>
        {openExames && <AlunosExames traineeId={item.id || 0} />}
      </Dialog>
      <Dialog open={openCertificados} onOpenChange={setOpenCertificados} title="Certificados do Aluno" description={`Lista de certificados do aluno ${item.name}`} showBttn={false} showHeader={false}>
        {openCertificados && <AlunosCertificados traineeId={item.id || 0} modalPopover={true} />}
      </Dialog>
    </>
  );
}
