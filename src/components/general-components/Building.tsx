import innovation from "../../assets/innovation-animate.svg";

const Building = () => {
  return (
    <div className="flex flex-col items-center justify-center">
      <p className="font-black text-5xl text-primary">OPA !</p>
      <p className="font-normal text-md text-primary">Página Em Construção</p>
      <img src={innovation} alt="login-safety" className="w-full md:w-1/2 object-contain" />
    </div>
  );
};

export default Building;
