import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import Icon from '@/components/general-components/Icon';
import useVerify from '@/hooks/use-verify';
import { IEntity } from '../-interfaces/entity.interface';
import { IDefaultEntity } from '@/general-interfaces/defaultEntity.interface';
import { KanbanColumn } from '@/components/general-components/KanbanView';

interface SubscriptionCardProps {
  item: IEntity;
  column?: KanbanColumn;
  entity: IDefaultEntity;
  setFormData: (data: IEntity) => void;
  setOpenForm: (open: boolean) => void;
  modalPopover?: boolean;
}

const SubscriptionCard = ({ 
  item, 
  entity,
  setFormData, 
  setOpenForm,
  modalPopover = false
}: SubscriptionCardProps) => {
  const { can } = useVerify();

  return (
    <div className="p-3 space-y-3">
      {/* Header com Avatar e Nome */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarImage src={undefined} alt={item.name} />
            <AvatarFallback className="text-xs">
              {item.name?.[0] || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 overflow-hidden">
            <p className="font-medium text-sm truncate">
              {item.name}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {item.cpf || 'CPF não informado'}
            </p>
          </div>
        </div>
        
        {/* Menu de Ações */}
        {can(`update_${entity.ability}`) && (
          <DropdownMenu modal={modalPopover}>
            <DropdownMenuTrigger asChild>
              <Button
                className="h-6 w-6 p-0"
                variant="ghost"
                size="sm"
              >
                <Icon name="ellipsis-vertical" className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-[100000]">
              <DropdownMenuItem 
                onSelect={() => {
                  setFormData(item);
                  setOpenForm(true);
                }}
              >
                <Icon name="edit-3" className="w-3 h-3 mr-2" /> 
                <span className="text-sm">Editar</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Informações de Contato */}
      <div className="space-y-1">
        {item.occupation && (
          <div className="flex items-center gap-2">
            <Icon name="briefcase" className="w-3 h-3 text-muted-foreground" />
            <p className="text-xs text-muted-foreground truncate">
              {item.occupation}
            </p>
          </div>
        )}
        {item.phone && (
          <div className="flex items-center gap-2">
            <Icon name="phone" className="w-3 h-3 text-muted-foreground" />
            <p className="text-xs text-muted-foreground truncate">
              {item.phone}
            </p>
          </div>
        )}
        {item.email && (
          <div className="flex items-center gap-2">
            <Icon name="mail" className="w-3 h-3 text-muted-foreground" />
            <p className="text-xs text-muted-foreground truncate">
              {item.email}
            </p>
          </div>
        )}
      </div>

      {/* Informações da Turma/Empresa */}
      {(item.class?.name || item.company?.name) && (
        <div className="pt-2 border-t space-y-1">
          {item.class?.name && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Turma:</span> {item.class.name}
            </p>
          )}
          {item.company?.name && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Empresa:</span> {item.company.name}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default SubscriptionCard;