import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";

interface Props {
  onSearch: (params: any) => void;
  onClear: () => void;
}

interface Company {
  id: number;
  name: string;
}

interface Course {
  id: number;
  name: string;
  companyId: number;
}

export default function CertificateSearch({ onSearch, onClear }: Props) {
  const [name, setName] = useState("");
  const [companyId, setCompanyId] = useState<string>("");
  const [courseId, setCourseId] = useState<string>("");
  const [active, setActive] = useState<string>("");

  // Buscar empresas
  const { data: companiesData } = useQuery({
    queryKey: ["companies-search"],
    queryFn: async () => {
      const response = await get<{ rows: Company[] }>("companies");
      return response?.rows || [];
    },
  });

  // Buscar cursos baseado na empresa selecionada
  const { data: coursesData } = useQuery({
    queryKey: ["courses-search", companyId],
    queryFn: async () => {
      const params = companyId ? [{ key: "companyId", value: companyId }] : undefined;
      const response = await get<{ rows: Course[] }>("courses", "", params);
      return response?.rows || [];
    },
    enabled: !!companyId,
  });

  // Resetar courseId quando companyId mudar
  useEffect(() => {
    setCourseId("");
  }, [companyId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const params: any = {};
    
    if (name.trim()) params.name = name.trim();
    if (companyId) params.companyId = companyId;
    if (courseId) params.courseId = courseId;
    if (active !== "") params.active = active === "true";
    
    onSearch(params);
  };

  const handleClear = () => {
    setName("");
    setCompanyId("");
    setCourseId("");
    setActive("");
    onClear();
  };

  const hasFilters = name || companyId || courseId || active !== "";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Nome do certificado */}
        <div className="space-y-2">
          <Label htmlFor="name">Nome do Certificado</Label>
          <Input
            id="name"
            placeholder="Buscar por nome..."
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* Status */}
        <div className="space-y-2">
          <Label htmlFor="active">Status</Label>
          <Select value={active} onValueChange={setActive}>
            <SelectTrigger id="active">
              <SelectValue placeholder="Todos os status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="true">Ativo</SelectItem>
              <SelectItem value="false">Inativo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Empresa */}
        <div className="space-y-2">
          <Label htmlFor="company">Empresa</Label>
          <Select value={companyId} onValueChange={setCompanyId}>
            <SelectTrigger id="company">
              <SelectValue placeholder="Todas as empresas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {companiesData?.map((company) => (
                <SelectItem key={company.id} value={company.id.toString()}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Curso */}
        <div className="space-y-2">
          <Label htmlFor="course">Curso</Label>
          <Select 
            value={courseId} 
            onValueChange={setCourseId}
            disabled={!companyId || companyId === "all"}
          >
            <SelectTrigger id="course">
              <SelectValue placeholder={
                !companyId || companyId === "all" 
                  ? "Selecione uma empresa primeiro" 
                  : "Todos os cursos"
              } />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {coursesData?.map((course) => (
                <SelectItem key={course.id} value={course.id.toString()}>
                  {course.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Botões */}
      <div className="flex justify-end gap-2">
        {hasFilters && (
          <Button
            type="button"
            variant="outline"
            onClick={handleClear}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Limpar Filtros
          </Button>
        )}
        <Button type="submit" className="gap-2">
          <Search className="h-4 w-4" />
          Buscar
        </Button>
      </div>
    </form>
  );
}