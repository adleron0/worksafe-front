import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import CalendarPicker from "@/components/general-components/Calendar";

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

  const handleChange = (name: string, value: string | number | null) => {
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
          value={searchData.companyId || ""}
          onValueChange={(value) => handleChange("companyId", value ? Number(value) : null)}
          placeholder="Selecione uma empresa"
          options={[
            { value: "", label: "Todas" },
            ...(companies?.rows?.map((company: any) => ({
              value: company.id,
              label: company.name,
            })) || [])
          ]}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="gateway">Gateway</Label>
        <Select
          name="gateway"
          value={searchData.gateway || ""}
          onValueChange={(value) => handleChange("gateway", value)}
          placeholder="Selecione um gateway"
          options={gatewayOptions}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select
          name="status"
          value={searchData.status || ""}
          onValueChange={(value) => handleChange("status", value)}
          placeholder="Selecione um status"
          options={statusOptions}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="paymentMethod">Método de Pagamento</Label>
        <Select
          name="paymentMethod"
          value={searchData.paymentMethod || ""}
          onValueChange={(value) => handleChange("paymentMethod", value)}
          placeholder="Selecione um método"
          options={paymentMethodOptions}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="traineeId">Aluno</Label>
        <Select
          name="traineeId"
          value={searchData.traineeId || ""}
          onValueChange={(value) => handleChange("traineeId", value ? Number(value) : null)}
          placeholder="Selecione um aluno"
          options={[
            { value: "", label: "Todos" },
            ...(trainees?.rows?.map((trainee: any) => ({
              value: trainee.id,
              label: trainee.name,
            })) || [])
          ]}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="customerId">Cliente</Label>
        <Select
          name="customerId"
          value={searchData.customerId || ""}
          onValueChange={(value) => handleChange("customerId", value ? Number(value) : null)}
          placeholder="Selecione um cliente"
          options={[
            { value: "", label: "Todos" },
            ...(customers?.rows?.map((customer: any) => ({
              value: customer.id,
              label: customer.name,
            })) || [])
          ]}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="sellerId">Vendedor</Label>
        <Select
          name="sellerId"
          value={searchData.sellerId || ""}
          onValueChange={(value) => handleChange("sellerId", value ? Number(value) : null)}
          placeholder="Selecione um vendedor"
          options={[
            { value: "", label: "Todos" },
            ...(sellers?.rows?.map((seller: any) => ({
              value: seller.id,
              label: seller.name,
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
          value={searchData.active !== undefined ? searchData.active.toString() : ""}
          onValueChange={(value) => handleChange("active", value === "" ? null : value === "true")}
          placeholder="Selecione o status"
          options={activeOptions}
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