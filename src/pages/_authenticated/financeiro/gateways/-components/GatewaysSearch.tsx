import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Select from "@/components/general-components/Select";

interface SearchData {
  gateway?: string;
  active?: boolean | '';
}

interface SearchFormProps {
  onSearch: (data: SearchData) => void;
  onClear: () => void;
  openSheet: (open: boolean) => void;
  params: Record<string, unknown>;
}

const GatewaysSearch: React.FC<SearchFormProps> = ({ onSearch, onClear, openSheet, params }) => {
  const [searchData, setSearchData] = useState<SearchData>({
    gateway: '',
    active: '',
  });

  useEffect(() => {
    // Carregar params no form state se existirem
    if (params) {
      setSearchData({
        gateway: (params.gateway as string) || '',
        active: params.active !== undefined ? params.active as boolean : '',
      });
    }
  }, [params]);

  const handleChange = (name: string, value: string | number | boolean | null) => {
    setSearchData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Filtrar apenas campos preenchidos
    const filteredData: any = {};
    
    if (searchData.gateway) {
      filteredData.gateway = searchData.gateway;
    }
    
    if (searchData.active !== '') {
      filteredData.active = searchData.active;
    }
    
    onSearch(filteredData);
    openSheet(false);
  };

  const handleClear = () => {
    setSearchData({
      gateway: '',
      active: '',
    });
    onClear();
    openSheet(false);
  };

  // Opções de gateways para busca
  const gatewayOptions = [
    { label: 'Todos', value: '' },
    { label: 'Asaas', value: 'asaas' },
  ];

  // Opções de status
  const statusOptions = [
    { label: 'Todos', value: '' },
    { label: 'Ativo', value: 'true' },
    { label: 'Inativo', value: 'false' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Gateway */}
      <div className="space-y-2">
        <Label htmlFor="search-gateway">Gateway</Label>
        <Select
          name="gateway"
          state={searchData.gateway || ''}
          onChange={(name, value) => handleChange(name, value as string || '')}
          placeholder="Selecione o gateway"
          options={gatewayOptions}
          label="label"
          value="value"
        />
      </div>

      {/* Status */}
      <div className="space-y-2">
        <Label htmlFor="search-active">Status</Label>
        <Select
          name="active"
          state={searchData.active === '' ? '' : String(searchData.active)}
          onChange={(name, value) => handleChange(name, value === '' ? '' : value === 'true')}
          placeholder="Selecione o status"
          options={statusOptions}
          label="label"
          value="value"
        />
      </div>

      {/* Botões */}
      <div className="flex gap-2 pt-4">
        <Button type="submit" className="flex-1">
          Buscar
        </Button>
        <Button type="button" variant="outline" onClick={handleClear} className="flex-1">
          Limpar
        </Button>
      </div>
    </form>
  );
};

export default GatewaysSearch;