const MercadoPagoLogo = ({ className = "w-20 h-20" }: { className?: string }) => {
  return (
    <svg
      className={className}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="200" height="200" rx="20" fill="#00B1EA"/>
      <circle cx="100" cy="85" r="30" fill="white"/>
      <path
        d="M70 115C70 115 85 130 100 130C115 130 130 115 130 115"
        stroke="white"
        strokeWidth="8"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="90" cy="80" r="5" fill="#00B1EA"/>
      <circle cx="110" cy="80" r="5" fill="#00B1EA"/>
    </svg>
  );
};

export default MercadoPagoLogo;
