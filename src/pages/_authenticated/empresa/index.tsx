import { createFileRoute } from '@tanstack/react-router';
// Serviços
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, put, post } from "@/services/api";
import { useLoader } from "@/context/GeneralContext";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { useTheme } from "@/context/ThemeContext";
import { generateTheme } from "@/utils/color-utils";
// Template Page
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import Icon from "@/components/general-components/Icon";
import { Textarea } from "@/components/ui/textarea";
import DropUpload from "@/components/general-components/DropUpload";
import ColorPickerInput from "@/components/general-components/ColorPickerInput";
// Interfaces
import { IEmpresa } from "./-interfaces/entity.interface";
import { ApiError, Response } from "@/general-interfaces/api.interface";

const Empresa = () => {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const { showLoader, hideLoader } = useLoader();
  const { refreshTheme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<IEmpresa & { image?: File | null; imageUrl?: string | null; favicon?: File | null; faviconUrl?: string | null }>({});
  const [preview, setPreview] = useState<string | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const originalColorsRef = useRef<{ primary: string | null; secondary: string | null }>({ primary: null, secondary: null });
  const [isPreviewingTheme, setIsPreviewingTheme] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [emailConnectionValid, setEmailConnectionValid] = useState(false);
  // Estados e cidades agora vêm diretamente das queries;

  const entity = {
    name: "Empresa",
    pluralName: "Empresas",
    model: "companies",
    ability: "company",
  };

  // Buscar dados da empresa
  interface EmpresaResponse {
    total: number;
    rows: IEmpresa[];
  }

  const { data: empresaData, isLoading, isError, error } = useQuery<EmpresaResponse, ApiError>({
    queryKey: [`get${entity.name}`],
    queryFn: async (): Promise<EmpresaResponse> => {
      const response = await get(entity.model, "");
      return response as EmpresaResponse;
    },
  });

  const empresa = empresaData?.rows?.[0];

  // Buscar estados
  const { 
    data: states, 
  } = useQuery<Response | undefined, ApiError>({
    queryKey: [`listStates`],
    queryFn: async () => {
      const params = [
        { key: 'limit', value: 999 },
        { key: 'order-name', value: 'asc' },
      ];
      return get('states', '', params);
    },
  });

  // Buscar cidades quando selecionar estado
  const { 
    data: cities, 
    isFetching: isLoadingCities,
  } = useQuery<Response | undefined, ApiError>({
    queryKey: [`listCities`, formData?.stateId],
    queryFn: async () => {
      const params = [
        { key: 'stateId', value: formData?.stateId },
        { key: 'limit', value: 999 },
        { key: 'order-name', value: 'asc' },
      ];
      return get('cities', '', params);
    },
    // Only run the query if stateId is valid (greater than 0)
    enabled: (formData?.stateId ?? 0) > 0,
  });

  // Atualizar empresa
  const updateMutation = useMutation<IEmpresa, ApiError, IEmpresa & { image?: File | null }>({
    mutationFn: async (data: IEmpresa & { image?: File | null }): Promise<IEmpresa> => {
      showLoader(`Atualizando ${entity.name}...`);
      
      // Preparar dados para envio - remover campos desnecessários e mapear image para logo
      interface DataToSend extends Omit<IEmpresa, 'id'> {
        logo?: File | null;
        favicon?: File | null;
        [key: string]: any;
      }
      const dataToSend: DataToSend = { ...data };
      
      // Se tem image (do DropUpload), mapear para logo
      if (dataToSend.image) {
        dataToSend.logo = dataToSend.image;
      }
      
      // Se tem favicon, mantém como está
      if (dataToSend.favicon) {
        // favicon já está no formato correto
      }
      
      // Converter email_conection para string JSON se existir
      if (dataToSend.email_conection && typeof dataToSend.email_conection === 'object') {
        dataToSend.email_conection = JSON.stringify(dataToSend.email_conection) as any;
      }
      
      // Remover campos que não devem ser enviados
      delete dataToSend.image;
      delete dataToSend.imageUrl;
      delete dataToSend.faviconUrl;
      
      const response = await put(entity.model, `${empresa?.id || 1}`, dataToSend);
      hideLoader();
      return response as IEmpresa;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: [`get${entity.name}`] });
      // Aplicar tema definitivamente após salvar com sucesso
      await refreshTheme();
      toast({
        title: "Sucesso",
        description: `${entity.name} atualizada com sucesso!`,
      });
      setIsEditing(false);
      setIsPreviewingTheme(false);
      setFormData((prev) => ({ ...prev, image: null, logo: null, favicon: null }));
    },
    onError: (error: ApiError) => {
      hideLoader();
      toast({
        variant: "destructive",
        title: "Erro",
        description: error?.response?.data?.message || "Erro ao atualizar empresa",
      });
    },
  });

  useEffect(() => {
    if (empresa) {
      // Converter email_conection de string JSON para objeto se necessário
      let emailConfig = empresa.email_conection;
      if (typeof emailConfig === 'string') {
        try {
          emailConfig = JSON.parse(emailConfig);
        } catch (e) {
          emailConfig = undefined;
        }
      }
      
      // Mapear logoUrl para imageUrl para compatibilidade com DropUpload
      setFormData({ 
        ...empresa,
        email_conection: emailConfig,
        image: null,
        imageUrl: empresa.logoUrl,
        favicon: null,
        faviconUrl: empresa.faviconUrl
      });
      if (empresa.logoUrl) {
        setPreview(empresa.logoUrl);
      }
      if (empresa.faviconUrl) {
        setFaviconPreview(empresa.faviconUrl);
      }
      // Salvar cores originais
      originalColorsRef.current = {
        primary: empresa.primary_color || null,
        secondary: empresa.secondary_color || null
      };
    }
  }, [empresa]);

  // Removido useEffect para states - vamos usar diretamente do query

  // Removido useEffect para cities - vamos usar diretamente do query

  // Effect para aplicar preview das cores em tempo real
  useEffect(() => {
    if (isEditing && isPreviewingTheme) {
      // Aplicar preview das cores
      if (formData?.primary_color || formData?.secondary_color) {
        generateTheme(
          formData?.primary_color || '#00A24D',
          formData?.secondary_color || undefined
        );
      }
    }
  }, [formData?.primary_color, formData?.secondary_color, isEditing, isPreviewingTheme]);

  // Limpar preview ao sair do modo de edição
  useEffect(() => {
    if (!isEditing && originalColorsRef.current.primary) {
      // Restaurar cores originais
      generateTheme(
        originalColorsRef.current.primary,
        originalColorsRef.current.secondary || undefined
      );
      setIsPreviewingTheme(false);
    }
  }, [isEditing]);

  // Restaurar cores originais ao sair da página ou trocar de aba
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isPreviewingTheme && originalColorsRef.current.primary) {
        generateTheme(
          originalColorsRef.current.primary,
          originalColorsRef.current.secondary || undefined
        );
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && isPreviewingTheme && originalColorsRef.current.primary) {
        generateTheme(
          originalColorsRef.current.primary,
          originalColorsRef.current.secondary || undefined
        );
      } else if (!document.hidden && isEditing && isPreviewingTheme) {
        // Reaplicar preview quando voltar à aba
        if (formData?.primary_color || formData?.secondary_color) {
          generateTheme(
            formData?.primary_color || '#00A24D',
            formData?.secondary_color || undefined
          );
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup - restaurar cores ao desmontar o componente
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (isPreviewingTheme && originalColorsRef.current.primary) {
        generateTheme(
          originalColorsRef.current.primary,
          originalColorsRef.current.secondary || undefined
        );
      }
    };
  }, [isEditing, isPreviewingTheme, formData?.primary_color, formData?.secondary_color]);

  const handleChange = (name: string, value: string | number | null) => {
    // Se não está editando e está tentando mudar stateId ou cityId, ignora
    if (!isEditing && (name === "stateId" || name === "cityId")) {
      return;
    }
    
    // Verifica se é um campo aninhado (email_conection)
    if (name.startsWith('email_conection.')) {
      const field = name.replace('email_conection.', '');
      setFormData((prev) => ({
        ...prev,
        email_conection: {
          ...prev?.email_conection,
          [field]: value
        }
      }));
      // Reset validation when config changes
      setEmailConnectionValid(false);
      return;
    }
    
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Se mudou uma cor, ativar preview do tema
    if ((name === "primary_color" || name === "secondary_color") && isEditing) {
      setIsPreviewingTheme(true);
    }
    
    if (name === "stateId" && value !== formData?.stateId) {
      setFormData((prev) => ({ ...prev, cityId: undefined }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData) {
      updateMutation.mutate(formData);
    }
  };

  const handleTestEmailConnection = async () => {
    if (!formData?.email_conection) return;
    
    setIsTestingEmail(true);
    try {
      await post('email/test', '', formData.email_conection);
      setEmailConnectionValid(true);
      toast({
        title: "Sucesso",
        description: "Conexão SMTP testada com sucesso!",
      });
    } catch (error: any) {
      setEmailConnectionValid(false);
      toast({
        variant: "destructive",
        title: "Erro na conexão",
        description: error?.response?.data?.message || "Falha ao testar conexão SMTP",
      });
    } finally {
      setIsTestingEmail(false);
    }
  };

  const handleCancel = () => {
    // Converter email_conection de string JSON para objeto se necessário
    let emailConfig = empresa?.email_conection;
    if (typeof emailConfig === 'string') {
      try {
        emailConfig = JSON.parse(emailConfig);
      } catch (e) {
        emailConfig = undefined;
      }
    }
    
    setFormData({ 
      ...(empresa || {}),
      email_conection: emailConfig,
      image: null,
      imageUrl: empresa?.logoUrl,
      favicon: null,
      faviconUrl: empresa?.faviconUrl
    });
    if (empresa?.logoUrl) {
      setPreview(empresa.logoUrl);
    } else {
      setPreview(null);
    }
    if (empresa?.faviconUrl) {
      setFaviconPreview(empresa.faviconUrl);
    } else {
      setFaviconPreview(null);
    }
    setIsEditing(false);
    setIsPreviewingTheme(false);
    setEmailConnectionValid(false);
    // Restaurar cores originais ao cancelar
    if (originalColorsRef.current.primary) {
      generateTheme(
        originalColorsRef.current.primary,
        originalColorsRef.current.secondary || undefined
      );
    }
  };

  if (!can(`view_${entity.ability}`)) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Você não tem permissão para visualizar esta página.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Icon name="loader-2" className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-destructive">Erro: {error?.response?.data?.message}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Dados da Empresa</CardTitle>
              <CardDescription>
                Gerencie as informações da sua empresa
              </CardDescription>
            </div>
            {!isEditing && can(`update_${entity.ability}`) && (
              <Button onClick={() => setIsEditing(true)}>
                <Icon name="pencil" className="w-4 h-4 mr-2" />
                Editar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Informações Básicas */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Informações Básicas</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input
                    id="cnpj"
                    name="cnpj"
                    value={formData?.cnpj || ""}
                    onValueChange={handleChange}
                    disabled={!isEditing}
                    format="cnpj"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="corporate_name">Razão Social</Label>
                  <Input
                    id="corporate_name"
                    name="corporate_name"
                    value={formData?.corporate_name || ""}
                    onValueChange={handleChange}
                    disabled={!isEditing}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="comercial_name">Nome Fantasia</Label>
                  <Input
                    id="comercial_name"
                    name="comercial_name"
                    value={formData?.comercial_name || ""}
                    onValueChange={handleChange}
                    disabled={!isEditing}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="segment">Segmento</Label>
                  <Input
                    id="segment"
                    name="segment"
                    value={formData?.segment || ""}
                    onValueChange={handleChange}
                    disabled={!isEditing}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">Descrição</Label>
                  <p className="text-xs text-muted-foreground font-medium">Usada no footer e metatags</p>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData?.description || ""}
                    onChange={(e) => handleChange("description", e.target.value)}
                    disabled={!isEditing}
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Logo e Cores */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Logo e Cores</h3>
                {isPreviewingTheme && isEditing && (
                  <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
                    🎨 Visualizando tema em tempo real
                  </span>
                )}
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Logo da Empresa</Label>
                    {isEditing ? (
                      <div className="h-56">
                        <DropUpload
                          setImage={setFormData}
                          EditPreview={preview}
                          itemFormData="image"
                          clearFields={["imageUrl"]}
                          cover={false}
                        />
                      </div>
                    ) : (
                      preview && (
                        <img
                          src={preview}
                          alt="Logo"
                          className="w-full h-56 object-contain border rounded bg-muted"
                        />
                      )
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Favicon</Label>
                    <p className="text-xs text-muted-foreground">Ícone do site (recomendado 1:1)</p>
                    {isEditing ? (
                      <div className="h-48 flex items-center justify-center">
                        <div className="w-48 h-48">
                          <DropUpload
                            setImage={setFormData}
                            EditPreview={faviconPreview}
                            itemFormData="favicon"
                            clearFields={["faviconUrl"]}
                            cover={false}
                          />
                        </div>
                      </div>
                    ) : (
                      faviconPreview && (
                        <div className="w-full h-48 flex items-center justify-center border rounded bg-muted">
                          <img
                            src={faviconPreview}
                            alt="Favicon"
                            className="w-16 h-16 object-contain"
                          />
                        </div>
                      )
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <ColorPickerInput
                      label="Cor Primária"
                      value={formData?.primary_color || "#000000"}
                      onChange={(color) => handleChange("primary_color", color)}
                      disabled={!isEditing}
                    />
                  </div>

                  <div className="space-y-2">
                    <ColorPickerInput
                      label="Cor Secundária"
                      value={formData?.secondary_color || "#000000"}
                      onChange={(color) => handleChange("secondary_color", color)}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Endereço */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Endereço</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="zipCode">CEP</Label>
                  <Input
                    id="zipCode"
                    name="zipCode"
                    value={formData?.zipCode || ""}
                    onValueChange={handleChange}
                    disabled={!isEditing}
                    format="cep"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stateId">Estado</Label>
                  <Select
                    name="stateId"
                    state={formData?.stateId ? String(formData?.stateId) : ""}
                    onChange={(name, value) => handleChange(name, value ? Number(value) : null)}
                    disabled={!isEditing}
                    placeholder="Selecione um estado"
                    options={states?.rows || []}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cityId">Cidade</Label>
                  <Select
                    name="cityId"
                    state={formData?.cityId ? String(formData?.cityId) : ""}
                    onChange={(name, value) => handleChange(name, value ? Number(value) : null)}
                    disabled={!isEditing || !formData?.stateId || isLoadingCities}
                    placeholder="Selecione uma cidade"
                    options={cities?.rows || []}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="neighborhood">Bairro</Label>
                  <Input
                    id="neighborhood"
                    name="neighborhood"
                    value={formData?.neighborhood || ""}
                    onValueChange={handleChange}
                    disabled={!isEditing}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Input
                    id="address"
                    name="address"
                    value={formData?.address || ""}
                    onValueChange={handleChange}
                    disabled={!isEditing}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="addressNumber">Número</Label>
                  <Input
                    id="addressNumber"
                    name="addressNumber"
                    value={formData?.addressNumber || ""}
                    onValueChange={handleChange}
                    disabled={!isEditing}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="addressComplement">Complemento</Label>
                  <Input
                    id="addressComplement"
                    name="addressComplement"
                    value={formData?.addressComplement || ""}
                    onValueChange={handleChange}
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </div>

            {/* Contatos */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Contatos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="representative_email">E-mail Representante</Label>
                  <Input
                    id="representative_email"
                    name="representative_email"
                    type="email"
                    value={formData?.representative_email || ""}
                    onValueChange={handleChange}
                    disabled={!isEditing}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="representative_contact">Contato Representante</Label>
                  <Input
                    id="representative_contact"
                    name="representative_contact"
                    value={formData?.representative_contact || ""}
                    onValueChange={handleChange}
                    disabled={!isEditing}
                    format="phone"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="financial_email">E-mail Financeiro</Label>
                  <Input
                    id="financial_email"
                    name="financial_email"
                    type="email"
                    value={formData?.financial_email || ""}
                    onValueChange={handleChange}
                    disabled={!isEditing}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="financial_contact">Contato Financeiro</Label>
                  <Input
                    id="financial_contact"
                    name="financial_contact"
                    value={formData?.financial_contact || ""}
                    onValueChange={handleChange}
                    disabled={!isEditing}
                    format="phone"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="operational_email">E-mail Operacional</Label>
                  <Input
                    id="operational_email"
                    name="operational_email"
                    type="email"
                    value={formData?.operational_email || ""}
                    onValueChange={handleChange}
                    disabled={!isEditing}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="operational_contact">Contato Operacional</Label>
                  <Input
                    id="operational_contact"
                    name="operational_contact"
                    value={formData?.operational_contact || ""}
                    onValueChange={handleChange}
                    disabled={!isEditing}
                    format="phone"
                  />
                </div>
              </div>
            </div>

            {/* Configuração de Email */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">Configuração de Email (SMTP)</h3>
                {emailConnectionValid && (
                  <div className="relative">
                    <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-75"></div>
                    <div className="relative bg-green-500 rounded-full w-3 h-3"></div>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email_from">Email Remetente</Label>
                  <Input
                    id="email_from"
                    name="email_conection.EMAIL_FROM"
                    type="email"
                    value={formData?.email_conection?.EMAIL_FROM || ""}
                    onValueChange={handleChange}
                    disabled={!isEditing}
                    placeholder="noreply@empresa.com.br"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email_host">Servidor SMTP</Label>
                  <Input
                    id="email_host"
                    name="email_conection.EMAIL_HOST"
                    value={formData?.email_conection?.EMAIL_HOST || ""}
                    onValueChange={handleChange}
                    disabled={!isEditing}
                    placeholder="smtp.gmail.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email_port">Porta SMTP</Label>
                  <Input
                    id="email_port"
                    name="email_conection.EMAIL_PORT"
                    value={formData?.email_conection?.EMAIL_PORT || ""}
                    onValueChange={handleChange}
                    disabled={!isEditing}
                    placeholder="587"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email_user">Usuário SMTP</Label>
                  <Input
                    id="email_user"
                    name="email_conection.EMAIL_AUTH_USER"
                    value={formData?.email_conection?.EMAIL_AUTH_USER || ""}
                    onValueChange={handleChange}
                    disabled={!isEditing}
                    placeholder="usuario@empresa.com.br"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="email_password">Senha SMTP</Label>
                  <div className="flex gap-2">
                    <Input
                      id="email_password"
                      name="email_conection.EMAIL_AUTH_PASSWORD"
                      type="password"
                      value={formData?.email_conection?.EMAIL_AUTH_PASSWORD || ""}
                      onValueChange={handleChange}
                      disabled={!isEditing}
                      placeholder="••••••••"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant={emailConnectionValid ? "default" : "outline"}
                      onClick={handleTestEmailConnection}
                      disabled={
                        isTestingEmail ||
                        !formData?.email_conection?.EMAIL_FROM ||
                        !formData?.email_conection?.EMAIL_HOST ||
                        !formData?.email_conection?.EMAIL_PORT ||
                        !formData?.email_conection?.EMAIL_AUTH_USER ||
                        !formData?.email_conection?.EMAIL_AUTH_PASSWORD
                      }
                      className={emailConnectionValid ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                    >
                      {isTestingEmail ? (
                        <>
                          <Icon name="loader-2" className="w-4 h-4 mr-2 animate-spin" />
                          Testando...
                        </>
                      ) : emailConnectionValid ? (
                        <>
                          <Icon name="check" className="w-4 h-4 mr-2" />
                          Conectado
                        </>
                      ) : (
                        <>
                          <Icon name="mail-check" className="w-4 h-4 mr-2" />
                          Testar Conexão
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Domínios e Redes Sociais */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Domínios e Redes Sociais</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lp_domain">Domínio Landing Page</Label>
                  <Input
                    id="lp_domain"
                    name="lp_domain"
                    value={formData?.lp_domain || ""}
                    onValueChange={handleChange}
                    disabled={!isEditing}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="system_domain">Domínio Sistema</Label>
                  <Input
                    id="system_domain"
                    name="system_domain"
                    value={formData?.system_domain || ""}
                    onValueChange={handleChange}
                    disabled={!isEditing}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="websiteUrl">Website</Label>
                  <Input
                    id="websiteUrl"
                    name="websiteUrl"
                    type="url"
                    value={formData?.websiteUrl || ""}
                    onValueChange={handleChange}
                    disabled={!isEditing}
                    placeholder="https://"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="facebookUrl">Facebook</Label>
                  <Input
                    id="facebookUrl"
                    name="facebookUrl"
                    type="url"
                    value={formData?.facebookUrl || ""}
                    onValueChange={handleChange}
                    disabled={!isEditing}
                    placeholder="https://facebook.com/"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instagramUrl">Instagram</Label>
                  <Input
                    id="instagramUrl"
                    name="instagramUrl"
                    type="url"
                    value={formData?.instagramUrl || ""}
                    onValueChange={handleChange}
                    disabled={!isEditing}
                    placeholder="https://instagram.com/"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="linkedinUrl">LinkedIn</Label>
                  <Input
                    id="linkedinUrl"
                    name="linkedinUrl"
                    type="url"
                    value={formData?.linkedinUrl || ""}
                    onValueChange={handleChange}
                    disabled={!isEditing}
                    placeholder="https://linkedin.com/"
                  />
                </div>
              </div>
            </div>

            {/* Botões de ação */}
            {isEditing && (
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? (
                    <>
                      <Icon name="loader-2" className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar Alterações"
                  )}
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export const Route = createFileRoute('/_authenticated/empresa/')({
  component: Empresa,
})

export default Empresa;