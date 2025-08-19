import React, { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { put } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { useLoader } from "@/context/GeneralContext";
import CalendarPicker from "@/components/general-components/Calendar";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ICertificate } from "../-interfaces/entity.interface";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";
import { ApiError } from "@/general-interfaces/api.interface";
import { z } from "zod";
import { HelpCircle } from "lucide-react";

interface FormProps {
  formData?: ICertificate;
  openSheet: (open: boolean) => void;
  entity: IDefaultEntity;
}

const Form = ({ formData, openSheet, entity }: FormProps) => {
  const queryClient = useQueryClient();
  const { showLoader, hideLoader } = useLoader();

  // Schema de validação
  const Schema = z.object({
    expirationDate: z.string().optional().nullable(),
    showOnWebsiteConsent: z.boolean(),
  });

  type FormData = z.infer<typeof Schema>;

  const [dataForm, setDataForm] = useState<FormData>({
    expirationDate: formData?.expirationDate ? String(formData.expirationDate) : null,
    showOnWebsiteConsent: formData?.showOnWebsiteConsent || false,
  });

  const initialFormRef = useRef(dataForm);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (formData) {
      setDataForm({
        expirationDate: formData.expirationDate ? String(formData.expirationDate) : null,
        showOnWebsiteConsent: formData.showOnWebsiteConsent || false,
      });
    }
  }, [formData]);

  const { mutate: updateCertificate, isPending: isPendingUpdate } = useMutation({
    mutationFn: (values: FormData) => {
      showLoader(`Atualizando ${entity.name}...`);
      const updatedItem: any = {
        showOnWebsiteConsent: values.showOnWebsiteConsent,
        expirationDate: values.expirationDate || null,
      };
      return put<ICertificate>(entity.model, `${formData?.id}`, updatedItem);
    },
    onSuccess: () => {
      hideLoader();
      toast({
        title: `${entity.name} atualizado!`,
        description: `${entity.name} atualizado com sucesso.`,
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
      setDataForm(initialFormRef.current);
      openSheet(false);
    },
    onError: (error: ApiError) => {
      hideLoader();
      toast({
        title: `Erro ao atualizar ${entity.name}`,
        description: error.response?.data?.message || "Erro desconhecido.",
        variant: "destructive",
      });
    },
  });

  const handleChange = (name: string, value: string | boolean | null) => {
    setDataForm((prev) => ({ ...prev, [name]: value }));
    // Limpar erro do campo ao alterar
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = Schema.safeParse(dataForm);
    
    if (!result.success) {
      const newErrors: { [key: string]: string } = {};
      result.error.errors.forEach((error) => {
        const path = error.path.join('.');
        if (path) {
          newErrors[path] = error.message;
        }
      });
      setErrors(newErrors);
      return;
    }

    if (formData) {
      updateCertificate(dataForm);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full mt-4">
      {/* Informações Somente Leitura */}
      {formData && (
        <div className="p-4 bg-muted/30 border border-border/50 rounded-lg space-y-2">
          <h3 className="text-sm font-semibold mb-2">Informações do Certificado</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Aluno:</span>
              <span className="font-medium">{formData.trainee?.name || "Não informado"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Curso:</span>
              <span className="font-medium">{formData.course?.name || "Não informado"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Turma:</span>
              <span className="font-medium">{formData.class?.name || "Não informado"}</span>
            </div>
          </div>
        </div>
      )}

      {/* Data de Validade */}
      <div>
        <Label htmlFor="expirationDate">Data de Validade</Label>
        <p className="text-xs text-muted-foreground font-medium mb-2">
          Define até quando o certificado será válido
        </p>
        <CalendarPicker
          mode="natural"
          name="expirationDate"
          value={dataForm.expirationDate}
          onValueChange={(name, value) => handleChange(name, value)}
          formField="expirationDate"
          placeholder="DD/MM/AAAA"
          className="mt-1"
          fromYear={new Date().getFullYear() - 1}
          toYear={new Date().getFullYear() + 20}
        />
        {errors.expirationDate && (
          <p className="text-red-500 text-sm mt-1">{errors.expirationDate}</p>
        )}
      </div>

      {/* Exibir no Site */}
      <div className="p-4 bg-muted/30 border border-border/50 rounded-lg">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <Label htmlFor="showOnWebsiteConsent" className="cursor-pointer flex items-center gap-2">
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
              Exibir na Página de Profissionais
            </Label>
            <p className="text-xs text-muted-foreground mt-1">
              Permite que o certificado seja exibido publicamente na página de Profissionais Certificados
            </p>
          </div>
          <Switch
            id="showOnWebsiteConsent"
            name="showOnWebsiteConsent"
            checked={dataForm.showOnWebsiteConsent}
            onCheckedChange={(checked) => handleChange('showOnWebsiteConsent', checked)}
          />
        </div>
        
        {dataForm.showOnWebsiteConsent && (
          <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: '#DBEAFE' }}>
            <p className="text-xs font-medium mb-1" style={{ color: '#1E40AF' }}>
              Benefícios da exibição pública:
            </p>
            <ul className="text-xs space-y-1 ml-4" style={{ color: '#1E40AF' }}>
              <li>• Maior visibilidade profissional</li>
              <li>• Comprovação pública da qualificação</li>
              <li>• Possibilidade de ser contactado para oportunidades</li>
            </ul>
          </div>
        )}
      </div>

      {/* Botão de Submit */}
      <Button
        type="submit"
        className="w-full my-4"
        disabled={isPendingUpdate}
      >
        {isPendingUpdate
          ? "Atualizando..."
          : `Atualizar ${entity.name}`}
      </Button>
    </form>
  );
};

export default Form;