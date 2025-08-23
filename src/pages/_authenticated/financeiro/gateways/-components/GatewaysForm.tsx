import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { post, put } from "@/services/api";
import { useLoader } from "@/context/GeneralContext";
import { toast } from "@/hooks/use-toast";
// Componentes UI
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
// Interfaces
import { ICompanyGateway, ICompanyGatewayForm } from "../-interfaces/entity.interface";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";

interface FormProps {
  formData: ICompanyGateway | null;
  setOpenForm: (open: boolean) => void;
  entity: IDefaultEntity;
}

const GatewaysForm: React.FC<FormProps> = ({ formData, setOpenForm, entity }) => {
  const queryClient = useQueryClient();
  const { showLoader, hideLoader } = useLoader();
  
  const [form, setForm] = useState<ICompanyGatewayForm>({
    gateway: 'asaas',
    token: '',
    active: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Carregar dados do formulário quando editar
  useEffect(() => {
    if (formData) {
      setForm({
        gateway: formData.gateway,
        token: formData.payload?.token || '',
        active: formData.active,
      });
    } else {
      setForm({
        gateway: 'asaas',
        token: '',
        active: true,
      });
    }
    setErrors({});
  }, [formData]);

  const handleChange = (name: string, value: string | number | boolean | null) => {
    setForm(prev => ({ ...prev, [name]: value }));
    // Limpar erro do campo ao modificar
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!form.gateway) {
      newErrors.gateway = 'Gateway é obrigatório';
    }
    
    if (!form.token || form.token.trim() === '') {
      newErrors.token = 'Token é obrigatório';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Mutation para criar
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return post(entity.model, '', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
      toast({
        title: "Sucesso!",
        description: `${entity.name} cadastrado com sucesso.`,
        variant: "success",
      });
      setOpenForm(false);
      hideLoader();
    },
    onError: (error: any) => {
      hideLoader();
      toast({
        title: "Erro!",
        description: error?.response?.data?.message || `Erro ao cadastrar ${entity.name}.`,
        variant: "destructive",
      });
    },
  });

  // Mutation para atualizar
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return put(entity.model, formData!.id.toString(), data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
      toast({
        title: "Sucesso!",
        description: `${entity.name} atualizado com sucesso.`,
        variant: "success",
      });
      setOpenForm(false);
      hideLoader();
    },
    onError: (error: any) => {
      hideLoader();
      toast({
        title: "Erro!",
        description: error?.response?.data?.message || `Erro ao atualizar ${entity.name}.`,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    showLoader('Processando...');
    
    // Preparar dados para envio (salvando token dentro do payload como JSON string)
    const dataToSend = {
      gateway: form.gateway,
      payload: JSON.stringify({
        token: form.token
      }),
      active: form.active
    };

    if (formData) {
      updateMutation.mutate(dataToSend);
    } else {
      createMutation.mutate(dataToSend);
    }
  };

  // Opções de gateways disponíveis
  const gatewayOptions = [
    { label: 'Asaas', value: 'asaas' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Gateway */}
      <div className="space-y-2">
        <Label htmlFor="gateway">
          Gateway de Pagamento <span className="text-destructive">*</span>
        </Label>
        <Select
          name="gateway"
          state={form.gateway}
          onChange={(name, value) => handleChange(name, value as string)}
          placeholder="Selecione o gateway"
          options={gatewayOptions}
          label="label"
          value="value"
          disabled={!!formData} // Não permite alterar gateway ao editar
        />
        {errors.gateway && (
          <p className="text-sm text-destructive">{errors.gateway}</p>
        )}
      </div>

      {/* Token */}
      <div className="space-y-2">
        <Label htmlFor="token">
          Token de Integração <span className="text-destructive">*</span>
        </Label>
        <Input
          id="token"
          type="password"
          value={form.token}
          onChange={(e) => handleChange('token', e.target.value)}
          placeholder="Digite o token de integração"
        />
        {errors.token && (
          <p className="text-sm text-destructive">{errors.token}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Token de autenticação fornecido pelo gateway de pagamento
        </p>
      </div>

      {/* Status Ativo */}
      <div className="flex items-center justify-between space-x-2">
        <div className="space-y-0.5">
          <Label htmlFor="active">Status</Label>
          <p className="text-sm text-muted-foreground">
            Define se o gateway está ativo para processar pagamentos
          </p>
        </div>
        <Switch
          id="active"
          checked={form.active}
          onCheckedChange={(checked) => handleChange('active', checked)}
        />
      </div>

      {/* Botões */}
      <div className="flex gap-2 pt-4">
        <Button 
          type="submit" 
          className="flex-1"
          disabled={createMutation.isPending || updateMutation.isPending}
        >
          {formData ? 'Atualizar' : 'Cadastrar'}
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          className="flex-1"
          onClick={() => setOpenForm(false)}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
};

export default GatewaysForm;