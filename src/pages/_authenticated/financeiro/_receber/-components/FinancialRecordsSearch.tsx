import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import CalendarPicker from "@/components/general-components/Calendar";
import { Response } from "@/general-interfaces/api.interface";

interface SearchData {
  companyId?: number;
  gateway?: string;
  status?: string;
  paymentMethod?: string;
  traineeId?: number;
  customerId?: number;
  sellerId?: number;
  dueDateStart?: string;
  dueDateEnd?: string;
  paidAtStart?: string;
  paidAtEnd?: string;
  minValue?: number;
  maxValue?: number;
  description?: string;
  externalId?: string;
  active?: boolean;
}

interface SearchFormProps {
  onSearch: (data: SearchData) => void;
  onClear: () => void;
  openSheet: (open: boolean) => void;
  params: Record<string, unknown>;
}

const SearchForm: React.FC<SearchFormProps> = ({ onSearch, onClear, openSheet, params }) => {
  const [searchData, setSearchData] = useState<SearchData>({
    companyId: undefined,
    gateway: "",
    status: "",
    paymentMethod: "",
    traineeId: undefined,
    customerId: undefined,
    sellerId: undefined,
    dueDateStart: "",
    dueDateEnd: "",
    paidAtStart: "",
    paidAtEnd: "",
    minValue: undefined,
    maxValue: undefined,
    description: "",
    externalId: "",
    active: undefined,
  });

  const { data: companies } = useQuery<Response>({
    queryKey: ['listCompanies'],
    queryFn: async () => {
      const result = await get<Response>('companies', '', [{ key: 'limit', value: 1000 }]);
      return result || { rows: [], total: 0 };
    },
  });

  const { data: trainees } = useQuery<Response>({
    queryKey: ['listTrainees'],
    queryFn: async () => {
      const result = await get<Response>('trainees', '', [{ key: 'limit', value: 1000 }]);
      return result || { rows: [], total: 0 };
    },
  });

  const { data: customers } = useQuery<Response>({
    queryKey: ['listCustomers'],
    queryFn: async () => {
      const result = await get<Response>('customers', '', [{ key: 'limit', value: 1000 }]);
      return result || { rows: [], total: 0 };
    },
  });

  const { data: sellers } = useQuery<Response>({
    queryKey: ['listSellers'],
    queryFn: async () => {
      const result = await get<Response>('users', '', [{ key: 'limit', value: 1000 }, { key: 'role', value: 'seller' }]);
      return result || { rows: [], total: 0 };
    },
  });

  useEffect(() => {
    setSearchData({
      companyId: params.companyId as number || undefined,
      gateway: params.gateway as string || "",
      status: params.status as string || "",
      paymentMethod: params.paymentMethod as string || "",
      traineeId: params.traineeId as number || undefined,
      customerId: params.customerId as number || undefined,
      sellerId: params.sellerId as number || undefined,
      dueDateStart: params.dueDateStart as string || "",
      dueDateEnd: params.dueDateEnd as string || "",
      paidAtStart: params.paidAtStart as string || "",
      paidAtEnd: params.paidAtEnd as string || "",
      minValue: params.minValue as number || undefined,
      maxValue: params.maxValue as number || undefined,
      description: params.description as string || "",
      externalId: params.externalId as string || "",
      active: params.active as boolean || undefined,
    });
  }, [params]);

  const handleChange = (name: string, value: string | number | boolean | null | undefined) => {
    setSearchData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const filteredData = Object.fromEntries(
      Object.entries(searchData).filter(([_, value]) =>
        value !== "" && value !== null && value !== undefined
      )
    );
    onSearch(filteredData);
    openSheet(false);
  };

  const handleClear = () => {
    setSearchData({
      companyId: undefined,
      gateway: "",
      status: "",
      paymentMethod: "",
      traineeId: undefined,
      customerId: undefined,
      sellerId: undefined,
      dueDateStart: "",
      dueDateEnd: "",
      paidAtStart: "",
      paidAtEnd: "",
      minValue: undefined,
      maxValue: undefined,
      description: "",
      externalId: "",
      active: undefined,
    });
    onClear();
    openSheet(false);
  };

  const gatewayOptions = [
    { value: "", label: "Todos" },
    { value: "stripe", label: "Stripe" },
    { value: "mercadopago", label: "Mercado Pago" },
    { value: "pagseguro", label: "PagSeguro" },
    { value: "paypal", label: "PayPal" },
    { value: "manual", label: "Manual" },
  ];

  const statusOptions = [
    { value: "", label: "Todos" },
    { value: "processing", label: "Processando" },
    { value: "waiting", label: "Aguardando" },
    { value: "received", label: "Recebido" },
    { value: "declined", label: "Recusado" },
    { value: "chargeback", label: "Estorno" },
    { value: "cancelled", label: "Cancelado" },
    { value: "overdue", label: "Vencido" },
  ];

  const paymentMethodOptions = [
    { value: "", label: "Todos" },
    { value: "credit_card", label: "Cartão de Crédito" },
    { value: "debit_card", label: "Cartão de Débito" },
    { value: "pix", label: "PIX" },
    { value: "bank_slip", label: "Boleto" },
    { value: "cash", label: "Dinheiro" },
  ];

  const activeOptions = [
    { value: "", label: "Todos" },
    { value: "true", label: "Ativo" },
    { value: "false", label: "Inativo" },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="companyId">Empresa</Label>
        <Select
          name="companyId"
          state={searchData.companyId?.toString() || ""}
          onChange={(_name, value) => handleChange("companyId", value ? Number(value) : null)}
          placeholder="Selecione uma empresa"
          options={[
            { id: "", name: "Todas" },
            ...(companies?.rows?.map((company: any) => ({
              id: company.id,
              name: company.name,
            })) || [])
          ]}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="gateway">Gateway</Label>
        <Select
          name="gateway"
          state={searchData.gateway || ""}
          onChange={(_name, value) => handleChange("gateway", value as string)}
          placeholder="Selecione um gateway"
          options={gatewayOptions.map(option => ({
            id: option.value,
            name: option.label,
          }))}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select
          name="status"
          state={searchData.status || ""}
          onChange={(_name, value) => handleChange("status", value as string)}
          placeholder="Selecione um status"
          options={statusOptions.map(option => ({
            id: option.value,
            name: option.label,
          }))}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="paymentMethod">Método de Pagamento</Label>
        <Select
          name="paymentMethod"
          state={searchData.paymentMethod || ""}
          onChange={(_name, value) => handleChange("paymentMethod", value as string)}
          placeholder="Selecione um método"
          options={paymentMethodOptions.map(option => ({
            id: option.value,
            name: option.label,
          }))}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="traineeId">Aluno</Label>
        <Select
          name="traineeId"
          state={searchData.traineeId?.toString() || ""}
          onChange={(_name, value) => handleChange("traineeId", value ? Number(value) : null)}
          placeholder="Selecione um aluno"
          options={[
            { id: "", name: "Todos" },
            ...(trainees?.rows?.map((trainee: any) => ({
              id: trainee.id,
              name: trainee.name,
            })) || [])
          ]}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="customerId">Cliente</Label>
        <Select
          name="customerId"
          state={searchData.customerId?.toString() || ""}
          onChange={(_name, value) => handleChange("customerId", value ? Number(value) : null)}
          placeholder="Selecione um cliente"
          options={[
            { id: "", name: "Todos" },
            ...(customers?.rows?.map((customer: any) => ({
              id: customer.id,
              name: customer.name,
            })) || [])
          ]}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="sellerId">Vendedor</Label>
        <Select
          name="sellerId"
          state={searchData.sellerId?.toString() || ""}
          onChange={(_name, value) => handleChange("sellerId", value ? Number(value) : null)}
          placeholder="Selecione um vendedor"
          options={[
            { id: "", name: "Todos" },
            ...(sellers?.rows?.map((seller: any) => ({
              id: seller.id,
              name: seller.name,
            })) || [])
          ]}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label htmlFor="dueDateStart">Vencimento de</Label>
          <CalendarPicker
            name="dueDateStart"
            value={searchData.dueDateStart || ""}
            onValueChange={handleChange}
            placeholder="Data inicial"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dueDateEnd">Vencimento até</Label>
          <CalendarPicker
            name="dueDateEnd"
            value={searchData.dueDateEnd || ""}
            onValueChange={handleChange}
            placeholder="Data final"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label htmlFor="paidAtStart">Pagamento de</Label>
          <CalendarPicker
            name="paidAtStart"
            value={searchData.paidAtStart || ""}
            onValueChange={handleChange}
            placeholder="Data inicial"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="paidAtEnd">Pagamento até</Label>
          <CalendarPicker
            name="paidAtEnd"
            value={searchData.paidAtEnd || ""}
            onValueChange={handleChange}
            placeholder="Data final"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label htmlFor="minValue">Valor mínimo</Label>
          <Input
            name="minValue"
            type="number"
            step="0.01"
            value={searchData.minValue || ""}
            onValueChange={(name, value) => handleChange(name, value ? Number(value) : null)}
            placeholder="0.00"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="maxValue">Valor máximo</Label>
          <Input
            name="maxValue"
            type="number"
            step="0.01"
            value={searchData.maxValue || ""}
            onValueChange={(name, value) => handleChange(name, value ? Number(value) : null)}
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Input
          name="description"
          value={searchData.description || ""}
          onValueChange={handleChange}
          placeholder="Buscar por descrição"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="externalId">ID Externo</Label>
        <Input
          name="externalId"
          value={searchData.externalId || ""}
          onValueChange={handleChange}
          placeholder="ID do gateway"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="active">Status do Registro</Label>
        <Select
          name="active"
          state={searchData.active !== undefined ? searchData.active.toString() : ""}
          onChange={(_name, value) => handleChange("active", value === "" ? undefined : (value as string) === "true")}
          placeholder="Selecione o status"
          options={activeOptions.map(option => ({
            id: option.value,
            name: option.label,
          }))}
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" className="flex-1">Buscar</Button>
        <Button type="button" variant="outline" onClick={handleClear} className="flex-1">Limpar</Button>
      </div>
    </form>
  );
};

export default SearchForm;