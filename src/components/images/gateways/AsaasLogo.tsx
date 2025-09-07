const AsaasLogo = ({ className = "w-20 h-20" }: { className?: string }) => {
  return (
    <svg
      className={className}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="200" height="200" rx="20" fill="#FF6B00"/>
      <path
        d="M50 130L50 100C50 77.9086 67.9086 60 90 60H110C132.091 60 150 77.9086 150 100V130"
        stroke="white"
        strokeWidth="12"
        strokeLinecap="round"
      />
      <circle cx="75" cy="130" r="15" fill="white"/>
      <circle cx="125" cy="130" r="15" fill="white"/>
      <path
        d="M75 100H125"
        stroke="white"
        strokeWidth="8"
        strokeLinecap="round"
      />
    </svg>
  );
};

export default AsaasLogo;
