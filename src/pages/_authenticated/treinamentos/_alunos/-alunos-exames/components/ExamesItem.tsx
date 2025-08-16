// Serviços
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { patch } from "@/services/api";
import { useLoader } from "@/context/GeneralContext";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
// Template Page
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import ListHeader from "@/components/general-components/ListHeader";
// Interfaces
import { IEntity } from "../interfaces/entity.interface";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";
import { ApiError } from "@/general-interfaces/api.interface";

interface ItemsProps {
  item: IEntity;
  index: number;
  entity: IDefaultEntity;
  setFormData: (data: IEntity) => void;
  setOpenForm: (open: boolean) => void;
}

const ExamesItem = ({ item, index, entity, setFormData, setOpenForm }: ItemsProps) => {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const { showLoader, hideLoader } = useLoader();

  // Mutation para inativar
  const { mutate: deactivate } = useMutation({
    mutationFn: (id: number) => {
      showLoader(`Inativando ${entity.name}...`);
      return patch<IEntity>('exames', `inactive/${id}`);
    },
    onSuccess: () => {
      hideLoader();
      toast({
        title: `${entity.name} inativado!`,
        description: `${entity.name} inativado com sucesso.`,
        variant: "success",
      })
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
    },
    onError: (error: unknown) => {
      hideLoader();
      toast({
        title: `Erro ao inativar ${entity.name}`,
        description: error instanceof Error 
          ? error.message 
          : typeof error === 'object' && error !== null && 'response' in error 
            ? ((error as ApiError).response?.data?.message || `Erro ao inativar ${entity.name}`)
            : `Erro ao inativar ${entity.name}`,
        variant: "destructive",
      })
    }
  });

  // Mutation para ativar
  const { mutate: activate } = useMutation({
    mutationFn: (id: number) => {
      showLoader(`Ativando ${entity.name}...`);
      return patch<IEntity>('exames', `active/${id}`);
    },
    onSuccess: () => {
      hideLoader();
      toast({
        title: `${entity.name} reativado!`,
        description: `${entity.name} foi reativado com sucesso.`,
        variant: "success",
      })
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
    },
    onError: (error: unknown) => {
      hideLoader();
      toast({
        title: `Erro ao reativar ${entity.name}`,
        description: error instanceof Error 
          ? error.message 
          : typeof error === 'object' && error !== null && 'response' in error 
            ? ((error as ApiError).response?.data?.message || `Erro ao reativar ${entity.name}`)
            : `Erro ao reativar ${entity.name}`,
        variant: "destructive",
      })
    }
  });

  const handleConfirmAction = (actionType: "activate" | "deactivate") => {
    if (!item.id) return;

    if (actionType === "activate") {
      activate(item.id);
    } else {
      deactivate(item.id);
    }
  };

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return "Não informado";
    return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  // Calcula os dados do exame
  const getExamData = () => {
    if (!item.examResponses || !Array.isArray(item.examResponses)) return null;
    
    const totalQuestions = item.examResponses.length;
    const correctAnswers = item.examResponses.filter(response => 
      response.options?.some(opt => opt.isSelected && opt.isCorrect)
    ).length;
    const score = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 10 : 0;
    
    return {
      totalQuestions,
      correctAnswers,
      score
    };
  };

  const examData = getExamData();

  return (
    <>
      {/* Renderiza o Header apenas no primeiro item */}
      <ListHeader show={index === 0}>
        <div className="w-3/12">Curso</div>
        <div className="w-3/12">Turma</div>
        <div className="w-3/12">Nota / Acertos</div>
        <div className="w-2/12">Resultado</div>
        <div className="w-1/12">Ações</div>
      </ListHeader>

      {/* Conteúdo do item */}
      <div className={`${index % 2 === 0 ? "bg-background" : "bg-background/50"} shadow-sm rounded relative gap-2 lg:gap-0 flex flex-col lg:flex-row lg:items-center justify-between p-4 w-full border-b`}>
        
        {/* Curso com Data */}
        <div className="w-full lg:w-3/12 md:pr-2">
          <p className="text-[10px] text-muted-foreground mb-1">
            {formatDate(item.createdAt)}
          </p>
          <p className="lg:hidden text-sm font-medium text-gray-800 dark:text-gray-300">Curso: </p>
          <p className="text-sm font-medium">
            {item.course?.name || "Não informado"}
          </p>
        </div>

        {/* Turma com ID */}
        <div className="w-full lg:w-3/12 md:pr-2">
          <p className="lg:hidden text-sm font-medium text-gray-800 dark:text-gray-300">Turma: </p>
          <p className="text-sm text-muted-foreground">
            {item.class?.name || "Não informado"}
            {item.classId && (
              <span className="text-xs text-muted-foreground ml-1">
                (ID: {item.classId})
              </span>
            )}
          </p>
        </div>

        {/* Nota e Acertos juntos */}
        <div className="w-full lg:w-3/12 md:pr-2">
          <p className="lg:hidden text-sm font-medium text-gray-800 dark:text-gray-300">Nota / Acertos: </p>
          <div className="flex items-center gap-3">
            <p className={`text-lg font-bold ${
              examData && examData.score >= 6 ? 'text-green-600' : 'text-red-600'
            }`}>
              {examData ? examData.score.toFixed(1) : "-"}
            </p>
            <span className="text-sm text-muted-foreground">
              {examData ? `(${examData.correctAnswers}/${examData.totalQuestions})` : ""}
            </span>
          </div>
        </div>

        {/* Resultado */}
        <div className="lg:w-2/12 flex items-baseline gap-2 md:pr-2">
          <p className="lg:hidden text-sm font-medium text-gray-800 dark:text-gray-300">Resultado: </p>
          <Badge variant={item.result ? "success" : "destructive"}>
            {item.result ? "Aprovado" : "Reprovado"}
          </Badge>
        </div>

        {/* Ações */}
        <div className="absolute top-2 right-2 lg:static lg:w-1/12">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="h-8 w-8 rounded-full p-0 text-gray-700"
                variant="outline"
                size="sm">
                  <Icon name="ellipsis-vertical" className="text-foreground dark:text-primary w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>

              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <Button 
                  variant="ghost" 
                  className="flex justify-start gap-2 p-0 items-baseline w-full h-fit"
                  onClick={() => {
                    setFormData(item);
                    setOpenForm(true);
                  }}
                >
                  <Icon name="eye" className="w-3 h-3" /> 
                  <p>Ver Detalhes</p>
                </Button>
              </DropdownMenuItem>
              
              {
                !item.inactiveAt ? (
                  can(`inactive_${entity.ability}`) && (
                      <DropdownMenuItem className="p-0" onSelect={(e) => e.preventDefault()}>
                        <ConfirmDialog
                          title={`Inativar exame?`}
                          description={`Ao prosseguir, este exame será inativado.`}
                          onConfirm={() => handleConfirmAction("deactivate")}
                          titleBttn="Inativar"
                          iconBttn="power-off"
                        />
                      </DropdownMenuItem>
                  )
                ) : (
                  can(`activate_${entity.ability}`) && (	
                    <DropdownMenuItem className="p-0" onSelect={(e) => e.preventDefault()}>
                      <ConfirmDialog
                        title={`Reativar exame?`}
                        description={`Ao prosseguir, este exame será reativado.`}
                        onConfirm={() => handleConfirmAction("activate")}
                        titleBttn="Reativar"
                        iconBttn="power"
                      />
                    </DropdownMenuItem>
                  )
                )
              }
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </>
  )
};

export default ExamesItem;