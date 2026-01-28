import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function Home() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="max-w-3xl text-center space-y-6">
                <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight">
                    Actas de Reunión con <span className="text-primary">IA</span>
                </h1>
                <p className="text-xl text-slate-600">
                    Transforma tus notas desordenadas y audios en actas profesionales estructuradas en segundos.
                </p>
                <div className="flex gap-4 justify-center">
                    <Button asChild size="lg">
                        <Link to="/login">Comenzar Ahora</Link>
                    </Button>
                    <Button variant="outline" size="lg">
                        Saber Más
                    </Button>
                </div>
            </div>
        </div>
    );
}
