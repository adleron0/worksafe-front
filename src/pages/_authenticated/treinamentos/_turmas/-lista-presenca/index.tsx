import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { get, post } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { useLoader } from "@/context/GeneralContext";
import useVerify from "@/hooks/use-verify";
// UI Components
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import type { ColumnDef } from "@/components/ui/kibo-ui/table";
import {
  TableBody,
  TableCell,
  TableColumnHeader,
  TableHead,
  TableHeader,
  TableHeaderGroup,
  TableProvider,
  TableRow,
} from "@/components/ui/kibo-ui/table";
// Interfaces
import { IAttendanceRow, ISubscription, IAttendance } from "./-interfaces/entity.interface";
import { ApiError } from "@/general-interfaces/api.interface";

interface ListaPresencaProps {
  classId: number;
  className?: string;
  daysDuration?: number;
}

interface SubscriptionsResponse {
  rows: ISubscription[];
  total: number;
}

interface AttendanceResponse {
  rows: IAttendance[];
  total: number;
}

const ListaPresenca = ({ classId, daysDuration = 1 }: ListaPresencaProps) => {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  useLoader();
  const [attendanceData, setAttendanceData] = useState<Map<string, boolean>>(new Map());
  const [loadingStates, setLoadingStates] = useState<Set<string>>(new Set());

  // Buscar inscrições confirmadas
  const { 
    data: subscriptions, 
    isLoading: isLoadingSubscriptions,
    isError: isErrorSubscriptions,
    error: errorSubscriptions
  } = useQuery<SubscriptionsResponse | undefined, ApiError>({
    queryKey: [`listSubscriptionsPresenca`, classId],
    queryFn: async () => {
      const params = [
        { key: 'classId', value: classId },
        { key: 'subscribeStatus', value: 'confirmed' },
        { key: 'show', value: 'trainee' },
        { key: 'limit', value: 999 },
        { key: 'order-id', value: 'asc' },
      ];
      return get('subscription', '', params);
    },
  });

  // Buscar lista de presença existente
  const { 
    data: attendanceList,
    isLoading: isLoadingAttendance,
  } = useQuery<AttendanceResponse | undefined, ApiError>({
    queryKey: [`listAttendance`, classId],
    queryFn: async () => {
      const params = [
        { key: 'classId', value: classId },
        { key: 'limit', value: 999 },
      ];
      return get('attendance-list', '', params);
    },
    enabled: !!subscriptions && subscriptions.rows.length > 0,
  });

  // Mutation para atualizar presença
  const { mutate: updateAttendance } = useMutation({
    mutationFn: (data: { classId: number; traineeId: number; day: number; isPresent: boolean }) => {
      const key = `${data.traineeId}-${data.day}`;
      setLoadingStates(prev => new Set(prev).add(key));
      // Enviar para o backend com IsPresent (maiúsculo)
      return post('attendance-list', 'upsert', {
        classId: data.classId,
        traineeId: data.traineeId,
        day: data.day,
        IsPresent: data.isPresent
      });
    },
    onSuccess: (_, variables) => {
      const key = `${variables.traineeId}-${variables.day}`;
      setAttendanceData(prev => new Map(prev).set(key, variables.isPresent));
      setLoadingStates(prev => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
      
      toast({
        title: "Presença atualizada",
        description: `Presença ${variables.isPresent ? 'marcada' : 'desmarcada'} com sucesso.`,
        variant: "success",
      });
      
      queryClient.invalidateQueries({ queryKey: [`listAttendance`, classId] });
    },
    onError: (error: ApiError, variables) => {
      const key = `${variables.traineeId}-${variables.day}`;
      setLoadingStates(prev => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
      
      toast({
        title: "Erro ao atualizar presença",
        description: error.response?.data?.message || "Erro desconhecido.",
        variant: "destructive",
      });
    },
  });

  // Atualizar estado local quando os dados de presença chegarem
  useEffect(() => {
    if (attendanceList?.rows) {
      const newMap = new Map<string, boolean>();
      attendanceList.rows.forEach((attendance: any) => {
        const key = `${attendance.traineeId}-${attendance.day}`;
        // Backend retorna IsPresent com I maiúsculo
        newMap.set(key, attendance.IsPresent);
      });
      setAttendanceData(newMap);
    }
  }, [attendanceList]);

  // Função para lidar com mudança de checkbox
  const handleAttendanceChange = (traineeId: number, day: number, checked: boolean) => {
    updateAttendance({
      classId,
      traineeId,
      day,
      isPresent: checked,
    });
  };

  // Preparar dados para a tabela
  const tableData: IAttendanceRow[] = subscriptions?.rows.map(subscription => {
    const attendance: { [day: number]: boolean } = {};
    
    for (let day = 1; day <= daysDuration; day++) {
      const key = `${subscription.traineeId}-${day}`;
      attendance[day] = attendanceData.get(key) || false;
    }

    return {
      trainee: subscription.trainee!,
      subscription,
      attendance,
    };
  }) || [];

  // Definir colunas da tabela
  const columns: ColumnDef<IAttendanceRow>[] = [
    {
      id: 'trainee',
      accessorKey: 'trainee.name',
      header: ({ column }) => (
        <TableColumnHeader column={column} title="Aluno" />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={row.original.trainee.imageUrl} />
            <AvatarFallback className="text-xs">
              {row.original.trainee.name?.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm">{row.original.trainee.name}</p>
            <p className="text-xs text-muted-foreground">{row.original.trainee.email}</p>
          </div>
        </div>
      ),
    },
    {
      id: 'cpf',
      accessorKey: 'trainee.cpf',
      header: ({ column }) => (
        <TableColumnHeader column={column} title="CPF" />
      ),
      cell: ({ row }) => (
        <span className="text-sm">{row.original.trainee.cpf || '-'}</span>
      ),
    },
    // Adicionar colunas dinamicamente para cada dia
    ...Array.from({ length: daysDuration }, (_, i) => i + 1).map(day => ({
      id: `day-${day}`,
      accessorKey: `attendance.${day}`,
      header: ({ column }: any) => (
        <TableColumnHeader column={column} title={`Dia ${day}`} className="text-center" />
      ),
      cell: ({ row }: any) => {
        const checkboxKey = `${row.original.trainee.id}-${day}`;
        const isLoading = loadingStates.has(checkboxKey);
        
        return (
          <div className="flex justify-center items-center gap-2">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <Checkbox
                checked={row.original.attendance[day]}
                onCheckedChange={(checked) => 
                  handleAttendanceChange(
                    row.original.trainee.id, 
                    day, 
                    checked as boolean
                  )
                }
                disabled={!can('update_classes')}
                className="cursor-pointer"
              />
            )}
          </div>
        );
      },
    })),
  ];

  // Skeletons para loading
  const LoadingSkeleton = () => (
    <div className="space-y-2">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border rounded">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-[200px]" />
            <Skeleton className="h-3 w-[150px]" />
          </div>
          {Array.from({ length: daysDuration }, (_, j) => (
            <Skeleton key={j} className="h-5 w-5" />
          ))}
        </div>
      ))}
    </div>
  );

  if (!can('view_classes')) {
    return (
      <div className="w-full flex justify-center items-center font-medium text-destructive py-4 rounded border border-destructive">
        <p>Sem permissão para visualizar lista de presença</p>
      </div>
    );
  }

  if (isLoadingSubscriptions || isLoadingAttendance) {
    return <LoadingSkeleton />;
  }

  if (isErrorSubscriptions) {
    return (
      <div className="w-full flex justify-center items-center font-medium text-destructive py-4 rounded border border-destructive">
        <p>Erro: {errorSubscriptions?.response?.data?.message || "Erro ao carregar inscrições"}</p>
      </div>
    );
  }

  if (!subscriptions?.rows || subscriptions.rows.length === 0) {
    return (
      <div className="w-full flex justify-center items-center font-medium text-primary py-8 rounded border border-primary">
        <p>Nenhuma inscrição confirmada encontrada para esta turma</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        {/* <h2 className="text-lg font-semibold">Lista de Presença</h2>
        {className && (
          <p className="text-sm text-muted-foreground">Turma: {className}</p>
        )} */}
        <p className="text-sm text-muted-foreground">
          Total de alunos confirmados: {subscriptions.rows.length}
        </p>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <TableProvider columns={columns} data={tableData}>
          <TableHeader>
            {({ headerGroup }) => (
              <TableHeaderGroup headerGroup={headerGroup} key={headerGroup.id}>
                {({ header }) => <TableHead header={header} key={header.id} />}
              </TableHeaderGroup>
            )}
          </TableHeader>
          <TableBody>
            {({ row }) => (
              <TableRow key={row.id} row={row}>
                {({ cell }) => <TableCell cell={cell} key={cell.id} />}
              </TableRow>
            )}
          </TableBody>
        </TableProvider>
      </div>
    </div>
  );
};

export default ListaPresenca;