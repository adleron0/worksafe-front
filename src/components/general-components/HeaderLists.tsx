import useVerify from "@/hooks/use-verify";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "../ui/button";
import Icon from "../general-components/Icon";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useRef } from "react";

interface HeaderListsProps {
  // Propriedades
  titlePage?: string;
  descriptionPage?: string;
  entityName: string;
  ability: string;
  limit: number;
  searchParams?: any;
  showSearch?: boolean;
  showCreate?: boolean;
  showInputSearch?: boolean;
  iconForm?: string;
  addButtonName?: string;
  searchPlaceholder?: string;
  // Funções
  onlimitChange: (name: string, value: string | number) => void;
  openSearch: (open: boolean) => void;
  openForm: (open: boolean) => void;
  setFormData: (data: any) => void;
  setFormType: (type: string) => void;
  onTextSearch?: (searchText: string) => void;
}

const HeaderLists = ({
  // Propriedades
  titlePage,
  descriptionPage,
  entityName,
  ability,
  limit,
  searchParams,
  showSearch = true,
  showCreate = true,
  showInputSearch = false,
  iconForm,
  addButtonName = "Novo",
  searchPlaceholder = "Buscar...",
  // Funções
  onlimitChange,
  openSearch,
  openForm,
  setFormData,
  setFormType,
  onTextSearch,
}: HeaderListsProps) => {
  const { can } = useVerify();
  const [searchText, setSearchText] = useState("");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Efeito para debounce do input de busca
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      if (onTextSearch) {
        onTextSearch(searchText);
      }
    }, 300);
    
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchText, onTextSearch]);
  
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  };
  
  return (
    <>
      <div className="flex flex-col md:flex-row mb-4 items-start justify-between md:items-center">
        <div>
          <h1 className={`${!titlePage && "hidden"} text-xl font-bold`}>{titlePage}</h1>
          <span className={`${!descriptionPage && "hidden"} text-gray-600 dark:text-gray-100`}>{descriptionPage}</span>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {/* Main controls row */}
        <div className="flex gap-2 items-start justify-between md:items-center">
          <div className="flex flex-wrap justify-start items-center gap-2">
            <div className="flex items-baseline gap-2">
              <Label htmlFor="limit">Itens</Label>
              <Select
                onValueChange={(value) => onlimitChange("limit", Number(value))}
                value={searchParams.limit.toString()}
                
              >
                <SelectTrigger className="h-9 w-[70px]">
                  <SelectValue placeholder="" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="30">30</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value={`${limit > 100 ? limit : 200}`}>{limit > 100 ? limit : 200}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {showSearch && (
              <Button onClick={() => openSearch(true)} variant="default" className="text-muted h-9 bg-primary flex items-center">
                <Icon name="sliders-horizontal" className="w-3 h-3 md:mr-2" />
                <span className="hidden md:block">Filtro Avançado</span>
              </Button>
            )}

            {/* Search input for desktop only */}
            {showInputSearch && (
              <div className="relative hidden md:block">
                <Icon 
                  name="search" 
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" 
                />
                <Input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchText}
                  onChange={handleSearchInputChange}
                  className="h-9 pl-9 pr-3 w-[250px]"
                />
              </div>
            )}
          </div>
          
          {can(`create_${ability}`) && showCreate && (
            <Button onClick={() =>{ openForm(true); setFormData(null); setFormType("both")}} variant="outline" className="flex gap-2 items-center">
              <Icon name={iconForm || "plus"} className="w-3 h-3" />
              <span className="hidden md:block">{addButtonName} {entityName}</span>
            </Button>
          )}
        </div>

        {/* Search input on its own row on mobile */}
        {showInputSearch && (
          <div className="relative md:hidden w-full">
            <Icon 
              name="search" 
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" 
            />
            <Input
              type="text"
              placeholder={searchPlaceholder}
              value={searchText}
              onChange={handleSearchInputChange}
              className="h-9 pl-9 pr-3 w-full"
            />
          </div>
        )}
      </div>
    </>
  );
};

export default HeaderLists;
