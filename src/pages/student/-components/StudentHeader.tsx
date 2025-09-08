import { Search, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StudentAvatar } from './StudentAvatar';
import { useStudentAuth } from '@/context/StudentAuthContext';
import { useSidebar } from '@/components/ui/sidebar';
import { ThemeToggle } from '@/components/general-components/ThemeToggle';

export function StudentHeader() {
  const { studentData } = useStudentAuth();
  const { toggleSidebar } = useSidebar();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-4 gap-4">
        {/* Menu Mobile - apenas em telas pequenas */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={toggleSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Espaço vazio onde estava a logo */}
        <div className="flex-shrink-0" />

        {/* Search Bar (desktop) */}
        {/* <div className="hidden md:flex flex-1 max-w-md mx-auto">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="search"
              placeholder="Buscar cursos, certificados..."
              className="pl-9 bg-muted/50"
            />
          </div>
        </div> */}

        {/* Right side */}
        <div className="flex items-center gap-4 ml-auto">
          {/* Theme Toggle */}
          <ThemeToggle />

          {/* User info */}
          <div className="hidden md:flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium leading-none">
                {studentData?.name || 'Aluno'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {studentData?.cpf ? `CPF: ${studentData.cpf}` : studentData?.email}
              </p>
            </div>
            <StudentAvatar />
          </div>

          {/* Mobile Avatar */}
          <div className="md:hidden">
            <StudentAvatar />
          </div>
        </div>
      </div>
    </header>
  );
}