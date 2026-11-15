import { createFileRoute } from "@tanstack/react-router";
import useVerify from "@/hooks/use-verify";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Icon from "@/components/general-components/Icon";
import CaptionTemplatesPanel from "./-components/CaptionTemplatesPanel";
import SettingsPanel from "./-components/SettingsPanel";
import WhiteLabelPanel from "./-components/WhiteLabelPanel";
import ClassPicker from "./-components/ClassPicker";

export const Route = createFileRoute("/_authenticated/treinamentos/_divulgacao/divulgacao")({
  component: DivulgacaoPage,
});

/**
 * Divulgação de turmas: gerar arte e legenda de uma turma, editar os modelos
 * de legenda e os dados fixos (contatos, horário, incluso, hashtags, selos).
 * A arte e a legenda também abrem pelo menu de cada turma ("Divulgar").
 */
function DivulgacaoPage() {
  const { can } = useVerify();
  if (!can("view_divulgacao") && !can("list_divulgacao")) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Você não tem permissão para visualizar esta página.</p>
      </div>
    );
  }
  const canEdit = can("update_divulgacao");

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Icon name="megaphone" className="w-6 h-6 text-primary" /> Divulgação
        </h1>
        <p className="text-sm text-muted-foreground">
          Artes para o Instagram e legendas prontas a partir das turmas. Escolha a turma, baixe a arte e copie a legenda.
        </p>
      </div>

      <Tabs defaultValue="gerar">
        <TabsList>
          <TabsTrigger value="gerar">Gerar</TabsTrigger>
          <TabsTrigger value="legendas">Modelos de legenda</TabsTrigger>
          <TabsTrigger value="identidade">Identidade visual</TabsTrigger>
          <TabsTrigger value="config">Contatos e dados</TabsTrigger>
        </TabsList>
        <TabsContent value="gerar" className="mt-4">
          <ClassPicker />
        </TabsContent>
        <TabsContent value="legendas" className="mt-4">
          <CaptionTemplatesPanel canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="identidade" className="mt-4">
          <WhiteLabelPanel canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="config" className="mt-4">
          <SettingsPanel canEdit={canEdit} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
