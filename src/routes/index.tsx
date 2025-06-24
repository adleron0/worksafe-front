import { createFileRoute } from '@tanstack/react-router'
import Home from '@/pages/Home/Home'
import { get } from '@/services/api'
import { IEntity } from '@/pages/Site-Services/interfaces/entity.interface'

interface ServicesResponse {
  rows: IEntity[];
  total: number;
}

export const Route = createFileRoute('/')({
  loader: async () => {
    // Pre-load services data
    const servicesParams = [
      { key: 'limit', value: 999 },
      { key: 'active', value: true },
      { key: 'order-name', value: 'asc' },
    ];
    
    const servicesData = await get<ServicesResponse>('site-services', '', servicesParams);
    
    return {
      services: servicesData,
    };
  },
  component: Index,
})

function Index() {
  const { services } = Route.useLoaderData();
  
  return (
    <>
      <Home preloadedServices={services} />
    </>
  )
}
