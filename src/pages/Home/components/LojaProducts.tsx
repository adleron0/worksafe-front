import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import Pagination from "@/components/general-components/Pagination";
import "./pagination-override.css";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  // CheckCircle,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { get } from "@/services/api";
import { ApiError, Response } from "@/general-interfaces/api.interface";
import { IEntity } from "@/pages/Site-Products/interfaces/entity.interface";

// Product Carousel Component
interface ProductCarouselProps {
  product: IEntity;
}

const ProductCarousel: React.FC<ProductCarouselProps> = ({ product }) => {
  // Create an array of all images (main image + additional images)
  const allImages = [
    { id: 0, imageUrl: product.imageUrl || '', name: product.name },
    ...(product.images || [])
  ].filter(img => img.imageUrl); // Filter out any empty URLs

  // If there's only one image, just return a regular image
  if (allImages.length <= 1) {
    return (
      <div className="aspect-square relative overflow-hidden">
        <img
          src={product.imageUrl || ''}
          alt={product.name}
          className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500"
          width={400}
          height={400}
        />
      </div>
    );
  }

  // Otherwise, return a carousel
  return (
    <div className="aspect-square relative overflow-hidden">
      <Carousel className="w-full h-full">
        <CarouselContent className="h-full">
          {allImages.map((image, index) => (
            <CarouselItem key={index} className="h-full">
              <div className="h-full">
                <CardContent className="flex items-center justify-center p-0 h-full">
                  <img
                    src={image.imageUrl}
                    alt={image.name || product.name}
                    className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500"
                    width={400}
                    height={400}
                  />
                </CardContent>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="absolute left-2 top-1/2 bg-primary-light border-0 text-xs h-6 w-6 -translate-y-1/2" />
        <CarouselNext className="absolute right-2 top-1/2 bg-primary-light border-0 text-xs h-6 w-6 -translate-y-1/2" />
      </Carousel>
    </div>
  );
};

interface LojaProductsProps {
  addToCart: (product: { id: number; name: string; imageUrl?: string }) => void;
  formatCurrency: (value: number) => string | undefined;
}

const LojaProducts: React.FC<LojaProductsProps> = ({ addToCart, formatCurrency }) => {
  const [showFilters, setShowFilters] = useState(false);
  
  // Define search params interface with optional properties
  interface SearchParams {
    limit: number;
    page: number;
    active: boolean;
    show: string;
    'order-name': string;
    name: string;
    'max-price'?: number;
    // 'min-price'?: number;
    featured?: boolean | null;
    showActiveOnly?: boolean;
  }
  
  // Search params state
  const [searchParams, setSearchParams] = useState<SearchParams>({
    limit: 10,
    page: 0,
    active: true,
    show: 'images',
    'order-name': 'asc',
    name: "",
    'max-price': 5000,
    // 'min-price': 0,
    featured: null,
    // showActiveOnly: true
  });
  
  const initialFormRef = useRef(searchParams);

  // Mock data for filters (will be replaced with real data later)
  const categories = ["Proteção contra Quedas", "Espaços Confinados", "EPIs", "Ferramentas"];
  const brands = ["3M", "MSA", "DBI-SALA", "Petzl", "Capital Safety"];

  const {
    data,
    isLoading,
    isError,
  } = useQuery<Response | undefined, ApiError>({
    queryKey: ["listAllSiteProducts", searchParams],
    queryFn: async () => {
      const params = Object.keys(searchParams).map((key) => ({
        key,
        value: searchParams[key as keyof typeof searchParams]
      }));
      return get<Response>('site-products', '', params);
    },
  });

  // Calculate pagination
  const totalProducts = data?.total || 0;
  const totalPages = Math.ceil(totalProducts / searchParams.limit);

  const handlePageChange = (page: number) => {
    setSearchParams(prev => ({ ...prev, page }));
    // Scroll to top of products section
    document.getElementById("produtos")?.scrollIntoView({ behavior: "smooth" });
  };
  
  const handleLimitChange = (value: string) => {
    setSearchParams(prev => ({ 
      ...prev, 
      limit: Number(value),
      page: 0 // Reset to first page when changing limit
    }));
  };

  const clearFilters = () => {
    setSearchParams({
      ...initialFormRef.current,
      page: 0,
      name: "",
    });
  };

  // Prepare skeleton grid for loading state
  const renderSkeletonGrid = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4 mb-12">
      {[...Array(searchParams.limit)].map((_, index) => (
        <Skeleton key={index} className="h-[500px] w-full rounded-lg" />
      ))}
    </div>
  );

  // --- Error State ---
  const renderErrorState = () => (
    <div className="mx-5 md:mx-20 lg:mx-40 2xl:mx-50 px-4 text-center">
      <h2 className="text-2xl text-red-600 font-bold mb-4">Erro ao carregar produtos</h2>
      <p className="text-gray-600">Não foi possível buscar os equipamentos. Tente novamente mais tarde.</p>
    </div>
  );

  // --- Empty State ---
  const renderEmptyState = () => (
    <div className="text-center">
      <h2 className="text-2xl text-gray-600 font-bold mb-4">Nenhum produto encontrado</h2>
      <p className="text-gray-500">Tente ajustar os filtros ou buscar por outro termo.</p>
    </div>
  );

  return (
    <section id="produtos" className="py-20 bg-gray-50">
      <div className="mx-5 md:mx-20 lg:mx-40 2xl:mx-50">
        <div className="text-center mb-16">
          <h2 className="section-title text-gray-800 text-3xl md:text-5xl font-bold md:pb-4">
            Nossa Loja
          </h2>
          <p className="text-gray-600 text-base md:text-lg max-w-2xl mx-auto">
            Oferecemos uma linha completa de equipamentos certificados para trabalho em altura e espaços confinados.
          </p>
        </div>

        {/* Search and Filter Bar */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-1/3">
              <Input
                type="text"
                placeholder="Buscar produtos..."
                value={searchParams.name}
                onChange={(e) => setSearchParams(prev => ({ ...prev, name: e.target.value }))}
                className="pl-10 pr-4 py-2 w-full border-gray-300 text-gray-900 focus:border-primary-light focus:ring-primary-light"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              {searchParams.name && (
                <button 
                  onClick={() => setSearchParams(prev => ({ ...prev, name: "" }))}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            
            <Button 
              variant="outline" 
              className="flex items-center gap-2 border-muted bg-black text-gray-100 hover:text-gray-900 hover:bg-gray-100 duration-200 ease-in-out"
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal className="h-4 w-4" />
              {showFilters ? "Ocultar Filtros" : "Mostrar Filtros"}
            </Button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white p-4 rounded-lg shadow-md mb-8 animate-in fade-in duration-300">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Filtros</h3>
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-700 hover:text-gray-900 hover:bg-gray-100">Limpar Filtros</Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Price Range Filter */}
              <div>
                <div>
                  <Label className="text-sm font-medium mb-2 block text-gray-900">Preço Máximo: R$ {searchParams['max-price'] || 5000}</Label>
                  <div className="mt-6 px-2">
                    <Slider
                      defaultValue={[5000]}
                      max={20000}
                      step={100}
                      value={[searchParams['max-price'] || 5000]}
                      onValueChange={(value) => setSearchParams(prev => ({ ...prev, 'max-price': value[0] }))}
                      className={cn("w-full data-[disabled]:opacity-50")}
                    />
                    <div className="flex justify-between text-sm text-gray-500 mt-2">
                      <span>R$ 0</span>
                      <span>R$ 20.000</span>
                    </div>
                  </div>
                </div>

                {/* <div>
                  <Label className="text-sm font-medium mb-2 block text-gray-900">Preço Mínimo: R$ {searchParams['min-price'] || 0}</Label>
                  <div className="mt-6 px-2">
                    <Slider
                      defaultValue={[0]}
                      max={20000}
                      step={100}
                      value={[searchParams['min-price'] || 0]}
                      onValueChange={(value) => setSearchParams(prev => ({ ...prev, 'min-price': value[0] }))}
                      className={cn("w-full data-[disabled]:opacity-50")}
                    />
                    <div className="flex justify-between text-sm text-gray-500 mt-2">
                      <span>R$ 0</span>
                      <span>R$ 20.000</span>
                    </div>
                  </div>
                </div> */}
              </div>
              
              {/* Categories Filter (UI only) */}
              <div>
                <Label className="text-sm font-medium mb-2 block text-gray-900">Categorias</Label>
                <div className="space-y-2 mt-2">
                  {categories.map((category) => (
                    <div key={category} className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        id={`category-${category}`} 
                        className="h-4 w-4 rounded border-gray-300 text-primary-light focus:ring-primary-light"
                      />
                      <label
                        htmlFor={`category-${category}`}
                        className="text-sm font-medium leading-none text-gray-700"
                      >
                        {category}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Brands Filter (UI only) */}
              <div>
                <Label className="text-sm font-medium mb-2 block text-gray-900">Marcas</Label>
                <div className="space-y-2 mt-2">
                  {brands.map((brand) => (
                    <div key={brand} className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        id={`brand-${brand}`} 
                        className="h-4 w-4 rounded border-gray-300 text-primary-light focus:ring-primary-light"
                      />
                      <label
                        htmlFor={`brand-${brand}`}
                        className="text-sm font-medium leading-none text-gray-700"
                      >
                        {brand}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Additional Filters */}
              <div>
                <Label className="text-sm font-medium mb-2 block text-gray-900">Tipo</Label>
                <div className="space-y-4 mt-2">
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="featured-only"
                      checked={searchParams.featured || false}
                      onCheckedChange={(checked) => setSearchParams(prev => ({ ...prev, featured: checked }))}
                      className="data-[state=unchecked]:bg-gray-200 data-[state=checked]:bg-primary-light"
                    />
                    <Label htmlFor="featured-only" className="text-sm text-gray-700">
                      Apenas Produtos Destaque
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="active-only"
                      checked={searchParams.showActiveOnly || true}
                      onCheckedChange={(checked) => setSearchParams(prev => ({ ...prev, showActiveOnly: checked }))}
                      className="data-[state=unchecked]:bg-gray-200 data-[state=checked]:bg-primary-light"
                    />
                    <Label htmlFor="active-only" className="text-sm text-gray-700">
                      Apenas Produtos Disponíveis
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results Summary and Items Per Page */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-4">
          <div className="text-sm text-gray-600">
            Exibindo {data?.rows?.length} de {totalProducts} produtos
          </div>
          
          <div className="flex items-baseline gap-2 mt-2 md:mt-0">
            <Label htmlFor="limit" className="text-xs text-gray-700">Itens</Label>
            <Select
              onValueChange={handleLimitChange}
              value={searchParams.limit.toString()}
            >
              <SelectTrigger className="h-9 border-gray-300 text-gray-900">
                <SelectValue placeholder="" />
              </SelectTrigger>
              <SelectContent className="bg-white text-gray-900 border-gray-300">
                <SelectItem value="10" className="text-gray-900">10</SelectItem>
                <SelectItem value="30" className="text-gray-900">30</SelectItem>
                <SelectItem value="50" className="text-gray-900">50</SelectItem>
                <SelectItem value="100" className="text-gray-900">100</SelectItem>
                <SelectItem value="200" className="text-gray-900">200</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Grid de Produtos */}
        {isLoading ? (
          renderSkeletonGrid()
        ) : isError ? (
          renderErrorState()
        ) : data?.rows?.length === 0 ? (
          renderEmptyState()
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4 mb-8">
            {data?.rows.map((product: IEntity) => (
              <Card key={product.id} className="h-full flex flex-col overflow-hidden group card-hover border-0 shadow-lg">
                <div className="relative">
                  <ProductCarousel product={product} />
                  {product.featured && (
                    <div className="absolute top-4 text-2xs md:text-xs left-4 bg-gradient-to-r from-green-400 to-primary-light text-white px-2 md:px-4 py-1 md:py-2 rounded-full font-semibold z-10">
                      Produto Destaque
                    </div>
                  )}
                </div>
                <div className="p-2 md:p-6 flex flex-col flex-grow bg-white">
                  <h3 className="text-base md:text-lg leading-tight text-black font-semibold mb-2">{product.name}</h3>
                  <p className="text-xs md:text-sm text-gray-600 mb-4">{product.description}</p>
                  {/* <ul className="space-y-1 md:space-y-2 mb-4 md:mb-8">
                    {product.features?.split('#').map((feature: string, idx: number) => (
                      <li key={idx} className="flex text-xs md:text-sm items-start md:items-center text-gray-700">
                        <CheckCircle className="w-2.5 md:w-4 h-2.5 md:h-4 text-primary-light mr-2 mt-1 flex-shrink-0" />
                        {feature.trim()}
                      </li>
                    ))}
                  </ul> */}
                  <div className="mt-auto">
                    { Number(product.price || 0) > 0 ? 
                      <div className="flex flex-col items-center mb-6">
                        <span className="text-sm text-gray-500 line-through">
                          { Number(product.oldPrice || 0) > 0 ? `${formatCurrency(product.oldPrice || 0)}` : '' }
                        </span>
                        <span className="text-3xl font-bold bg-primary-light bg-clip-text text-transparent">
                          { formatCurrency(product.price || 0) }
                        </span>
                      </div>
                     :
                      <div className="flex flex-col items-center justify-between mb-4">
                        <div className="flex flex-col items-center text-gray-700">
                          <span className="text-base md:text-xl font-bold text-primary-light">
                            Entre em contato
                          </span>
                          <span className="text-center text-xs md:text-sm">
                            Disponibilidade e valores sob consulta!
                          </span>
                        </div>
                      </div>
                    }

                    <Button
                      className="w-full text-xs md:text-sm xl:text-base bg-black hover:bg-primary-light text-white transition-colors border-0"
                      onClick={() => product.id && addToCart({ id: product.id, name: product.name, imageUrl: product.imageUrl ?? undefined })}
                      disabled={!product.active || !product.id}
                    >
                      {product.active ? "Adicionar ao Carrinho" : "Avise-me"}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {isLoading ? (
          <div className="text-center">
            <Skeleton className="h-12 w-32 mx-auto rounded-lg" />
          </div>
        ) : totalPages > 1 && (
          <div className="mt-8 flex justify-center">
            <div className="text-gray-600 pagination-fixed">
              <Pagination
                totalItems={totalProducts}
                itemsPerPage={searchParams.limit}
                currentPage={searchParams.page}
                onPageChange={handlePageChange}
                maxVisiblePages={5}
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default LojaProducts;
