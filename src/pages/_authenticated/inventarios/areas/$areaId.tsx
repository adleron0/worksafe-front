import { createFileRoute } from '@tanstack/react-router';
import useVerify from "@/hooks/use-verify";
import InspectionCanvas from "@/components/general-components/InspectionCanvas";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { useState } from "react";
// import fabricaImage from "@/assets/seguro-de-fabrica-corretora-de-seguros.jpg";
import { toast } from "@/hooks/use-toast";
import { useMatches } from "@tanstack/react-router";
import { getArea } from "@/services/specific/areaService";
import { useQuery } from "@tanstack/react-query";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Eye, Map } from "lucide-react";

type ParamsType = {
  areaId: string;
};

export const Route = createFileRoute('/_authenticated/inventarios/areas/$areaId')({
  component: () => <AreaDetails />,
})

function AreaDetails() {
  const { can, has } = useVerify();
  const matches: { params: ParamsType }[] = useMatches();
  const { areaId } = matches[2].params;
  
  const [points, setPoints] = useState([
    { id: '001', name: 'TAG 001', x: 0.2, y: 0.3 },
    { id: '002', name: 'TAG 002', x: 0.4, y: 0.5 },
  ]);

  const { data: areaData } = useQuery({
    queryKey: ['areaDetails', areaId],
    queryFn: () => getArea(Number(areaId)),
  });
  
  // Função chamada ao adicionar um novo ponto
  const handleAddPoint = (newPoint: any) => {
    const newId = (points.length + 1).toString();
    setPoints([...points, { ...newPoint, id: newId }]);
  };
  
  // Função chamada ao clicar em um ponto existente
  const handlePointClick = (point: any) => {
    toast({
      title: "ponto Clicado!",
      description: `Ponto clicado: ID ${point.id}, Coordenadas (${point.x}, ${point.y})`,
      variant: "default",
      duration: 5000
    })
  };

  // const handleSearch = async (params: any) => {
  //   console.log(params);
  // };

  // const handleClear = () => {
  //   console.log("clear");
  // };
    
  
  if (!can('view_inventarios') || !has('Confinus')) return null;
  return (
    <>
      <div className="flex flex-col md:flex-row mb-4 items-start justify-between md:items-center">
        <div>
          <h1 className="text-xl font-bold">{areaData?.name}</h1>
          <span className="text-gray-600 dark:text-gray-100">{areaData?.description}</span>
        </div>
      </div>

      {/* <div className="flex justify-between items-center my-4">
        <AreasSearchForm onSubmit={handleSearch} onClear={handleClear} />
        <AreaForm />
      </div> */}

      <Accordion type="single" collapsible defaultValue="item-1">
        <AccordionItem value="item-1">
          <AccordionTrigger className="relative bg-muted/80 hover:bg-muted px-4 cursor-pointer">
            <div className="flex items-center gap-2">
              <Map className="w-4 h-4" />
              Visualizar Mapa de Área
            </div>
            <div className="right-4 top-auto bottom-auto absolute bg-primary z-10 p-1 rounded">
              <Eye className="w-4 h-4 text-muted" />
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <AspectRatio ratio={16 / 6} className="bg-muted rounded">
              <InspectionCanvas
                imageUrl={areaData?.imageUrl || undefined}
                points={points}
                onAddPoint={handleAddPoint}
                onPointClick={handlePointClick}
                insertMode={false}
              />
            </AspectRatio>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      
      <h2 className="font-semibold text-sm mt-4">Sub Áreas:</h2>
      <div className="flex items-center gap-1">
        <ScrollArea >
          <Tabs defaultValue="todas" className="w-full">
            <TabsList className="space-x-1">
              <TabsTrigger className="bg-background/30 rounded text-xs min-w-20 md:w-fit" value="todas">Todas</TabsTrigger>
              <TabsTrigger className="bg-background/30 rounded text-xs min-w-20 md:w-fit" value="forno">Forno</TabsTrigger>
              <TabsTrigger className="bg-background/30 rounded text-xs min-w-20 md:w-fit" value="refeitorio">Refeitório</TabsTrigger>
              <TabsTrigger className="bg-background/30 rounded text-xs min-w-20 md:w-fit" value="producao">Produção</TabsTrigger>
              <TabsTrigger className="bg-background/30 rounded text-xs min-w-20 md:w-fit" value="armazenamento">Armazenamento</TabsTrigger>
            </TabsList>
          </Tabs>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </>
  );
};
