import { useMatches, useRouter } from '@tanstack/react-router';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink, 
  BreadcrumbList, 
  BreadcrumbPage, 
  BreadcrumbSeparator 
} from '@/components/ui/breadcrumb';
import React from 'react';

const BreadCrumbs = () => {
  const matches = useMatches();
  const router = useRouter();
  const pathName = matches[2].pathname.endsWith('/') ? matches[2].pathname.slice(0, -1) : matches[2].pathname;
  const pathArray = pathName.split('/');

  return (
    <div className="px-4 py-2 border-b">
    <Breadcrumb className="flex">
      <BreadcrumbList>
        {pathArray.map((path, index) => {

          if (!path || path === '/' ) {
            return null;
          }

          const isLast = index === pathArray.length - 1;
          return (
            <React.Fragment key={path}>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{path}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink 
                    onClick={() => {
                      const targetPath = `/${pathArray.slice(0, index + 1).join('/')}`;
                      router.navigate({ to: targetPath as any });
                    }}
                    className="cursor-pointer"
                  >
                    {path}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  </div>
  );
};

export default BreadCrumbs;
