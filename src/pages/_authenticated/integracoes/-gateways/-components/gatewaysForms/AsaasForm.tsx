import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { post, put } from "@/services/api";
import { useLoader } from "@/context/GeneralContext";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import Input from "@/components/general-components/Input";
import {
  ICompanyGateway,
  ICompanyGatewayForm,
} from "../../-interfaces/entity.interface";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";

interface AsaasFormProps {
  formData: ICompanyGateway | null;
  entity: IDefaultEntity;
  onClose: () => void;
}

const AsaasForm: React.FC<AsaasFormProps> = ({
  formData,
  entity,
  onClose,
}) => {
  const queryClient = useQueryClient();
  const { showLoader, hideLoader } = useLoader();

  const [form, setForm] = useState<ICompanyGatewayForm>({
    gateway: "asaas",
    token: "",
    active: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (formData) {
      setForm({
        gateway: formData.gateway,
        token: formData.payload?.token || "",
        active: formData.active,
      });
    } else {
      setForm({
        gateway: "asaas",
        token: "",
        active: true,
      });
    }
    setErrors({});
  }, [formData]);

  const handleChange = (
    name: string,
    value: string | number | boolean | null,
  ) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!form.token || form.token.trim() === "") {
      newErrors.token = "Token de API é obrigatório";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return post(entity.model, "", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
      toast({
        title: "Sucesso!",
        description: "Asaas conectado com sucesso.",
        variant: "success",
      });
      onClose();
      hideLoader();
    },
    onError: (error: any) => {
      hideLoader();
      toast({
        title: "Erro!",
        description:
          error?.response?.data?.message || "Erro ao conectar Asaas.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return put(entity.model, formData!.id.toString(), data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
      toast({
        title: "Sucesso!",
        description: "Configurações do Asaas atualizadas com sucesso.",
        variant: "success",
      });
      onClose();
      hideLoader();
    },
    onError: (error: any) => {
      hideLoader();
      toast({
        title: "Erro!",
        description:
          error?.response?.data?.message || "Erro ao atualizar configurações do Asaas.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    showLoader("Processando...");

    const dataToSend = {
      gateway: "asaas",
      payload: JSON.stringify({
        token: form.token,
      }),
      active: form.active,
    };

    if (formData) {
      updateMutation.mutate(dataToSend);
    } else {
      createMutation.mutate(dataToSend);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Informações sobre o Asaas */}
      <div className="bg-muted/50 p-4 rounded-lg space-y-2">
        <h4 className="text-sm font-medium">Sobre o Asaas</h4>
        <p className="text-xs text-muted-foreground">
          O Asaas é uma plataforma completa de pagamentos que oferece boleto,
          cartão de crédito, PIX e outras formas de pagamento. Ideal para
          empresas de todos os tamanhos.
        </p>
        <a
          href="https://www.asaas.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline inline-flex items-center gap-1"
        >
          Criar conta no Asaas
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-external-link"
          >
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" x2="21" y1="14" y2="3" />
          </svg>
        </a>
      </div>

      {/* Token de API */}
      <div className="space-y-2">
        <Label htmlFor="token">
          Token de API <span className="text-destructive">*</span>
        </Label>
        <Input
          id="token"
          type="password"
          value={form.token}
          onChange={(e) => handleChange("token", e.target.value)}
          placeholder="Digite o token de API do Asaas"
        />
        {errors.token && (
          <p className="text-sm text-destructive">{errors.token}</p>
        )}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>Para obter seu token de API:</p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Acesse sua conta no Asaas</li>
            <li>Vá em Configurações → Integrações</li>
            <li>Gere ou copie seu token de API</li>
          </ol>
        </div>
      </div>

      {/* Status Ativo - apenas ao editar */}
      {formData && (
        <div className="flex items-center justify-between space-x-2">
          <div className="space-y-0.5">
            <Label htmlFor="active">Gateway Ativo</Label>
            <p className="text-sm text-muted-foreground">
              Define se o Asaas está ativo para processar pagamentos
            </p>
          </div>
          <Switch
            id="active"
            checked={form.active}
            onCheckedChange={(checked) => handleChange("active", checked)}
          />
        </div>
      )}

      {/* Botões */}
      <div className="flex gap-2 pt-4">
        <Button
          type="submit"
          className="flex-1"
          disabled={createMutation.isPending || updateMutation.isPending}
        >
          {formData ? "Salvar Alterações" : "Conectar Asaas"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onClose}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
};

export default AsaasForm;
