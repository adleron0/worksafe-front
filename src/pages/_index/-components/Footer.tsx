import { Phone } from "lucide-react";
import DynamicLogo from "@/components/general-components/DynamicLogo";
import { useTheme } from "@/context/ThemeContext";

// Função para formatar número de telefone
const formatPhoneNumber = (phoneNumber: string | null | undefined) => {
  if (!phoneNumber) return "Não informado";
  const numerosLimpos = phoneNumber.replace(/\D/g, "");
  if (numerosLimpos.length === 11) {
    return `(${numerosLimpos.slice(0, 2)}) ${numerosLimpos[2]}-${numerosLimpos.slice(
      3,
      7
    )}-${numerosLimpos.slice(7)}`;
  } else if (numerosLimpos.length === 10) {
    return `(${numerosLimpos.slice(0, 2)}) ${numerosLimpos.slice(
      2,
      6
    )}-${numerosLimpos.slice(6)}`;
  } else {
    return "Número inválido";
  }
};

export default function Footer() {
  const { theme } = useTheme();
  const company = theme.companyData;

  // Monta o endereço completo
  const getFullAddress = () => {
    if (!company) return null;
    
    const parts = [];
    if (company.address) parts.push(company.address);
    if (company.addressNumber) parts.push(`N ${company.addressNumber}`);
    if (company.addressComplement) parts.push(company.addressComplement);
    
    const line1 = parts.join(', ');
    
    const line2Parts = [];
    if (company.neighborhood) line2Parts.push(company.neighborhood);
    if (company.city?.name) line2Parts.push(company.city.name);
    if (company.state?.uf) line2Parts.push(company.state.uf);
    
    const line2 = line2Parts.join(' - ');
    
    return { line1, line2 };
  };

  const address = getFullAddress();

  return (
    <footer className="bg-secondary text-white py-20">
      <div className="mx-5 md:mx-20 lg:mx-40 2xl:mx-50 px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          <div>
            <div className="mb-6">
              <DynamicLogo width={180} height={60} forceWhite={true} />
            </div>
            <p className="text-gray-400 mb-6">
              {company?.description || "Especialistas em segurança industrial para trabalhos em altura e espaços confinados."}
            </p>
            <div className="flex gap-4">
              {company?.facebookUrl && (
                <a href={company.facebookUrl} className="text-gray-400 hover:text-primary-light">
                {/* Ícone do Facebook */}
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                </a>
              )}
              {company?.instagramUrl && (
                <a href={company.instagramUrl} className="text-gray-400 hover:text-primary-light">
                {/* Ícone do Instagram */}
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.897 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.897-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z" />
                </svg>
                </a>
              )}
              {company?.linkedinUrl && (
                <a href={company.linkedinUrl} className="text-gray-400 hover:text-primary-light">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
                </a>
              )}
            </div>
          </div>
          <div>
            <h4 className="text-lg font-semibold mb-4">Links Rápidos</h4>
            <ul className="space-y-2">
              <li>
                <a href="https://www.worksafebrasil.com.br/sobre" className="text-gray-400 cursor-pointer hover:text-primary-light">
                  Sobre Nós
                </a>
              </li>
              <li>
                <a href="https://www.worksafebrasil.com.br#servicos" className="text-gray-400 cursor-pointer hover:text-primary-light">
                  Serviços
                </a>
              </li>
              <li>
                <a href="https://www.worksafebrasil.com.br/loja" className="text-gray-400 cursor-pointer hover:text-primary-light">
                  Loja
                </a>
              </li>
              {/* <li>
                <a href="/#aluguel" className="text-gray-400 cursor-pointer hover:text-primary-light">
                  Aluguel
                </a>
              </li> */}
              <li>
                <a href="https://www.worksafebrasil.com.br/treinamento" className="text-gray-400 cursor-pointer hover:text-primary-light">
                  Treinamentos
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-semibold mb-4">Contato</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-gray-400">
                <Phone className="w-5 h-5 mt-1" />
                <div>
                  <p>Comercial</p>
                  <p className="text-white">{formatPhoneNumber(company?.representative_contact)}</p>
                </div>
              </li>
              <li className="flex items-start gap-3 text-gray-400">
                <svg className="w-5 h-5 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <div>
                  <p>E-mail</p>
                  <p className="text-white">{company?.representative_email || "contato@worksafebrasil.com.br"}</p>
                </div>
              </li>
              <li className="flex items-start gap-3 text-gray-400">
                <svg className="w-5 h-5 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div>
                  <p>Endereço</p>
                  <p className="text-white">
                    {address ? (
                      <>
                        {address.line1}
                        <br />
                        {address.line2}
                      </>
                    ) : (
                      <>
                        Rod. BR-101 Sul, N 1781, Galpão H
                        <br />
                        Cabo de Santo Agostinho - PE
                      </>
                    )}
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-16 pt-8 text-center text-gray-400">
          <p>
            © {new Date().getFullYear()} {company?.comercial_name || "WORKSAFE BRASIL"}. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
