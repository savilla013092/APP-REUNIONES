import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "@/hooks/useAuth";
import { getOrganizationActas } from "@/services/actas";
import type { Acta } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Plus,
    FileText,
    Clock,
    CheckCircle2,
    ChevronRight,
    LayoutDashboard,
    Users,
    Activity,
    Search
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function Dashboard() {
    const { user } = useAuthStore();
    const [actas, setActas] = useState<Acta[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        if (user?.organizationId) {
            loadActas(user.organizationId);
        } else if (user) {
            // User exists but no organizationId - stop loading
            setLoading(false);
        }
    }, [user, user?.organizationId]);

    const loadActas = async (orgId: string) => {
        setLoading(true);
        try {
            const data = await getOrganizationActas(orgId);
            console.log("Actas cargadas:", data.length);
            setActas(data);
        } catch (error) {
            console.error("Error cargando actas:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredActas = actas.filter(a =>
        a.meetingInfo.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const stats = [
        { label: "Total Actas", value: actas.length, icon: FileText, color: "text-blue-600" },
        { label: "Pendientes", value: actas.filter(a => a.status !== 'completed').length, icon: Clock, color: "text-amber-500" },
        { label: "Completadas", value: actas.filter(a => a.status === 'completed').length, icon: CheckCircle2, color: "text-emerald-500" },
    ];

    return (
        <div className="min-h-screen bg-slate-50/50 flex">
            {/* Sidebar Desktop */}
            <aside className="hidden lg:flex w-64 bg-white border-r flex-col p-6 space-y-8">
                <div className="flex items-center gap-2 px-2">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold">M</div>
                    <span className="font-bold text-xl tracking-tight">MeetMind AI</span>
                </div>

                <nav className="space-y-1">
                    <Button variant="ghost" className="w-full justify-start gap-3 bg-primary/5 text-primary font-semibold">
                        <LayoutDashboard className="h-4 w-4" /> Dashboard
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-3 text-slate-500">
                        <FileText className="h-4 w-4" /> Mis Actas
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-3 text-slate-500">
                        <Users className="h-4 w-4" /> Equipo
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-3 text-slate-500">
                        <Activity className="h-4 w-4" /> Reportes
                    </Button>
                </nav>

                <div className="mt-auto p-4 bg-slate-100 rounded-xl space-y-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Plan Pro</p>
                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-primary w-[75%]" />
                    </div>
                    <p className="text-[10px] text-slate-500">75% del almacenamiento usado</p>
                    <Button size="sm" className="w-full text-xs" variant="outline">Mejorar Plan</Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-4 lg:p-8 space-y-8 max-w-7xl mx-auto w-full">
                <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Bienvenido, {user?.displayName.split(' ')[0]}</h1>
                        <p className="text-slate-500">Gestiona las actas y compromisos de tu equipo.</p>
                    </div>
                    <Button asChild className="shadow-lg shadow-primary/20 gap-2">
                        <Link to="/actas/create">
                            <Plus className="h-4 w-4" /> Nueva Acta
                        </Link>
                    </Button>
                </header>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {stats.map((stat) => (
                        <Card key={stat.label} className="border-none shadow-sm bg-white">
                            <CardContent className="p-6 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                                    <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                                </div>
                                <div className={cn("p-3 rounded-xl bg-slate-50", stat.color)}>
                                    <stat.icon className="h-6 w-6" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Content Section */}
                <Card className="border-none shadow-sm bg-white overflow-hidden">
                    <CardHeader className="p-6 border-b bg-white">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <CardTitle className="text-xl font-bold">Actas Recientes</CardTitle>
                                <CardDescription>Listado de las últimas reuniones documentadas.</CardDescription>
                            </div>
                            <div className="relative w-full md:w-72">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Buscar por título..."
                                    className="pl-10 bg-slate-50 border-none h-10"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="p-12 text-center text-slate-500">Cargando actas...</div>
                        ) : filteredActas.length === 0 ? (
                            <div className="p-20 text-center space-y-4">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                                    <FileText className="h-8 w-8" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-slate-900 font-semibold">No se encontraron actas</p>
                                    <p className="text-slate-500 text-sm">Empieza por crear la primera acta de tu organización.</p>
                                </div>
                                <Button asChild variant="outline" size="sm">
                                    <Link to="/actas/create">Crear mi primera acta</Link>
                                </Button>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {filteredActas.map((acta) => (
                                    <Link
                                        key={acta.id}
                                        to={`/actas/view/${acta.id}`}
                                        className="flex flex-col sm:flex-row sm:items-center justify-between p-6 hover:bg-slate-50 transition-colors gap-4"
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="mt-1 p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                                <FileText className="h-5 w-5" />
                                            </div>
                                            <div className="space-y-1">
                                                <h3 className="font-semibold text-slate-900 group-hover:text-primary transition-colors">
                                                    {acta.meetingInfo.title}
                                                </h3>
                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-3.5 w-3.5" />
                                                        {format(acta.meetingInfo.date.toDate(), "d MMM, yyyy", { locale: es })}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Users className="h-3.5 w-3.5" />
                                                        {acta.attendees.length} asistentes
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between sm:justify-end gap-3 px-1 sm:px-0">
                                            <Badge variant={acta.status === 'completed' ? 'default' : 'secondary'} className="px-2.5 py-0.5 font-medium border-none">
                                                {acta.status === 'completed' ? 'Completado' : 'Borrador'}
                                            </Badge>
                                            <ChevronRight className="h-5 w-5 text-slate-300 hidden sm:block" />
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
