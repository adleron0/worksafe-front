import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { post, put, get } from "@/services/api";
import { useLoader } from "@/context/GeneralContext";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import Input from "@/components/general-components/Input";
import NumberInput from "@/components/general-components/Number";
import Select from "@/components/general-components/Select";
import DatePickerInput from "@/components/general-components/Calendar";
import { ICupom, ICupomFormData, DiscountType, CommissionType } from "../-interfaces/entity.interface";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";
import { ApiError } from "@/general-interfaces/api.interface";
import { format } from "date-fns";

interface FormProps {
  formData: ICupom | null;
  setOpenForm: (open: boolean) => void;
  entity: IDefaultEntity;
}

interface Response {
  rows: any[];
  total: number;
}

const CupomForm: React.FC<FormProps> = ({ formData, setOpenForm, entity }) => {
  const queryClient = useQueryClient();
  const { showLoader, hideLoader } = useLoader();

  const [data, setData] = useState<ICupomFormData>({
    code: "",
    description: "",
    sellerId: undefined,
    discountType: 'percentage' as DiscountType,
    discountValue: 0,
    commissionType: 'percentage' as CommissionType,
    commissionValue: undefined,
    minPurchaseValue: undefined,
    maxDiscountValue: undefined,
    usageLimit: undefined,
    usageCount: 0,
    usagePerCustomer: 1,
    validUntil: undefined,
    firstPurchaseOnly: false,
    classId: undefined,
    courseId: undefined,
    active: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isUnlimited, setIsUnlimited] = useState<boolean>(true);

  const { data: sellersData, isLoading: isLoadingSellers } = useQuery<
    Response | undefined,
    ApiError
  >({
    queryKey: [`sellers`],
    queryFn: async () => {
      const params = [
        { key: "limit", value: 'all' },
        { key: "active", value: true },
        { key: "isSeller", value: true },
        { key: "order-name", value: "asc" },
      ];
      return get("user", "", params);
    },
  });

  const { data: courses, isLoading: isLoadingCourses } = useQuery<
    Response | undefined,
    ApiError
  >({
    queryKey: [`listCursos`],
    queryFn: async () => {
      const params = [
        { key: "limit", value: 'all' },
        { key: "active", value: true },
        { key: "order-name", value: "asc" },
      ];
      return get("courses", "", params);
    },
  });

  const { data: classesData, isLoading: isLoadingClasses } = useQuery<
    Response | undefined,
    ApiError
  >({
    queryKey: [`listClasses`, data.courseId],
    queryFn: async () => {
      const params = [
        { key: "limit", value: 'all' },
        { key: "active", value: true },
        { key: "courseId", value: data.courseId },
        { key: "order-name", value: "asc" },
      ];
      return get("classes", "", params);
    },
    enabled: !!data.courseId,
  });

  useEffect(() => {
    if (formData) {
      setData({
        code: formData.code,
        description: formData.description || "",
        sellerId: formData.sellerId,
        discountType: formData.discountType,
        discountValue: formData.discountValue,
        commissionType: formData.commissionType,
        commissionValue: formData.commissionValue,
        minPurchaseValue: formData.minPurchaseValue,
        maxDiscountValue: formData.maxDiscountValue,
        usageLimit: formData.usageLimit,
        usageCount: formData.usageCount,
        usagePerCustomer: formData.usagePerCustomer,
        validUntil: formData.validUntil ?
          (typeof formData.validUntil === 'string' ? formData.validUntil.split('T')[0] : format(formData.validUntil, 'yyyy-MM-dd'))
          : undefined,
        firstPurchaseOnly: formData.firstPurchaseOnly,
        classId: formData.classId,
        courseId: formData.courseId,
        active: formData.active,
      });
      setIsUnlimited(!formData.usageLimit);
    } else {
      setIsUnlimited(true);
    }
  }, [formData]);

  const handleChange = (name: string, value: string | number | boolean | null | string[]) => {
    setErrors(prev => ({ ...prev, [name]: "" }));

    // Handle Select component which returns string or string[]
    if (Array.isArray(value)) {
      // For multiple select, we don't use it in this form
      return;
    }

    // Convert string numbers to actual numbers for numeric fields
    let processedValue: any = value;
    if (typeof value === 'string' && ['sellerId', 'courseId', 'classId', 'usageLimit', 'usagePerCustomer', 'discountValue', 'commissionValue', 'minPurchaseValue', 'maxDiscountValue'].includes(name)) {
      processedValue = value ? Number(value) : undefined;
    }

    if (name === 'courseId' && !value) {
      setData(prev => ({ ...prev, courseId: undefined, classId: undefined }));
    } else if (name === 'sellerId' && !value) {
      setData(prev => ({
        ...prev,
        sellerId: undefined,
        commissionType: undefined,
        commissionValue: undefined
      }));
    } else if (name === 'discountType' && value === 'percentage' && data.discountValue > 100) {
      setData(prev => ({ ...prev, discountType: value as DiscountType, discountValue: 100 }));
    } else {
      setData(prev => ({ ...prev, [name]: processedValue }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!data.code) {
      newErrors.code = "Código é obrigatório";
    }

    if (!data.discountType) {
      newErrors.discountType = "Tipo de desconto é obrigatório";
    }

    if (data.discountType === 'percentage' && data.discountValue > 100) {
      newErrors.discountValue = "Percentual não pode ser maior que 100%";
    }

    if (data.discountValue <= 0) {
      newErrors.discountValue = "Valor do desconto deve ser maior que zero";
    }

    if (data.usagePerCustomer <= 0) {
      newErrors.usagePerCustomer = "Uso por cliente deve ser maior que zero";
    }

    if (data.validUntil) {
      const validDate = new Date(data.validUntil);
      if (validDate < new Date() && !formData) {
        newErrors.validUntil = "Data de validade deve ser futura";
      }
    }

    if (data.sellerId && !data.commissionType) {
      newErrors.commissionType = "Tipo de comissão é obrigatório quando há vendedor";
    }

    if (data.sellerId && data.commissionType && !data.commissionValue) {
      newErrors.commissionValue = "Valor da comissão é obrigatório";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const createMutation = useMutation({
    mutationFn: async (data: ICupomFormData) => {
      showLoader(`Cadastrando ${entity.name}...`);
      return post(entity.model,"", data);
    },
    onSuccess: () => {
      hideLoader();
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
      toast({
        title: `${entity.name} cadastrado`,
        description: `${entity.name} foi cadastrado com sucesso.`,
      });
      setOpenForm(false);
    },
    onError: (error: any) => {
      hideLoader();
      toast({
        title: "Erro ao cadastrar",
        description: error?.response?.data?.message || "Ocorreu um erro ao cadastrar.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ICupomFormData }) => {
      showLoader(`Atualizando ${entity.name}...`);
      return put(entity.model, `${id}`, data);
    },
    onSuccess: () => {
      hideLoader();
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
      toast({
        title: `${entity.name} atualizado`,
        description: `${entity.name} foi atualizado com sucesso.`,
      });
      setOpenForm(false);
    },
    onError: (error: any) => {
      hideLoader();
      toast({
        title: "Erro ao atualizar",
        description: error?.response?.data?.message || "Ocorreu um erro ao atualizar.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const formPayload = {
      ...data,
      discountValue: Number(data.discountValue),
      commissionValue: data.commissionValue ? Number(data.commissionValue) : undefined,
      minPurchaseValue: data.minPurchaseValue ? Number(data.minPurchaseValue) : undefined,
      maxDiscountValue: data.maxDiscountValue ? Number(data.maxDiscountValue) : undefined,
      usageLimit: isUnlimited ? undefined : (data.usageLimit ? Number(data.usageLimit) : undefined),
      usagePerCustomer: Number(data.usagePerCustomer),
    };

    if (formData) {
      updateMutation.mutate({ id: formData.id, data: formPayload });
    } else {
      createMutation.mutate(formPayload);
    }
  };

  const discountTypes = [
    { id: 'percentage', name: 'Porcentagem' },
    { id: 'fixed', name: 'Valor Fixo' },
  ];

  const commissionTypes = [
    { id: 'percentage', name: 'Porcentagem' },
    { id: 'fixed', name: 'Valor Fixo' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Seção 1 - Informações Básicas */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Informações Básicas</h3>

        <div className="space-y-2">
          <Label htmlFor="code">Código *</Label>
          <Input
            id="code"
            name="code"
            value={data.code}
            onValueChange={handleChange}
            placeholder="Digite o código do cupom"
            disabled={!!formData}
          />
          {errors.code && (
            <p className="text-sm text-destructive mt-1">{errors.code}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descrição</Label>
          <Input
            id="description"
            name="description"
            value={data.description}
            onValueChange={handleChange}
            placeholder="Digite uma descrição para o cupom"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="active"
            checked={data.active}
            onCheckedChange={(checked) => handleChange('active', checked)}
          />
          <Label htmlFor="active">Cupom ativo</Label>
        </div>
      </div>

      <Separator />

      {/* Seção 2 - Configuração do Desconto */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Configuração do Desconto</h3>

        <div className="space-y-2">
          <Label htmlFor="discountType">Tipo de Desconto *</Label>
          <Select
            name="discountType"
            options={discountTypes}
            state={data.discountType || "percentage"}
            onChange={handleChange}
            placeholder="Selecione o tipo de desconto"
            value="id"
            label="name"
          />
          {errors.discountType && (
            <p className="text-sm text-destructive mt-1">{errors.discountType}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="discountValue">
            Valor do Desconto * {data.discountType === 'percentage' ? '(%)' : '(R$)'}
          </Label>
          {data.discountType === 'percentage' ? (
            <NumberInput
              name="discountValue"
              value={data.discountValue}
              min={0}
              max={100}
              step={1}
              onValueChange={handleChange}
            />
          ) : (
            <Input
              id="discountValue"
              name="discountValue"
              format="currency"
              value={data.discountValue}
              onValueChange={handleChange}
              placeholder="R$ 0,00"
            />
          )}
          {errors.discountValue && (
            <p className="text-sm text-destructive mt-1">{errors.discountValue}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="minPurchaseValue">Valor Mínimo de Compra (R$)</Label>
          <Input
            id="minPurchaseValue"
            name="minPurchaseValue"
            format="currency"
            value={data.minPurchaseValue || ""}
            onValueChange={handleChange}
            placeholder="R$ 0,00"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="maxDiscountValue">Valor Máximo de Desconto (R$)</Label>
          <Input
            id="maxDiscountValue"
            name="maxDiscountValue"
            format="currency"
            value={data.maxDiscountValue || ""}
            onValueChange={handleChange}
            placeholder="R$ 0,00"
          />
        </div>
      </div>

      <Separator />

      {/* Seção 3 - Vendedor e Comissão */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Vendedor e Comissão</h3>

        <div className="space-y-2">
          <Label htmlFor="sellerId">Vendedor</Label>
          <Select
            name="sellerId"
            options={sellersData?.rows || []}
            state={data.sellerId ? String(data.sellerId) : ""}
            onChange={handleChange}
            isLoading={isLoadingSellers}
            placeholder="Selecione um vendedor"
            value="id"
            label="name"
            clearable
          />
        </div>

        {data.sellerId && (
          <>
            <div className="space-y-2">
              <Label htmlFor="commissionType">Tipo de Comissão *</Label>
              <Select
                name="commissionType"
                options={commissionTypes}
                state={data.commissionType || "percentage"}
                onChange={handleChange}
                placeholder="Selecione o tipo"
                value="id"
                label="name"
              />
              {errors.commissionType && (
                <p className="text-sm text-destructive mt-1">{errors.commissionType}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="commissionValue">
                Valor da Comissão * {data.commissionType === 'percentage' ? '(%)' : '(R$)'}
              </Label>
              {data.commissionType === 'percentage' ? (
                <NumberInput
                  name="commissionValue"
                  value={data.commissionValue || 0}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={handleChange}
                />
              ) : (
                <Input
                  id="commissionValue"
                  name="commissionValue"
                  format="currency"
                  value={data.commissionValue || 0}
                  onValueChange={handleChange}
                  placeholder="R$ 0,00"
                />
              )}
              {errors.commissionValue && (
                <p className="text-sm text-destructive mt-1">{errors.commissionValue}</p>
              )}
            </div>
          </>
        )}
      </div>

      <Separator />

      {/* Seção 4 - Restrições de Uso */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Restrições de Uso</h3>

        <div className="flex items-center space-x-2">
          <Switch
            id="unlimited"
            checked={isUnlimited}
            onCheckedChange={(checked) => {
              setIsUnlimited(checked);
              if (checked) {
                setData(prev => ({ ...prev, usageLimit: undefined }));
              }
            }}
          />
          <Label htmlFor="unlimited">Uso ilimitado</Label>
        </div>

        {!isUnlimited && (
          <div className="space-y-2">
            <Label htmlFor="usageLimit">Limite Total de Uso *</Label>
            <NumberInput
              name="usageLimit"
              value={data.usageLimit || 1}
              min={1}
              onValueChange={handleChange}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="usagePerCustomer">Uso por Cliente *</Label>
          <NumberInput
            name="usagePerCustomer"
            value={data.usagePerCustomer}
            min={1}
            onValueChange={handleChange}
          />
          {errors.usagePerCustomer && (
            <p className="text-sm text-destructive mt-1">{errors.usagePerCustomer}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="validUntil">Válido até</Label>
          <DatePickerInput
            name="validUntil"
            value={data.validUntil ? String(data.validUntil) : ""}
            onValueChange={handleChange}
            placeholder="Sem prazo"
          />
          {errors.validUntil && (
            <p className="text-sm text-destructive mt-1">{errors.validUntil}</p>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="firstPurchaseOnly"
            checked={data.firstPurchaseOnly}
            onCheckedChange={(checked) => handleChange('firstPurchaseOnly', checked)}
          />
          <Label htmlFor="firstPurchaseOnly">Apenas primeira compra</Label>
        </div>
      </div>

      <Separator />

      {/* Seção 5 - Associações */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Associações (Opcional)</h3>

        <div className="space-y-2">
          <Label htmlFor="courseId">Curso</Label>
          <Select
            name="courseId"
            options={courses?.rows || []}
            state={data.courseId ? String(data.courseId) : ""}
            onChange={handleChange}
            isLoading={isLoadingCourses}
            placeholder="Selecione um curso"
            value="id"
            label="name"
            clearable
          />
        </div>

        {data.courseId && (
          <div className="space-y-2">
            <Label htmlFor="classId">Turma</Label>
            <Select
              name="classId"
              options={classesData?.rows || []}
              state={data.classId ? String(data.classId) : ""}
              onChange={handleChange}
              isLoading={isLoadingClasses}
              placeholder="Selecione uma turma"
              value="id"
              label="name"
              clearable
            />
          </div>
        )}
      </div>

      {formData && (
        <>
          <Separator />
          <div className="text-sm text-muted-foreground">
            <p>Uso atual: {data.usageCount} vez(es)</p>
          </div>
        </>
      )}

      <div className="flex gap-2">
        <Button type="submit" className="flex-1">
          {formData ? "Atualizar" : "Cadastrar"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setOpenForm(false)}
          className="flex-1"
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
};

export default CupomForm;