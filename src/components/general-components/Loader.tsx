import { CgSpinnerTwoAlt } from "react-icons/cg";

const Loader = ({ title }: {title: string}) => {
  return (
    <div className="fixed z-[10000] top-0 left-0 flex flex-col justify-center text-primary bg-background/80 items-center h-screen w-screen">
      <CgSpinnerTwoAlt className="animate-spin rounded-full h-16 w-16" />
      <p className="text-base font-medium">{ title }</p>
    </div>
  );
};

export default Loader;