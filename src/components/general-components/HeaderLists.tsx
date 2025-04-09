import useVerify from "@/hooks/use-verify";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "../ui/button";
import Icon from "../general-components/Icon";

interface HeaderListsProps {
  // Propriedades
  titlePage: string;
  descriptionPage: string;
  entityName: string;
  ability: string;
  limit: number;
  searchParams?: any;
  iconForm?: string;
  // Funções
  onlimitChange: (name: string, value: string | number) => void;
  openSearch: (open: boolean) => void;
  openForm: (open: boolean) => void;
  setFormData: (data: any) => void;
  setFormType: (type: string) => void;
}

const HeaderLists = ({
  // Propriedades
  titlePage,
  descriptionPage,
  entityName,
  ability,
  limit,
  searchParams,
  iconForm,
  // Funções
  onlimitChange,
  openSearch,
  openForm,
  setFormData,
  setFormType,
}: HeaderListsProps) => {
  const { can } = useVerify();
  
  return (
    <>
      <div className="flex flex-col md:flex-row mb-4 items-start justify-between md:items-center">
        <div>
          <h1 className="text-xl font-bold">{titlePage}</h1>
          <span className="text-gray-600 dark:text-gray-100">{descriptionPage}</span>
        </div>
      </div>
      <div className="flex my-2 gap-2 items-start justify-between md:items-center">
        <div className="flex justify-start items-center gap-2">
          <div className="flex items-baseline gap-2">
            <Label htmlFor="limit">Itens</Label>
            <Select
              onValueChange={(value) => onlimitChange("limit", Number(value))}
              value={searchParams.limit.toString()}
              
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="30">30</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value={`${limit || 0}`}>{limit || 0}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={() => openSearch(true)} variant="default" className="text-muted h-9 bg-primary flex items-center">
            <Icon name="sliders-horizontal" className="w-3 h-3 md:mr-2" />
            <span className="hidden md:block">Filtro Avançado</span>
          </Button>
         
        </div>
        {
          can(`create_${ability}`) && (
            <Button onClick={() =>{ openForm(true); setFormData(null); setFormType("both")}} variant="outline" className="flex gap-2 items-center">
              <Icon name={iconForm || "square-plus"} className="w-3 h-3" />
              <span className="hidden md:block">Novo {entityName}</span>
            </Button>
          )
        }
      </div>
    </>
  );
};

export default HeaderLists;
