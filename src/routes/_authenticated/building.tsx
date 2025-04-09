import { createFileRoute } from '@tanstack/react-router'
import innovation from '../../assets/innovation-animate.svg'

export const Route = createFileRoute('/_authenticated/building')({
  component: () => (
    <>
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background">
        <p className="font-black text-5xl text-primary">OPA !</p>
        <p className="font-normal text-md text-primary">Página Em Construção</p>
        <img src={innovation} alt="login-safety" className="md:max-w-xl h-1/2 md:h-auto object-contain" />
      </div>
    </>
  )
})