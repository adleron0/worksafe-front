// src/pages/Home.tsx
import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
// import gptFactory from "../assets/gpt-factory.webp";
import buildingSafety from "../assets/building-safety-animate.svg";
import createAnimate from "../assets/create-animate.svg";
import questions from "../assets/questions-animate.svg";

const Home = () => {
  const navigate = useNavigate();

  const handleLogin = () => {
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header com navegação e botão de login */}
      <header className="bg-white shadow-xs sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-3xl font-bold text-blue-700">
              <span className="text-blue-900">Safety</span>Start
            </h1>
          </div>
          <nav className="hidden md:flex space-x-8">
            <a href="#modulos" className="text-gray-600 hover:text-blue-700 transition-colors">Módulos</a>
            <a href="#beneficios" className="text-gray-600 hover:text-blue-700 transition-colors">Benefícios</a>
            <a href="#depoimentos" className="text-gray-600 hover:text-blue-700 transition-colors">Depoimentos</a>
            <a href="#faq" className="text-gray-600 hover:text-blue-700 transition-colors">FAQ</a>
          </nav>
          <Button 
            onClick={handleLogin} 
            className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-2"
          >
            Entrar
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative bg-linear-to-r from-blue-50 via-blue-100 to-blue-50">
        <div className="absolute inset-0 bg-grid-blue-700/[0.05] bg-[size:20px_20px]"></div>
        <div className="container mx-auto w-full flex flex-col items-center gap-8 px-6 py-24 text-center lg:text-left lg:flex-row lg:justify-between lg:items-center relative z-10">
          <div className="lg:w-1/2 animate-fade-in-up">
            <div className="inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-800 font-medium text-sm mb-6 border border-blue-200">
              Plataforma Líder em Segurança do Trabalho
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
              Hub de <span className="text-blue-700">Segurança</span> do Trabalho
            </h1>
            <p className="text-xl text-gray-700 mb-8 max-w-2xl leading-relaxed">
              Transforme a gestão de segurança da sua indústria com nossa plataforma completa. 
              Reduza riscos, garanta conformidade e proteja o que mais importa: seus colaboradores.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button 
                onClick={handleLogin} 
                className="bg-blue-700 hover:bg-blue-800 text-white px-8 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              >
                Começar Agora
              </Button>
              <Button 
                variant="outline"
                className="border-blue-700 bg-transparent text-blue-700 hover:bg-blue-700 hover:text-white px-8 py-4 text-lg font-semibold rounded-xl transition-all duration-300"
                onClick={() => document.getElementById('modulos')?.scrollIntoView({behavior: 'smooth'})}
              >
                Conhecer Módulos
              </Button>
            </div>
          </div>
          <div className="mt-8 lg:mt-0 lg:w-1/2">
            <div className="relative">
              <div className="absolute -inset-1"></div>
              <img
                src={createAnimate}
                alt="Segurança Industrial"
                className="relative rounded-2xl  max-w-full h-auto"
              />
            </div>
          </div>
        </div>
        
        {/* Stats */}
        <div className="container static md:absolute bottom-0 left-0 right-0 mx-auto px-6 pb-16 z-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 bg-white rounded-xl shadow-lg p-8 -mb-32 relative z-20">
            <div className="text-center">
              <p className="text-4xl font-bold text-blue-700 mb-2">98%</p>
              <p className="text-gray-600">Redução de acidentes em clientes</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-blue-700 mb-2">+500</p>
              <p className="text-gray-600">Empresas utilizando nossa plataforma</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-blue-700 mb-2">100%</p>
              <p className="text-gray-600">Conformidade com normas regulatórias</p>
            </div>
          </div>
        </div>
      </div>

      {/* Módulos Disponíveis */}
      <div id="modulos" className="container mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Módulos Especializados
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Nossa plataforma oferece módulos completos para cada aspecto da segurança do trabalho,
            permitindo uma gestão integrada e eficiente.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            {
              title: "Controle de EPI",
              description: "Gerencie todo o ciclo de vida dos equipamentos de proteção, desde a aquisição até o descarte, com controle de validade e conformidade.",
              icon: "🛡️"
            },
            {
              title: "Treinamentos de Segurança",
              description: "Plataforma completa para gestão de treinamentos, com controle de certificações, vencimentos e histórico de capacitações.",
              icon: "🎓"
            },
            {
              title: "Análise de Riscos",
              description: "Ferramentas avançadas para identificação, avaliação e mitigação de riscos ocupacionais, com metodologias reconhecidas internacionalmente.",
              icon: "⚠️"
            },
            {
              title: "Gestão de Conformidade",
              description: "Mantenha-se atualizado com as normas regulamentadoras e garanta a conformidade legal da sua empresa com alertas automáticos.",
              icon: "✅"
            },
            {
              title: "Inspeções de Equipamentos",
              description: "Automatize o processo de inspeção de equipamentos críticos, com checklists personalizados e registro fotográfico.",
              icon: "🔍"
            },
            {
              title: "Relatórios Personalizados",
              description: "Dashboards e relatórios customizáveis para acompanhamento de indicadores de segurança e tomada de decisões estratégicas.",
              icon: "📊"
            },
          ].map((modulo, index) => (
            <div
              key={index}
              className="bg-white p-8 rounded-xl shadow-md hover:shadow-xl transition-shadow border-t-4 border-blue-600"
            >
              <div className="text-4xl mb-4">{modulo.icon}</div>
              <h3 className="text-2xl font-semibold mb-4 text-gray-800">{modulo.title}</h3>
              <p className="text-gray-600">
                {modulo.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Como Funciona */}
      <div className="bg-gray-100 py-24">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Como Nossa Plataforma Funciona
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Uma solução completa e integrada para transformar a gestão de segurança da sua empresa
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-6">1</div>
              <h3 className="text-2xl font-semibold mb-4 text-gray-800">Diagnóstico</h3>
              <p className="text-gray-600">
                Avaliamos a situação atual da sua empresa, identificando pontos críticos e oportunidades de melhoria na gestão de segurança.
              </p>
            </div>
            
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-6">2</div>
              <h3 className="text-2xl font-semibold mb-4 text-gray-800">Implementação</h3>
              <p className="text-gray-600">
                Configuramos a plataforma de acordo com as necessidades específicas do seu negócio, integrando com sistemas existentes.
              </p>
            </div>
            
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-6">3</div>
              <h3 className="text-2xl font-semibold mb-4 text-gray-800">Transformação</h3>
              <p className="text-gray-600">
                Acompanhamos os resultados, oferecendo suporte contínuo e melhorias para garantir a excelência em segurança do trabalho.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Benefícios */}
      <div id="beneficios" className="container mx-auto px-6 py-24">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          <div className="lg:w-1/2">
            <img 
              src={buildingSafety} 
              alt="Benefícios de Segurança" 
              className="rounded-xl max-w-full h-auto"
            />
          </div>
          <div className="lg:w-1/2">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Benefícios Comprovados
            </h2>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="bg-green-100 p-2 rounded-full text-green-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl text-gray-800 font-semibold mb-2">Redução de Acidentes</h3>
                  <p className="text-gray-600">Diminua significativamente a ocorrência de acidentes de trabalho com gestão preventiva e proativa.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="bg-green-100 p-2 rounded-full text-green-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl text-gray-800 font-semibold mb-2">Conformidade Legal</h3>
                  <p className="text-gray-600">Mantenha sua empresa em dia com todas as normas regulamentadoras e evite multas e sanções.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="bg-green-100 p-2 rounded-full text-green-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl text-gray-800 font-semibold mb-2">Aumento de Produtividade</h3>
                  <p className="text-gray-600">Ambientes seguros são mais produtivos. Reduza absenteísmo e aumente o engajamento dos colaboradores.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="bg-green-100 p-2 rounded-full text-green-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl text-gray-800 font-semibold mb-2">Redução de Custos</h3>
                  <p className="text-gray-600">Diminua gastos com afastamentos, indenizações e seguros através de uma gestão eficiente de segurança.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Depoimentos */}
      <div id="depoimentos" className="bg-blue-700 py-24 text-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              O Que Nossos Clientes Dizem
            </h2>
            <p className="text-xl opacity-90 max-w-3xl mx-auto">
              Empresas que transformaram sua gestão de segurança com nossa plataforma
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-8 text-gray-800">
              <div className="flex items-center mb-4">
                <div className="text-yellow-400 flex">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              </div>
              <p className="text-gray-600 mb-6">
                "Desde que implementamos o Hub de Segurança, reduzimos em 85% os acidentes de trabalho e melhoramos significativamente nossa conformidade com as normas regulatórias."
              </p>
              <div>
                <p className="font-semibold">Carlos Silva</p>
                <p className="text-gray-500 text-sm">Gerente de SSMA, Indústria Metalúrgica</p>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-8 text-gray-800">
              <div className="flex items-center mb-4">
                <div className="text-yellow-400 flex">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              </div>
              <p className="text-gray-600 mb-6">
                "A facilidade de uso e a integração entre os módulos nos permitiu ter uma visão completa da segurança em todas as nossas unidades. O suporte técnico é excepcional."
              </p>
              <div>
                <p className="font-semibold">Ana Oliveira</p>
                <p className="text-gray-500 text-sm">Coordenadora de Segurança, Indústria Química</p>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-8 text-gray-800">
              <div className="flex items-center mb-4">
                <div className="text-yellow-400 flex">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              </div>
              <p className="text-gray-600 mb-6">
                "O retorno sobre o investimento foi impressionante. Além da redução de acidentes, economizamos em processos administrativos e ganhamos agilidade nas auditorias."
              </p>
              <div>
                <p className="font-semibold">Roberto Mendes</p>
                <p className="text-gray-500 text-sm">Diretor Industrial, Setor Alimentício</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div id="faq" className="container mx-auto px-6 py-24 bg-white rounded-3xl shadow-xs my-12">
        <div className="flex flex-col lg:flex-row items-start gap-12">
          <div className="lg:w-1/2">
            <div className="inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-800 font-medium text-sm mb-4">FAQ</div>
            <h2 className="text-4xl font-bold text-gray-900 mb-8">
              Perguntas Frequentes
            </h2>
            
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1" className="border-b border-gray-200">
                <AccordionTrigger className="text-xl text-start font-semibold py-4 hover:no-underline text-gray-800">
                  Quanto tempo leva para implementar a plataforma?
                </AccordionTrigger>
                <AccordionContent className="text-gray-600 text-base pb-4">
                  A implementação básica pode ser feita em apenas 2 semanas. Para configurações mais complexas e integrações com outros sistemas, o prazo pode variar de 4 a 8 semanas.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="item-2" className="border-b border-gray-200">
                <AccordionTrigger className="text-xl text-start font-semibold py-4 hover:no-underline text-gray-800">
                  A plataforma é compatível com dispositivos móveis?
                </AccordionTrigger>
                <AccordionContent className="text-gray-600 text-base pb-4">
                  Sim, nossa plataforma é totalmente responsiva e possui aplicativos dedicados para iOS e Android, permitindo acesso e gestão em campo.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="item-3" className="border-b border-gray-200">
                <AccordionTrigger className="text-xl text-start font-semibold py-4 hover:no-underline text-gray-800">
                  Como é feito o suporte técnico?
                </AccordionTrigger>
                <AccordionContent className="text-gray-600 text-base pb-4">
                  Oferecemos suporte técnico 24/7 através de chat, e-mail e telefone. Além disso, disponibilizamos uma base de conhecimento completa e treinamentos periódicos.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="item-4" className="border-b border-gray-200">
                <AccordionTrigger className="text-xl text-start font-semibold py-4 hover:no-underline text-gray-800">
                  É possível personalizar a plataforma para nossas necessidades específicas?
                </AccordionTrigger>
                <AccordionContent className="text-gray-600 text-base pb-4">
                  Absolutamente. Nossa plataforma é modular e altamente customizável, permitindo adaptar fluxos de trabalho, formulários e relatórios às necessidades específicas da sua empresa.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="item-5" className="border-b border-gray-200">
                <AccordionTrigger className="text-xl text-start font-semibold py-4 hover:no-underline text-gray-800">
                  Quais são os requisitos técnicos para utilizar a plataforma?
                </AccordionTrigger>
                <AccordionContent className="text-gray-600 text-base pb-4">
                  Nossa plataforma é baseada em nuvem e pode ser acessada através de qualquer navegador moderno. Não há necessidade de instalação de software adicional, apenas uma conexão estável com a internet.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
          
          <div className="lg:w-1/2 flex justify-center">
            <img 
              src={questions} 
              alt="Perguntas Frequentes" 
              className="max-w-full h-auto rounded-2xl"
            />
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-linear-to-r from-blue-600 to-blue-800 py-20 text-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Pronto para Transformar a Segurança da Sua Empresa?
          </h2>
          <p className="text-xl opacity-90 max-w-3xl mx-auto mb-10">
            Junte-se a centenas de empresas que já transformaram sua gestão de segurança do trabalho com nossa plataforma.
          </p>
          <Button 
            onClick={handleLogin} 
            className="bg-white text-blue-700 hover:bg-gray-100 px-10 py-4 text-lg font-semibold rounded-full"
          >
            Começar Agora
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white pt-16 pb-8">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            <div>
              <h3 className="text-2xl font-bold mb-6">
                <span className="text-blue-400">Safety</span>Start
              </h3>
              <p className="text-gray-400 mb-6">
                Transformando a gestão de segurança do trabalho com tecnologia e inovação.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-6">Módulos</h4>
              <ul className="space-y-4">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Controle de EPI</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Treinamentos</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Análise de Riscos</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Gestão de Conformidade</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Inspeções</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-6">Empresa</h4>
              <ul className="space-y-4">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Sobre nós</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Carreiras</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Parceiros</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Contato</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-6">Suporte</h4>
              <ul className="space-y-4">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Central de Ajuda</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Documentação</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Status</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Política de Privacidade</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Termos de Serviço</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-gray-400 text-sm">© 2024 SafetyStart. Todos os direitos reservados.</p>
              <div className="mt-4 md:mt-0">
                <p className="text-gray-400 text-sm">Feito com ❤️ por Adleron</p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
