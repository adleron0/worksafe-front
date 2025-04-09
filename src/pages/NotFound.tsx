import question from "../assets/questions-animate.svg";

const NotFound = () => {
  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-background">
      <p className="font-black text-5xl text-primary">ERRO !</p>
      <p className="font-normal text-md text-primary">Página Não Encontrada</p>
      <img src={question} alt="login-safety" className="md:max-w-xl h-1/2 md:h-auto object-contain" />
    </div>
  );
};

export default NotFound;
