import { useState } from "react";
import { Button } from "@/components/ui/button";
import Input from "@/components/general-components/Input";
import { Label } from "@/components/ui/label";

interface SearchFormProps {
  onSearch: (params: any) => void;
  onClear: () => void;
  searchParams: any;
}

const SearchForm = ({ onSearch, onClear }: SearchFormProps) => {
  const [searchData, setSearchData] = useState({
    name: "",
    cpf: "",
    email: "",
    phone: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params: any = {};
    
    if (searchData.name) params.name = searchData.name;
    if (searchData.cpf) params.cpf = searchData.cpf;
    if (searchData.email) params.email = searchData.email;
    if (searchData.phone) params.phone = searchData.phone;
    
    onSearch(params);
  };

  const handleClear = () => {
    setSearchData({
      name: "",
      cpf: "",
      email: "",
      phone: "",
    });
    onClear();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="search-name">Nome</Label>
        <Input
          id="search-name"
          name="name"
          placeholder="Buscar por nome"
          value={searchData.name}
          onValueChange={(name, value) => setSearchData({ ...searchData, [name]: value as string })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="search-cpf">CPF</Label>
        <Input
          id="search-cpf"
          name="cpf"
          format="cpf"
          placeholder="000.000.000-00"
          value={searchData.cpf}
          onValueChange={(name, value) => setSearchData({ ...searchData, [name]: value as string })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="search-email">E-mail</Label>
        <Input
          id="search-email"
          name="email"
          type="email"
          placeholder="Buscar por e-mail"
          value={searchData.email}
          onValueChange={(name, value) => setSearchData({ ...searchData, [name]: value as string })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="search-phone">Telefone</Label>
        <Input
          id="search-phone"
          name="phone"
          format="phone"
          placeholder="(00) 0 0000-0000"
          value={searchData.phone}
          onValueChange={(name, value) => setSearchData({ ...searchData, [name]: value as string })}
        />
      </div>

      <div className="flex gap-2">
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

export default SearchForm;