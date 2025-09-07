const StripeLogo = ({ className = "w-20 h-20" }: { className?: string }) => {
  return (
    <svg
      className={className}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="200" height="200" rx="20" fill="#635BFF"/>
      <path
        d="M90 65C90 65 85 67 85 72C85 77 90 79 95 79C100 79 110 77 110 70C110 63 100 61 95 61C90 61 80 63 80 72C80 81 90 83 95 83C100 83 115 81 115 70"
        stroke="white"
        strokeWidth="8"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M90 115C90 115 85 117 85 122C85 127 90 129 95 129C100 129 110 127 110 120C110 113 100 111 95 111C90 111 80 113 80 122C80 131 90 133 95 133C100 133 115 131 115 120"
        stroke="white"
        strokeWidth="8"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
};

export default StripeLogo;
