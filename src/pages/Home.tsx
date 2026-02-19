import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import { FileText, Mic, Download } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 relative overflow-hidden">
      {/* Decorative blur circles */}
      <div className="absolute top-[-80px] left-[-80px] w-72 h-72 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-60px] right-[-60px] w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6">
        <div className="max-w-3xl text-center space-y-8">
          {/* Logo */}
          <div className="flex flex-col items-center gap-2">
            <img
              src="/logo-serviciudad.png"
              alt="SERVICIUDAD E.S.P."
              className="w-16 h-16 object-contain"
            />
            <div>
              <span className="text-white font-bold text-2xl tracking-tight block">
                SERVICIUDAD E.S.P.
              </span>
              <span className="text-slate-400 text-sm tracking-wide">
                Acueducto · Aseo · Alcantarillado
              </span>
            </div>
          </div>

          {/* Hero */}
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight">
              Gestion de Actas de Reunion <span className="text-blue-300">Inteligente</span>
            </h1>
            <p className="text-lg text-slate-400 leading-relaxed">
              Plataforma institucional para documentar, organizar y firmar las actas de los comites
              y reuniones de SERVICIUDAD E.S.P.
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
            <div className="flex items-start gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
              <div className="w-9 h-9 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0 border border-blue-500/30">
                <FileText className="w-4 h-4 text-blue-300" />
              </div>
              <div className="text-left">
                <p className="text-white font-medium text-sm">Actas con IA</p>
                <p className="text-slate-400 text-xs">Generacion automatica</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
              <div className="w-9 h-9 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0 border border-blue-500/30">
                <Mic className="w-4 h-4 text-blue-300" />
              </div>
              <div className="text-left">
                <p className="text-white font-medium text-sm">Firmas Digitales</p>
                <p className="text-slate-400 text-xs">Validacion electronica</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
              <div className="w-9 h-9 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0 border border-blue-500/30">
                <Download className="w-4 h-4 text-blue-300" />
              </div>
              <div className="text-left">
                <p className="text-white font-medium text-sm">Exportar PDF/Word</p>
                <p className="text-slate-400 text-xs">Formato GGFO-02</p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="flex gap-4 justify-center pt-4">
            <Button asChild size="lg" className="bg-blue-500 hover:bg-blue-600">
              <Link to="/login">Iniciar Sesion</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-white/20 text-white hover:bg-white/10"
            >
              <Link to="/login">Modo Invitado</Link>
            </Button>
          </div>

          {/* Footer */}
          <p className="text-slate-500 text-xs pt-8">
            © 2026 SERVICIUDAD E.S.P. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  )
}
