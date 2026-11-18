import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { get, post, put } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { useLoader } from "@/context/GeneralContext";
// Components
import { Button } from "@/components/ui/button";
import Input from "@/components/general-components/Input";
import { Label } from "@/components/ui/label";
import Select from "@/components/general-components/Select";
// Interfaces
import { IEntity } from "../-interfaces/entity.interface";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";

interface FormProps {
  formData?: IEntity;
  openSheet: (open: boolean) => void;
  entity: IDefaultEntity;
  classId: number;
  isInsideModal?: boolean;
}

const SubscriptionForm = ({ formData, openSheet, entity, classId, isInsideModal = false }: FormProps) => {
  const queryClient = useQueryClient();
  const { showLoader, hideLoader } = useLoader();
  
  const [data, setData] = useState<IEntity>({
    name: "",
    cpf: "",
    email: "",
    phone: "",
    workedAt: "",
    occupation: "",
    subscribeStatus: "pending",
    classId: classId,
  });

  useEffect(() => {
    if (formData) {
      setData({
        ...formData,
        subscribeStatus: formData.subscribeStatus || "pending",
        classId: classId,
      });
    } else {
      setData({
        name: "",
        cpf: "",
        email: "",
        phone: "",
        workedAt: "",
        occupation: "",
        subscribeStatus: "pending",
        classId: classId,
      });
    }
  }, [formData, classId]);

  const { mutate: create } = useMutation({
    mutationFn: async (data: IEntity) => {
      showLoader(`Criando ${entity.name}...`);
      return post("subscription", "", data);
    },
    onSuccess: (_response, variables) => {
      hideLoader();
      toast({
        title: `${entity.name} criada com sucesso!`,
        description: `A ${entity.name} foi adicionada.`,
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });

      // Invalidar créditos se a inscrição foi criada como confirmada
      if (variables.subscribeStatus === "confirmed") {
      }

      openSheet(false);
    },
    onError: (error: any) => {
      hideLoader();
      toast({
        title: `Erro ao criar ${entity.name}`,
        description: error?.response?.data?.message || `Erro ao criar ${entity.name}`,
        variant: "destructive",
      });
    },
  });

  const { mutate: update } = useMutation({
    mutationFn: async (data: IEntity) => {
      showLoader(`Atualizando ${entity.name}...`);
      return put("subscription", `${data.id}`, data);
    },
    onSuccess: (_response, variables) => {
      hideLoader();
      toast({
        title: `${entity.name} atualizada com sucesso!`,
        description: `A ${entity.name} foi atualizada.`,
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });

      // Invalidar créditos se houve mudança no status de confirmação
      const statusAnterior = formData?.subscribeStatus;
      const statusNovo = variables.subscribeStatus;

      if (statusAnterior !== statusNovo &&
          (statusNovo === "confirmed" || statusAnterior === "confirmed")) {
      }

      openSheet(false);
    },
    onError: (error: any) => {
      hideLoader();
      toast({
        title: `Erro ao atualizar ${entity.name}`,
        description: error?.response?.data?.message || `Erro ao atualizar ${entity.name}`,
        variant: "destructive",
      });
    },
  });

  const { data: customers } = useQuery({
    queryKey: ["listClientes"],
    queryFn: () => get<{ rows: Array<{ id: number; name: string }> }>("customer", "", [{ key: "limit", value: "all" }, { key: "order-name", value: "asc" }]),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // só os campos da inscrição (sem os objetos que vêm junto na listagem)
    const { class: _class, company: _company, customer: _customer, ...payload } = data;
    // "null" limpa o cliente (o envio multipart pula valor nulo)
    const body = { ...payload, customerId: data.customerId ? data.customerId : formData?.customerId ? ("null" as unknown as null) : undefined };
    if (formData?.id) {
      update(body);
    } else {
      create(body);
    }
  };

  const handleChange = (name: string, value: any) => {
    setData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome completo *</Label>
        <Input
          id="name"
          name="name"
          placeholder="Nome do inscrito"
          value={data.name}
          onValueChange={handleChange}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cpf">CPF *</Label>
        <Input
          id="cpf"
          name="cpf"
          format="cpf"
          placeholder="000.000.000-00"
          value={data.cpf}
          onValueChange={handleChange}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">E-mail *</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="email@exemplo.com"
          value={data.email}
          onValueChange={handleChange}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Telefone *</Label>
        <Input
          id="phone"
          name="phone"
          format="phone"
          placeholder="(00) 0 0000-0000"
          value={data.phone}
          onValueChange={handleChange}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="workedAt">Empresa</Label>
        <Input
          id="workedAt"
          name="workedAt"
          placeholder="Nome da empresa"
          value={data.workedAt}
          onValueChange={handleChange}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="customerId">Empresa contratante</Label>
        {data.reservationId ? (
          <p className="text-sm text-muted-foreground">
            {data.customer?.corporateName || data.customer?.name || "Empresa"} — vaga comprada pela empresa (mude em Vagas de empresas).
          </p>
        ) : (
          <>
            <Select
              name="customerId"
              modal={isInsideModal}
              searchable
              clearable
              options={customers?.rows ?? []}
              state={data.customerId ? String(data.customerId) : ""}
              onChange={(name, value) => handleChange(name, value ? Number(value) : null)}
              placeholder="Nenhuma (aluno do site / avulso)"
            />
            <p className="text-xs text-muted-foreground">Cliente que paga a vaga deste aluno: o nome e o CNPJ dele saem no certificado.</p>
          </>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="occupation">Profissão</Label>
        <Input
          id="occupation"
          name="occupation"
          placeholder="Cargo/Profissão"
          value={data.occupation}
          onValueChange={handleChange}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="subscribeStatus">Status *</Label>
        <Select
          name="subscribeStatus"
          state={data.subscribeStatus}
          options={[
            { id: "pending", name: "Pendente" },
            { id: "confirmed", name: "Confirmado" },
            { id: "declined", name: "Recusado" }
          ]}
          placeholder="Selecione um status"
          onChange={handleChange}
          modal={!isInsideModal}
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" className="flex-1">
          {formData?.id ? "Atualizar" : "Cadastrar"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => openSheet(false)}
          className="flex-1"
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
};

export default SubscriptionForm;