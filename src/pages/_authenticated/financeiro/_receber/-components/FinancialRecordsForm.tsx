import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { get, post, put } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { useLoader } from "@/context/GeneralContext";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import DatePickerInput from "@/components/general-components/Calendar";
import { Textarea } from "@/components/ui/textarea";
import { IFinancialRecord } from "../-interfaces/entity.interface";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";

const formSchema = z.object({
  accrualDate: z.string().min(1, "Data de competência é obrigatória"),
  companyId: z.number().min(1, "Empresa é obrigatória"),
  gateway: z.string().min(1, "Gateway é obrigatório"),
  status: z.string().min(1, "Status é obrigatório"),
  paymentMethod: z.string().min(1, "Método de pagamento é obrigatório"),
  value: z.number().min(0, "Valor deve ser maior que zero"),
  dueDate: z.string().optional(),
  description: z.string().optional(),
  observations: z.string().optional(),
  traineeId: z.number().optional(),
  customerId: z.number().optional(),
  subscriptionId: z.number().optional(),
  couponId: z.number().optional(),
  sellerId: z.number().optional(),
  originalValue: z.number().optional(),
  discount: z.number().optional(),
  commissionPercentage: z.number().optional(),
  commissionValue: z.number().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface FormProps {
  formData: IFinancialRecord | null;
  setOpenForm: (open: boolean) => void;
  entity: IDefaultEntity;
}

const FinancialRecordsForm: React.FC<FormProps> = ({ formData, setOpenForm, entity }) => {
  const { showLoader, hideLoader } = useLoader();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      accrualDate: "",
      companyId: 0,
      gateway: "",
      status: "processing",
      paymentMethod: "",
      value: 0,
      dueDate: "",
      description: "",
      observations: "",
      traineeId: undefined,
      customerId: undefined,
      subscriptionId: undefined,
      couponId: undefined,
      sellerId: undefined,
      originalValue: undefined,
      discount: undefined,
      commissionPercentage: undefined,
      commissionValue: undefined,
    },
  });

  const { data: companies } = useQuery({
    queryKey: ['listCompanies'],
    queryFn: async () => {
      return get('companies', '', [{ key: 'limit', value: 1000 }]);
    },
  });

  const { data: trainees } = useQuery({
    queryKey: ['listTrainees'],
    queryFn: async () => {
      return get('trainees', '', [{ key: 'limit', value: 1000 }]);
    },
  });

  const { data: customers } = useQuery({
    queryKey: ['listCustomers'],
    queryFn: async () => {
      return get('customers', '', [{ key: 'limit', value: 1000 }]);
    },
  });

  const { data: sellers } = useQuery({
    queryKey: ['listSellers'],
    queryFn: async () => {
      return get('users', '', [{ key: 'limit', value: 1000 }, { key: 'role', value: 'seller' }]);
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      showLoader();
      return post(entity.model, data);
    },
    onSuccess: () => {
      hideLoader();
      toast({
        title: "Sucesso",
        description: `${entity.name} criada com sucesso!`,
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
      setOpenForm(false);
      form.reset();
    },
    onError: (error: any) => {
      hideLoader();
      toast({
        title: "Erro",
        description: error.response?.data?.message || `Erro ao criar ${entity.name}`,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      showLoader();
      return put(entity.model, formData!.id.toString(), data);
    },
    onSuccess: () => {
      hideLoader();
      toast({
        title: "Sucesso",
        description: `${entity.name} atualizada com sucesso!`,
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
      setOpenForm(false);
      form.reset();
    },
    onError: (error: any) => {
      hideLoader();
      toast({
        title: "Erro",
        description: error.response?.data?.message || `Erro ao atualizar ${entity.name}`,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (formData) {
      form.reset({
        accrualDate: formData.accrualDate || "",
        companyId: formData.companyId || 0,
        gateway: formData.gateway || "",
        status: formData.status || "processing",
        paymentMethod: formData.paymentMethod || "",
        value: formData.value || 0,
        dueDate: formData.dueDate || "",
        description: formData.description || "",
        observations: formData.observations || "",
        traineeId: formData.traineeId || undefined,
        customerId: formData.customerId || undefined,
        subscriptionId: formData.subscriptionId || undefined,
        couponId: formData.couponId || undefined,
        sellerId: formData.sellerId || undefined,
        originalValue: formData.originalValue || undefined,
        discount: formData.discount || undefined,
        commissionPercentage: formData.commissionPercentage || undefined,
        commissionValue: formData.commissionValue || undefined,
      });
    }
  }, [formData, form]);

  const onSubmit = (data: FormData) => {
    if (formData) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const gatewayOptions = [
    { value: "stripe", label: "Stripe" },
    { value: "mercadopago", label: "Mercado Pago" },
    { value: "pagseguro", label: "PagSeguro" },
    { value: "paypal", label: "PayPal" },
    { value: "manual", label: "Manual" },
  ];

  const statusOptions = [
    { value: "processing", label: "Processando" },
    { value: "waiting", label: "Aguardando" },
    { value: "received", label: "Recebido" },
    { value: "declined", label: "Recusado" },
    { value: "chargeback", label: "Estorno" },
    { value: "cancelled", label: "Cancelado" },
    { value: "overdue", label: "Vencido" },
  ];

  const paymentMethodOptions = [
    { value: "credit_card", label: "Cartão de Crédito" },
    { value: "debit_card", label: "Cartão de Débito" },
    { value: "pix", label: "PIX" },
    { value: "bank_slip", label: "Boleto" },
    { value: "cash", label: "Dinheiro" },
  ];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="accrualDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data de Competência (YYYY-MM)</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="2024-01"
                    pattern="[0-9]{4}-[0-9]{2}"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="companyId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Empresa *</FormLabel>
                <FormControl>
                  <Select
                    name="companyId"
                    value={field.value}
                    onValueChange={(value) => field.onChange(Number(value))}
                    placeholder="Selecione uma empresa"
                    options={companies?.rows?.map((company: any) => ({
                      value: company.id,
                      label: company.name,
                    })) || []}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="gateway"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Gateway *</FormLabel>
                <FormControl>
                  <Select
                    name="gateway"
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Selecione um gateway"
                    options={gatewayOptions}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status *</FormLabel>
                <FormControl>
                  <Select
                    name="status"
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Selecione um status"
                    options={statusOptions}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="paymentMethod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Método de Pagamento *</FormLabel>
                <FormControl>
                  <Select
                    name="paymentMethod"
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Selecione um método"
                    options={paymentMethodOptions}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data de Vencimento</FormLabel>
                <FormControl>
                  <DatePickerInput
                    name="dueDate"
                    value={field.value || ""}
                    onValueChange={(name, value) => field.onChange(value)}
                    placeholder="Selecione uma data"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="traineeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Aluno</FormLabel>
                <FormControl>
                  <Select
                    name="traineeId"
                    value={field.value || ""}
                    onValueChange={(value) => field.onChange(value ? Number(value) : undefined)}
                    placeholder="Selecione um aluno"
                    options={trainees?.rows?.map((trainee: any) => ({
                      value: trainee.id,
                      label: trainee.name,
                    })) || []}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="customerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cliente</FormLabel>
                <FormControl>
                  <Select
                    name="customerId"
                    value={field.value || ""}
                    onValueChange={(value) => field.onChange(value ? Number(value) : undefined)}
                    placeholder="Selecione um cliente"
                    options={customers?.rows?.map((customer: any) => ({
                      value: customer.id,
                      label: customer.name,
                    })) || []}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sellerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vendedor</FormLabel>
                <FormControl>
                  <Select
                    name="sellerId"
                    value={field.value || ""}
                    onValueChange={(value) => field.onChange(value ? Number(value) : undefined)}
                    placeholder="Selecione um vendedor"
                    options={sellers?.rows?.map((seller: any) => ({
                      value: seller.id,
                      label: seller.name,
                    })) || []}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Descrição do registro financeiro"
                  rows={3}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="observations"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Observações adicionais"
                  rows={3}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2 pt-4">
          <Button type="submit" className="flex-1">
            {formData ? "Atualizar" : "Criar"}
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
    </Form>
  );
};

export default FinancialRecordsForm;