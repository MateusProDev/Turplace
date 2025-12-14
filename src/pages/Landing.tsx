import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 to-green-100 p-4">
      <div className="max-w-xl w-full bg-white rounded-xl shadow-lg p-8 flex flex-col items-center">
        <h1 className="text-3xl font-bold mb-2 text-center text-blue-700">Turplace</h1>
        <h2 className="text-xl font-semibold mb-4 text-center text-gray-700">O marketplace de turismo local para criadores e prestadores de experiências</h2>
        <p className="mb-6 text-center text-gray-600">
          Cadastre seu serviço, ganhe visibilidade e conecte-se com agências e viajantes. Simples, rápido e gratuito para quem quer crescer no turismo local!
        </p>
        <div className="flex flex-col gap-3 w-full">
          <Link
            to="/catalog"
            className="w-full px-4 py-2 bg-blue-600 text-white rounded font-semibold text-center hover:bg-blue-700 transition"
          >
            Encontrar serviços turísticos
          </Link>
          <Link
            to="/login"
            className="w-full px-4 py-2 bg-green-600 text-white rounded font-semibold text-center hover:bg-green-700 transition"
          >
            Cadastrar meu serviço
          </Link>
        </div>
        <div className="mt-6 text-xs text-gray-400 text-center">
          MVP beta — Foco em catálogo e geração de leads. <br />
          <span className="font-semibold">Seja um dos primeiros a participar!</span>
        </div>
      </div>
    </div>
  );
}
