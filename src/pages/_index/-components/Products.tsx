import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Plus,
  ChevronRight,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { get } from "@/services/api";
import { ApiError, Response } from "@/general-interfaces/api.interface";
import { IEntity } from "@/pages/_authenticated/site/_produtos/-interfaces/entity.interface";

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

interface ProductsProps {
  // Update addToCart prop type to include imageUrl
  addToCart: (product: { id: number; name: string; imageUrl?: string }) => void;
  formatCurrency: (value: number) => string | undefined;
}

const Products: React.FC<ProductsProps> = ({ addToCart, formatCurrency }) => {
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [windowWidth, setWindowWidth] = useState(1024);
  const navigate = useNavigate();

  const {
    data,
    isLoading,
    isError, // Add isError for error handling
  } = useQuery<Response | undefined, ApiError>({ // Revert type to Response
    queryKey: ["listSiteProducts"],
    queryFn: async () => {
      const params = [
        { key: 'limit', value: 5 },
        { key: 'active', value: true },
        { key: 'show', value: 'images' },
        { key: 'order-name', value: 'asc' },
      ];
      // Ensure the get function returns the expected Response structure
      return get<Response>('site-products', '', params); // Use Response here too
    },
  });

  // Process products from data
  const products: IEntity[] = data?.rows || []; // Add type annotation
  const featuredProduct = products.find((product: IEntity) => product.featured); // Add type

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  let initialCount;
  if (windowWidth < 768) {
    initialCount = 4;
  } else if (windowWidth < 1024) {
    initialCount = 4;
  } else {
    initialCount = 4; // Keep initial count logic
  }

  // Filter out the featured product for the grid display
  const nonFeaturedProducts = products.filter((product: IEntity) => !product.featured); // Add type
  const displayedProducts = showAllProducts ? nonFeaturedProducts : nonFeaturedProducts.slice(0, initialCount);

  // --- Loading State ---
  if (isLoading) {
    return (
      <section id="produtos" className="py-20 bg-gray-50">
        <div className="mx-5 md:mx-20 lg:mx-40 2xl:mx-50 px-4">
          <div className="text-center mb-16">
            <Skeleton className="h-10 w-1/2 mx-auto mb-6" />
            <Skeleton className="h-6 w-3/4 mx-auto" />
          </div>
          {/* Skeleton for Featured Product */}
          <div className="mb-16">
             <Skeleton className="h-[400px] w-full rounded-2xl" />
          </div>
          {/* Skeleton for Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-4 mb-12">
            {[...Array(initialCount)].map((_, index) => (
              <Skeleton key={index} className="h-[500px] w-full rounded-lg" />
            ))}
          </div>
           <div className="text-center">
             <Skeleton className="h-12 w-32 mx-auto rounded-lg" />
           </div>
        </div>
      </section>
    );
  }

  // --- Error State ---
  if (isError || !data?.rows.length) {
    return (
      <section id="produtos" className="py-20 bg-gray-50">
        <div className="mx-5 md:mx-20 lg:mx-40 2xl:mx-50 px-4 text-center">
          {/* <h2 className="text-2xl text-red-600 font-bold mb-4">Erro ao carregar produtos</h2> */}
          {/* <p className="text-gray-600">Não foi possível buscar os equipamentos. Tente novamente mais tarde.</p> */}
        </div>
      </section>
    );
  }

  // --- Render Products ---
  // Ensure featuredProduct exists before rendering its section
  const renderFeaturedProduct = featuredProduct && (
    <div className="mb-16">
      <div className="bg-white rounded-2xl overflow-hidden shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="relative h-64 md:h-full">
            <div className="absolute inset-0">
              <ProductCarousel product={featuredProduct} />
            </div>
            <div className="absolute top-4 text-2xs md:text-sm left-4 bg-gradient-to-r from-green-400 to-primary-light text-white px-2 md:px-4 py-1 md:py-2 rounded-full font-semibold z-10">
              Produto Destaque
            </div>
          </div>
          <div className="p-4 flex flex-col justify-center">
            <h3 className="text-base md:text-2xl text-black font-bold md:mb-4">{featuredProduct.name}</h3>
            <p className="text-gray-600 text-sm md:text-base mb-2 md:mb-6">{featuredProduct.description}</p>
            <ul className="space-y-1 md:space-y-2 mb-4 md:mb-8">
              {/* Split features string */}
              {featuredProduct.features?.split('#').map((feature: string, idx: number) => ( // Add types
                <li key={idx} className="flex text-xs md:text-sm items-start md:items-center text-gray-700">
                  <CheckCircle className="w-2.5 md:w-4 h-2.5 md:h-4 text-primary-light mr-2 mt-1 flex-shrink-0" />
                  {feature.trim()} {/* Trim whitespace */}
                </li>
              ))}
            </ul>
            { Number(featuredProduct.price || 0) > 0 ? // Default price to 0
                <div className="flex flex-col items-center mb-6">
                  <span className="text-sm text-gray-500 line-through">
                    {/* Default oldPrice to 0 */}
                    { Number(featuredProduct.oldPrice || 0) > 0 ? `${formatCurrency(featuredProduct.oldPrice || 0)}` : '' }
                  </span>
                  <span className="text-3xl font-bold bg-primary-light bg-clip-text text-transparent">
                    {/* Default price to 0 */}
                    { formatCurrency(featuredProduct.price || 0) }
                  </span>
                </div>
               :
                <div className="flex flex-col items-center justify-between mb-4">
                  <div className="flex flex-col items-center text-gray-700">
                    <span className="text-lg md:text-2xl font-bold text-primary-light">
                      Entre em contato
                    </span>
                    <span className="text-center text-xs md:text-sm">
                      Disponibilidade e valores sob consulta!
                    </span>
                  </div>
                </div>
              }
            <div className="flex gap-4">
              <Button
                // Ensure id exists before adding to cart and pass imageUrl (convert null to undefined)
                onClick={() => featuredProduct.id && addToCart({ id: featuredProduct.id, name: featuredProduct.name, imageUrl: featuredProduct.imageUrl ?? undefined })}
                disabled={!featuredProduct.active || !featuredProduct.id} // Also disable if no id
                size="lg"
                className={cn(
                  "flex-1 bg-primary-light hover:brightness-110 text-white",
                  !featuredProduct.active && "cursor-not-allowed opacity-50 bg-black"
                )}
              >
                {featuredProduct.active ? "Adicionar ao Carrinho" : "Avise-me"}
              </Button>
            </div>
          </div>
        </div>
      </div>
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

        {/* Render Featured Product if it exists */}
        {renderFeaturedProduct}

        {/* Grid de Produtos */}
        {nonFeaturedProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4 mb-12">
            {displayedProducts.map((product: IEntity) => ( // Add type
              <Card id={product.id === products[2]?.id ? "grid-produtos" : undefined} key={product.id} className="h-full flex flex-col overflow-hidden group card-hover border-0 shadow-lg"> {/* Use product.id for key and adjust scroll target logic */}
                <ProductCarousel product={product} />
                <div className="p-2 md:p-6 flex flex-col flex-grow bg-white">
                  <h3 className="text-base md:text-lg leading-tight text-black font-semibold mb-2">{product.name}</h3>
                  <p className="text-xs md:text-sm text-gray-600 mb-4">{product.description}</p>
                  <ul className="space-y-1 md:space-y-2 mb-4 md:mb-8">
                    {/* Split features string */}
                    {product.features?.split('#').map((feature: string, idx: number) => ( // Add types
                      <li key={idx} className="flex text-xs md:text-sm items-start md:items-center text-gray-700">
                        <CheckCircle className="w-2.5 md:w-4 h-2.5 md:h-4 text-primary-light mr-2 mt-1 flex-shrink-0" />
                        {feature.trim()} {/* Trim whitespace */}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto">
                    { Number(product.price || 0) > 0 ? // Default price to 0
                      <div className="flex flex-col items-center mb-6">
                        <span className="text-sm text-gray-500 line-through">
                          {/* Default oldPrice to 0 */}
                          { Number(product.oldPrice || 0) > 0 ? `${formatCurrency(product.oldPrice || 0)}` : '' }
                        </span>
                        <span className="text-3xl font-bold bg-primary-light bg-clip-text text-transparent">
                          {/* Default price to 0 */}
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
                      className="w-full text-xs md:text-sm xl:text-base bg-black hover:bg-primary-light text-white transition-colors"
                      // Ensure id exists before adding to cart and pass imageUrl (convert null to undefined)
                      onClick={() => product.id && addToCart({ id: product.id, name: product.name, imageUrl: product.imageUrl ?? undefined })}
                      disabled={!product.active || !product.id} // Also disable if no id
                    >
                      {product.active ? "Adicionar ao Carrinho" : "Avise-me"}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          // Optional: Message if no non-featured products are available
          !featuredProduct && <p className="text-center text-gray-600 mb-12">Nenhum produto disponível no momento.</p>
        )}


        {/* Botão "Ver Mais" / "Ocultar" - Only show if there are more products than initially displayed */}
        {nonFeaturedProducts.length > initialCount && (
          <div className="text-center mb-8">
            <Button
              size="lg"
              className="bg-primary-light hover:brightness-110 ease-in-out duration-200 text-white text-lg px-8 shadow-lg"
              onClick={() => {
                const shouldShowAll = !showAllProducts;
                setShowAllProducts(shouldShowAll);
                // Scroll into view logic needs adjustment - scrolling to the grid container might be better
                if (!shouldShowAll) {
                   const gridElement = document.querySelector('.grid.grid-cols-1'); // More robust selector
                   gridElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
            >
              {showAllProducts ? (
                <>
                  Ocultar <ChevronRight className="ml-2 rotate-180" />
                </>
              ) : (
                <>
                  Ver Mais <Plus className="ml-2" />
                </>
              )}
            </Button>
          </div>
        )}
        
        {/* Botão para a página da loja */}
        <div className="text-center mt-8">
          <a onClick={() => {navigate({to: `/loja`})}} href="#produtos">
            <Button
              size="lg"
              className="bg-primary-light hover:bg-primary-light/80 ease-in-out duration-200 text-white text-lg px-8 shadow-lg"
            >
              Visitar Nossa Loja Completa <ChevronRight className="ml-2" />
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
};

export default Products;
