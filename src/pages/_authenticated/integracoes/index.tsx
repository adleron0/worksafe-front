import { createFileRoute } from "@tanstack/react-router";
import GatewaysGrid from "./-gateways/-components/GatewaysGrid";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import Icon from "@/components/general-components/Icon";

export const Route = createFileRoute("/_authenticated/integracoes/")({
  component: IntegrationsPage,
});

function IntegrationsPage() {
  return (
    <div className="container mx-auto py-6 px-4 lg:px-0 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Integrações</h1>
        <p className="text-muted-foreground">
          Gerencie todas as integrações e conexões com serviços externos em um
          só lugar.
        </p>
      </div>

      <Tabs defaultValue="payments" className="w-full">
        <ScrollArea className="w-full whitespace-nowrap rounded-md">
          <TabsList className="inline-flex h-auto w-max bg-muted p-1 rounded-lg">
            <TabsTrigger
              value="payments"
              className="flex items-center gap-2 whitespace-nowrap px-3 py-2"
            >
              <Icon name="credit-card" className="h-4 w-4 flex-shrink-0" />
              <span>Pagamentos</span>
            </TabsTrigger>
            <TabsTrigger
              value="communications"
              disabled
              className="flex items-center gap-1 whitespace-nowrap px-3 py-2"
            >
              <Icon name="message-square" className="h-4 w-4 flex-shrink-0" />
              <span>Comunicação</span>
              <span className="text-[10px] bg-background/50 px-1.5 py-0.5 rounded ml-1">
                Em breve
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              disabled
              className="flex items-center gap-1 whitespace-nowrap px-3 py-2"
            >
              <Icon name="chart-bar" className="h-4 w-4 flex-shrink-0" />
              <span>Analytics</span>
              <span className="text-[10px] bg-background/50 px-1.5 py-0.5 rounded ml-1">
                Em breve
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="webhooks"
              disabled
              className="flex items-center gap-1 whitespace-nowrap px-3 py-2"
            >
              <Icon name="webhook" className="h-4 w-4 flex-shrink-0" />
              <span>Webhooks</span>
              <span className="text-[10px] bg-background/50 px-1.5 py-0.5 rounded ml-1">
                Em breve
              </span>
            </TabsTrigger>
          </TabsList>
          <ScrollBar
            orientation="horizontal"
            className="invisible sm:visible"
          />
        </ScrollArea>

        <TabsContent value="payments" className="mt-6">
          <GatewaysGrid showHeader={true} />
        </TabsContent>

        <TabsContent value="communications" className="mt-6">
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
            <Icon
              name="message-square"
              className="h-16 w-16 text-muted-foreground"
            />
            <h3 className="text-xl font-semibold">
              Integrações de Comunicação
            </h3>
            <p className="text-muted-foreground max-w-md">
              Em breve você poderá conectar serviços de e-mail, SMS e
              notificações push para melhorar a comunicação com seus clientes.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
            <Icon
              name="chart-bar"
              className="h-16 w-16 text-muted-foreground"
            />
            <h3 className="text-xl font-semibold">Integrações de Analytics</h3>
            <p className="text-muted-foreground max-w-md">
              Em breve você poderá conectar ferramentas de analytics e
              monitoramento para acompanhar métricas e desempenho do seu
              negócio.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="webhooks" className="mt-6">
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
            <Icon name="webhook" className="h-16 w-16 text-muted-foreground" />
            <h3 className="text-xl font-semibold">Webhooks</h3>
            <p className="text-muted-foreground max-w-md">
              Em breve você poderá configurar webhooks para receber notificações
              em tempo real sobre eventos importantes do seu sistema.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="storage" className="mt-6">
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
            <Icon name="database" className="h-16 w-16 text-muted-foreground" />
            <h3 className="text-xl font-semibold">Armazenamento</h3>
            <p className="text-muted-foreground max-w-md">
              Em breve você poderá conectar serviços de armazenamento em nuvem
              como AWS S3, Google Cloud Storage e outros.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
