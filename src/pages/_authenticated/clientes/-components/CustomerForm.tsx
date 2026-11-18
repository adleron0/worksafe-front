import React, { useState, useEffect, useRef } from "react";
import Select from "@/components/general-components/Select";
import { Button } from "@/components/ui/button";
import Input from "@/components/general-components/Input";
import { Label } from "@/components/ui/label";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { get, post, put } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { useLoader } from "@/context/GeneralContext";
import { IEntity } from "../-interfaces/entity.interface";
import DropUpload from "@/components/general-components/DropUpload";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";
import { ApiError, Response } from "@/general-interfaces/api.interface";
import Icon from "@/components/general-components/Icon";
import { buscarCnpj, CnpjInfo, isValidCNPJ, isValidCPF, sameName } from "@/utils/documento";

type Tipo = "pj" | "pf";
type Lookup = { status: "idle" | "loading" | "ok" | "notfound" | "error"; info?: CnpjInfo };

interface FormProps {
  formData?: IEntity;
  openSheet?: (open: boolean) => void;
  entity: IDefaultEntity;
  /** Na página do cliente: o formulário fica aberto e avisa quem chamou ao salvar. */
  page?: boolean;
  onSaved?: (row: IEntity) => void;
}

const Form = ({ formData, openSheet, entity, page = false, onSaved }: FormProps) => {
  const queryClient = useQueryClient();
  const { showLoader, hideLoader } = useLoader();

  // Empresa (CNPJ) ou pessoa física (CPF): o documento fica na mesma coluna `cnpj`.
  const [tipo, setTipo] = useState<Tipo>(formData?.cnpj?.length === 11 ? "pf" : "pj");
  const [lookup, setLookup] = useState<Lookup>({ status: "idle" });

  // Cadastro antigo com documento inválido continua editável enquanto o documento não muda.
  const documentoOk = (value: string) =>
    (!!formData && value === formData.cnpj) || (tipo === "pf" ? isValidCPF(value) : isValidCNPJ(value));

  // Schema
  const Schema = z.object({
    name: z.string().min(3, { message: "Nome deve ter pelo menos 3 caracteres" }),
    corporateName: tipo === "pf"
      ? z.string()
      : z.string().min(2, { message: "Razão social deve ter pelo menos 2 caracteres" }),
    email: z.string().email({ message: "Email inválido" }),
    phone: z.string().min(10, { message: "Telefone deve ter pelo menos 10 dígitos" }),
    cnpj: z.string().refine(documentoOk, { message: tipo === "pf" ? "CPF inválido" : "CNPJ inválido" }),
    stateId: z.number().min(1, { message: "Estado deve ser selecionado" }),
    cityId: z.number().min(1, { message: "Cidade deve ser selecionada" }),
    neighborhood: z.string().optional(),
    zipcode: z.string().optional(),
    street: z.string().optional(),
    number: z.number().optional(),
    rankId: z.number().min(1, { message: "Classificação deve ser selecionada" }),
    description: z.string().optional(),
    complement: z.string().optional(),
    imageUrl: z.string().nullable(), // Schema atualizado para validar image como File ou null
    image: z.instanceof(File).nullable().or(z.literal(null)).refine(
      (value) => value === null || value instanceof File,
      {
        message: "Imagem deve ser um arquivo ou nulo.",
      }
    ),
  })

  type FormData = z.infer<typeof Schema>;

  const [dataForm, setDataForm] = useState<FormData>({
    name: formData?.name || "",
    corporateName: formData?.corporateName || "",
    email: formData?.email || "",
    imageUrl: formData?.imageUrl || null,
    image: null,
    phone: formData?.phone || "",
    cnpj: formData?.cnpj || "",
    stateId: formData?.stateId || 0,
    cityId: formData?.cityId || 0,
    neighborhood: formData?.neighborhood || "",
    zipcode: formData?.zipcode || "",
    street: formData?.street || "",
    number: formData?.number || 0,
    rankId: formData?.rankId || 0,
    description: formData?.description || "",
    complement: formData?.complement || "",
  });
  const initialFormRef = useRef(dataForm);

  const [preview, setPreview] = useState<string | null>(''); // Preview da imagem quando for editar
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Efeito para preview de imagem se necessário
  useEffect(() => {
    if (formData) {
      if (formData.imageUrl) {
        setPreview(formData.imageUrl);
      }
    }
  }, []);

  const { mutate: registerCustomer, isPending } = useMutation({
    mutationFn: (newItem: FormData) => {
      showLoader(`Registrando ${entity.name}...`);
      return post<IEntity>(entity.model, '', newItem);
    },
    onSuccess: (row) => {
      hideLoader();
      toast({
        title: `${entity.name} cadastrado!`,
        description: page ? "Agora cadastre os contatos e os arquivos do cliente." : `Novo ${entity.name} cadastrado com sucesso.`,
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
      if (page) {
        if (row) onSaved?.(row);
        return;
      }
      // Limpa o formulário e fecha o Sheet
      setDataForm(initialFormRef.current);
      openSheet?.(false);
    },
    onError: (error: ApiError) => {
      hideLoader();
      toast({
        title: `Erro ao cadastrar ${entity.name}`,
        description: error.response?.data?.message || "Erro desconhecido.",
        variant: "destructive",
      });
    },
  });

  const { mutate: updateCustomerMutation, isPending: isPendingUpdate } = useMutation({
    mutationFn: (updatedItem: FormData) => {
      showLoader(`Atualizando ${entity.name}...`);
      return put<IEntity>(entity.model, `${formData?.id}`, updatedItem);
    },
    onSuccess: (row) => {
      hideLoader();
      toast({
        title: `${entity.name} atualizado!`,
        description: `${entity.name} atualizado com sucesso.`,
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
      if (page) {
        queryClient.invalidateQueries({ queryKey: ["customer", formData?.id] });
        if (row) onSaved?.(row);
        return;
      }
      // Limpa o formulário e fecha o Sheet
      setDataForm(initialFormRef.current);
      openSheet?.(false);
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

  const handleChange = (name: string, value: string | number) => {
    setDataForm((prev) => ({ ...prev, [name]: value }));
  };

  const trocarTipo = (novo: Tipo) => {
    if (novo === tipo) return;
    setTipo(novo);
    setLookup({ status: "idle" });
    setErrors((prev) => ({ ...prev, cnpj: "", corporateName: "" }));
    setDataForm((prev) => ({ ...prev, cnpj: "" }));
  };

  // Preenche o formulário com os dados públicos do CNPJ. `tudo` sobrescreve o
  // que já foi digitado; sem ele, só completa os campos vazios.
  const aplicarCnpj = async (info: CnpjInfo, tudo: boolean) => {
    const vazio = (v: unknown) => tudo || v === "" || v === 0 || v === null || v === undefined;
    const state = info.uf ? states?.rows?.find((s: { uf?: string }) => s.uf?.toUpperCase() === info.uf) : undefined;
    let cityId = 0;
    if (state && info.municipio) {
      const res = await get<Response>("cities", "", [
        { key: "stateId", value: state.id },
        { key: "limit", value: "all" },
      ]).catch(() => undefined);
      cityId = res?.rows?.find((c: { name: string }) => sameName(c.name, info.municipio))?.id ?? 0;
    }
    setDataForm((prev) => {
      const next = { ...prev };
      const set = <K extends keyof FormData>(key: K, value: FormData[K]) => {
        if (value && vazio(prev[key])) next[key] = value;
      };
      set("corporateName", info.razaoSocial);
      set("name", info.nomeFantasia || info.razaoSocial);
      set("email", info.email);
      set("phone", info.telefone);
      set("zipcode", info.cep);
      set("street", info.rua);
      set("number", Number(info.numero) || 0);
      set("neighborhood", info.bairro);
      set("complement", info.complemento);
      if (state && (tudo || !prev.stateId || prev.stateId === state.id)) {
        next.stateId = state.id;
        if (cityId && (tudo || !prev.cityId || prev.stateId !== state.id)) next.cityId = cityId;
      }
      return next;
    });
    setErrors({});
  };

  // CNPJ completo e válido → busca na BrasilAPI (gratuita, sem chave).
  useEffect(() => {
    const cnpj = dataForm.cnpj;
    if (tipo !== "pj" || cnpj.length !== 14 || !isValidCNPJ(cnpj) || cnpj === formData?.cnpj) {
      setLookup({ status: "idle" });
      return;
    }
    const controller = new AbortController();
    setLookup({ status: "loading" });
    buscarCnpj(cnpj, controller.signal)
      .then(async (info) => {
        if (controller.signal.aborted) return;
        if (!info) return setLookup({ status: "notfound" });
        setLookup({ status: "ok", info });
        await aplicarCnpj(info, false);
      })
      .catch(() => {
        if (!controller.signal.aborted) setLookup({ status: "error" });
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataForm.cnpj, tipo]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Pessoa física não tem razão social: o nome completo vale para os dois.
    const payload = tipo === "pf" ? { ...dataForm, corporateName: dataForm.name } : dataForm;
    const result = Schema.safeParse(payload);

    if (!result.success) {
      // Extract error messages from Zod validation result
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
      updateCustomerMutation(payload);
    } else {
      registerCustomer(payload);
    }
  };

  // Buscas de valores para variaveis de formulário
  const { 
    data: ranks, 
  } = useQuery<Response | undefined, ApiError>({
    queryKey: [`listRanks`],
    queryFn: async () => {
      const params = [
        { key: 'limit', value: 'all' },
        { key: 'order-id', value: 'asc' },
      ];
      return get('ranks', '', params);
    },
  });

  const { 
    data: states, 
  } = useQuery<Response | undefined, ApiError>({
    queryKey: [`listStates`],
    queryFn: async () => {
      const params = [
        { key: 'limit', value: 'all' },
        { key: 'order-name', value: 'asc' },
      ];
      return get('states', '', params);
    },
  });

  const { 
    data: cities, 
    isFetching: isLoadingCities,
  } = useQuery<Response | undefined, ApiError>({
    queryKey: [`listCities`, dataForm.stateId],
    queryFn: async () => {
      const params = [
        { key: 'stateId', value: dataForm.stateId },
        { key: 'limit', value: 'all' },
        { key: 'order-name', value: 'asc' },
      ];
      return get('cities', '', params);
    },
    // Only run the query if stateId is valid (greater than 0)
    enabled: dataForm.stateId > 0,
  });

  return (
    <form onSubmit={handleSubmit} className={page ? "grid md:grid-cols-2 gap-x-6 gap-y-3 w-full" : "flex flex-col gap-2 w-full mt-4"}>
      <div className={page ? "md:col-span-2 md:max-w-md" : ""}>
        <DropUpload preset="logo"
          setImage={setDataForm}
          EditPreview={preview}
        />
      </div>
      <div className={page ? "md:col-span-2" : ""}>
        <Label>Tipo de cliente</Label>
        <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit mt-1">
          <Button type="button" size="sm" variant={tipo === "pj" ? "default" : "ghost"} className="gap-2" onClick={() => trocarTipo("pj")}>
            <Icon name="building-2" className="w-4 h-4" />
            Empresa (CNPJ)
          </Button>
          <Button type="button" size="sm" variant={tipo === "pf" ? "default" : "ghost"} className="gap-2" onClick={() => trocarTipo("pf")}>
            <Icon name="user" className="w-4 h-4" />
            Pessoa física (CPF)
          </Button>
        </div>
      </div>
      <div>
        <Label htmlFor="cnpj">{tipo === "pf" ? "CPF" : "CNPJ"} <span>*</span></Label>
        <Input
          key={tipo}
          id="cnpj"
          name="cnpj"
          placeholder={tipo === "pf" ? "000.000.000-00" : "00.000.000/0000-00"}
          format={tipo === "pf" ? "cpf" : "cnpj"}
          value={dataForm.cnpj}
          onValueChange={handleChange}
          className="mt-1"
        />
        {errors.cnpj && <p className="text-red-500 text-sm">{errors.cnpj}</p>}
        {tipo === "pj" && lookup.status === "idle" && !formData && !errors.cnpj && (
          <p className="text-xs text-muted-foreground mt-1">Digite o CNPJ que os dados da empresa são preenchidos sozinhos.</p>
        )}
        {lookup.status === "loading" && (
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <Icon name="loader-circle" className="w-3 h-3 animate-spin" /> Buscando dados do CNPJ...
          </p>
        )}
        {lookup.status === "ok" && lookup.info && (
          <div className="text-xs mt-1 space-y-1">
            <p className="text-muted-foreground flex items-center gap-1">
              <Icon name="check" className="w-3 h-3 text-primary" /> Dados da Receita Federal preenchidos. Confira antes de salvar.
            </p>
            {lookup.info.situacao && lookup.info.situacao.toUpperCase() !== "ATIVA" && (
              <p className="text-amber-600 dark:text-amber-400">Atenção: situação cadastral {lookup.info.situacao.toLowerCase()}.</p>
            )}
            {formData && (
              <button type="button" className="text-primary underline underline-offset-2" onClick={() => lookup.info && aplicarCnpj(lookup.info, true)}>
                Trocar todos os campos pelos dados da Receita
              </button>
            )}
          </div>
        )}
        {lookup.status === "notfound" && (
          <p className="text-xs text-muted-foreground mt-1">CNPJ não encontrado na base pública. Preencha os dados à mão.</p>
        )}
        {lookup.status === "error" && (
          <p className="text-xs text-muted-foreground mt-1">Não deu para buscar os dados agora. Preencha à mão.</p>
        )}
      </div>
      <div>
        <Label htmlFor="name">{tipo === "pf" ? "Nome completo" : "Nome"} <span>*</span></Label>
        <Input
          id="name"
          name="name"
          placeholder={tipo === "pf" ? "Digite o nome completo" : "Como a empresa é conhecida (nome fantasia)"}
          value={dataForm.name}
          onValueChange={handleChange}
          className="mt-1"
        />
        {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
      </div>
      {tipo === "pj" && (
        <div>
          <Label htmlFor="corporateName">Razão Social <span>*</span></Label>
          <Input
            id="corporateName"
            name="corporateName"
            placeholder="Digite a razão social"
            value={dataForm.corporateName}
            onValueChange={handleChange}
            className="mt-1"
          />
          {errors.corporateName && <p className="text-red-500 text-sm">{errors.corporateName}</p>}
        </div>
      )}
      <div>
        <Label htmlFor="email">Email <span>*</span></Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="Digite o email"
          value={dataForm.email}
          onValueChange={handleChange}
          className="mt-1"
        />
        {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
      </div>
      <div>
        <Label htmlFor="phone">Telefone <span>*</span></Label>
        <Input
          id="phone"
          name="phone"
          placeholder="(11) 99999-9999"
          format="phone"
          value={dataForm.phone}
          onValueChange={handleChange}
          className="mt-1"
        />
        {errors.phone && <p className="text-red-500 text-sm">{errors.phone}</p>}
      </div>
      <div>
        <Label htmlFor="rankId">Classificação <span>*</span></Label>
        <Select 
          name="rankId"
          options={ranks?.rows || []} 
          onChange={(name, value) => handleChange(name, Number(value))} 
          state={dataForm.rankId ? String(dataForm.rankId) : ""}
          placeholder="Selecione a classificação"
        />
        {errors.rankId && <p className="text-red-500 text-sm">{errors.rankId}</p>}
      </div>
      
      <div>
        <Label htmlFor="stateId">Estado <span>*</span></Label>
        <Select 
          name="stateId"
          options={states?.rows || []} 
          onChange={(name, value) => handleChange(name, Number(value))} 
          state={dataForm.stateId ? String(dataForm.stateId) : ""}
          placeholder="Selecione o estado"
        />
        {errors.stateId && <p className="text-red-500 text-sm">{errors.stateId}</p>}
      </div>
      
      <div>
        <Label htmlFor="cityId">Cidade <span>*</span></Label>
        <Select 
          name="cityId"
          disabled={isLoadingCities}
          options={cities?.rows || []} 
          // a lista recarrega ao trocar o estado e o Select manda "" nesse meio-tempo:
          // ignorar para não perder a cidade preenchida pela busca do CNPJ
          onChange={(name, value) => { if (value !== "") handleChange(name, Number(value)); }} 
          state={dataForm.cityId ? String(dataForm.cityId) : ""}
          placeholder="Selecione a cidade"
        />
        {errors.cityId && <p className="text-red-500 text-sm">{errors.cityId}</p>}
      </div>
      
      <div>
        <Label htmlFor="zipcode">CEP</Label>
        <Input
          id="zipcode"
          name="zipcode"
          placeholder="00000-000"
          format="cep"
          unformat={false}
          value={dataForm.zipcode}
          onValueChange={handleChange}
          className="mt-1"
        />
      </div>
      
      <div>
        <Label htmlFor="street">Rua</Label>
        <Input
          id="street"
          name="street"
          placeholder="Digite o nome da rua"
          value={dataForm.street}
          onValueChange={handleChange}
          className="mt-1"
        />
      </div>
      
      <div>
        <Label htmlFor="number">Número</Label>
        <Input
          id="number"
          name="number"
          type="number"
          placeholder="Digite o número"
          value={dataForm.number || ""}
          onValueChange={(name, value) => handleChange(name, Number(value))}
          className="mt-1"
        />
      </div>
      
      <div>
        <Label htmlFor="neighborhood">Bairro</Label>
        <Input
          id="neighborhood"
          name="neighborhood"
          placeholder="Digite o bairro"
          value={dataForm.neighborhood}
          onValueChange={handleChange}
          className="mt-1"
        />
      </div>
      
      <div>
        <Label htmlFor="complement">Complemento</Label>
        <Input
          id="complement"
          name="complement"
          placeholder="Digite o complemento"
          value={dataForm.complement}
          onValueChange={handleChange}
          className="mt-1"
        />
      </div>
      
      <div className={page ? "md:col-span-2" : ""}>
        <Label htmlFor="description">Descrição</Label>
        <Input
          id="description"
          name="description"
          placeholder="Digite uma descrição"
          value={dataForm.description}
          onValueChange={handleChange}
          className="mt-1"
        />
      </div>

      <Button
        type="submit"
        className={page ? "md:col-span-2 md:w-fit md:justify-self-end mt-2" : "w-full my-4"}
        disabled={isPending || isPendingUpdate}
      >
        {isPending || isPendingUpdate
          ? formData
            ? "Atualizando..."
            : "Registrando..."
          : formData
          ? page ? "Salvar alterações" : `Atualizar ${entity.name}`
          : page ? "Cadastrar e continuar" : `Registrar ${entity.name}`}
      </Button>
    </form>
  );
};

export default Form;
