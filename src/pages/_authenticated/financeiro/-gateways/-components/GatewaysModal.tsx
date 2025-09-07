import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { post, put } from "@/services/api";
import { useLoader } from "@/context/GeneralContext";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import Input from "@/components/general-components/Input";
import {
  ICompanyGateway,
  ICompanyGatewayForm,
} from "../-interfaces/entity.interface";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";

interface GatewaysModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: ICompanyGateway | null;
  selectedGateway: string | null;
  entity: IDefaultEntity;
}

const GatewaysModal: React.FC<GatewaysModalProps> = ({
  open,
  onOpenChange,
  formData,
  selectedGateway,
  entity,
}) => {
  const queryClient = useQueryClient();
  const { showLoader, hideLoader } = useLoader();

  const [form, setForm] = useState<ICompanyGatewayForm>({
    gateway: (selectedGateway as any) || "asaas",
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
    } else if (selectedGateway) {
      setForm({
        gateway: selectedGateway as any,
        token: "",
        active: true,
      });
    }
    setErrors({});
  }, [formData, selectedGateway]);

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
      newErrors.token = "Token é obrigatório";
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
        description: `Gateway conectado com sucesso.`,
        variant: "success",
      });
      onOpenChange(false);
      hideLoader();
    },
    onError: (error: any) => {
      hideLoader();
      toast({
        title: "Erro!",
        description:
          error?.response?.data?.message || `Erro ao conectar gateway.`,
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
        description: `Gateway atualizado com sucesso.`,
        variant: "success",
      });
      onOpenChange(false);
      hideLoader();
    },
    onError: (error: any) => {
      hideLoader();
      toast({
        title: "Erro!",
        description:
          error?.response?.data?.message || `Erro ao atualizar gateway.`,
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
      gateway: form.gateway,
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

  const getGatewayName = (gateway: string) => {
    const names: Record<string, string> = {
      asaas: "Asaas",
      stripe: "Stripe",
      mercadopago: "Mercado Pago",
      pagarme: "PagarMe",
    };
    return names[gateway] || gateway;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {formData
              ? `Editar ${getGatewayName(form.gateway)}`
              : `Conectar ${getGatewayName(form.gateway)}`}
          </DialogTitle>
          <DialogDescription>
            {formData
              ? `Atualize as configurações do gateway de pagamento.`
              : `Configure as credenciais para conectar ao ${getGatewayName(form.gateway)}.`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Token */}
          <div className="space-y-2">
            <Label htmlFor="token">
              Token de Integração <span className="text-destructive">*</span>
            </Label>
            <Input
              id="token"
              type="password"
              value={form.token}
              onChange={(e) => handleChange("token", e.target.value)}
              placeholder="Digite o token de integração"
            />
            {errors.token && (
              <p className="text-sm text-destructive">{errors.token}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Token de autenticação fornecido pelo{" "}
              {getGatewayName(form.gateway)}
            </p>
          </div>

          {/* Status Ativo - apenas ao editar */}
          {formData && (
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5">
                <Label htmlFor="active">Gateway Ativo</Label>
                <p className="text-sm text-muted-foreground">
                  Define se o gateway está ativo para processar pagamentos
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
              {formData ? "Salvar Alterações" : "Conectar Gateway"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default GatewaysModal;
