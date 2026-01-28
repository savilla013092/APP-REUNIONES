import { useState, useRef } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Plus, Trash2, Mic, FileAudio, Sparkles, ChevronRight, ChevronLeft, Loader2, X, CheckCircle2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MeetingAttendee } from "@/types";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/hooks/useAuth";
import { generateMeetingActa } from "@/services/gemini";
import { saveActa } from "@/services/actas";
import { Timestamp } from "firebase/firestore";
import { AudioRecorder } from "@/components/audio/AudioRecorder";
import { uploadAudio } from "@/services/storage";
import { isFirebaseConfigured } from "@/services/firebase";

// Helper to create timestamp compatible with both modes
const createTimestamp = (date: Date) => {
    if (isFirebaseConfigured) {
        return Timestamp.fromDate(date);
    }
    // Demo mode: create a mock timestamp object
    return { toDate: () => date } as any;
};

type FormStep = "basics" | "attendees" | "content" | "review";

export default function CreateActa() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [step, setStep] = useState<FormStep>("basics");
    const [generating, setGenerating] = useState(false);
    const [showRecorder, setShowRecorder] = useState(false);
    const [uploadingAudio, setUploadingAudio] = useState(false);
    const audioInputRef = useRef<HTMLInputElement>(null);
    const [meetingData, setMeetingData] = useState({
        title: "",
        date: new Date(),
        startTime: "09:00",
        endTime: "10:00",
        location: "",
        modality: "presencial" as 'presencial' | 'virtual' | 'híbrida',
        agenda: [] as string[],
        attendees: [] as MeetingAttendee[],
        rawContent: "",
        audioUrl: "",
    });

    const [newAttendee, setNewAttendee] = useState({
        name: "",
        email: "",
        role: "",
    });

    const handleAddAttendee = () => {
        if (newAttendee.name && newAttendee.email) {
            const attendee: MeetingAttendee = {
                id: crypto.randomUUID(),
                ...newAttendee,
                attendance: 'present',
                signatureStatus: 'pending'
            };
            setMeetingData(prev => ({
                ...prev,
                attendees: [...prev.attendees, attendee]
            }));
            setNewAttendee({ name: "", email: "", role: "" });
        }
    };

    const removeAttendee = (id: string) => {
        setMeetingData(prev => ({
            ...prev,
            attendees: prev.attendees.filter(a => a.id !== id)
        }));
    };

    const addAgendaItem = () => {
        setMeetingData(prev => ({
            ...prev,
            agenda: [...prev.agenda, ""]
        }));
    };

    const updateAgendaItem = (index: number, value: string) => {
        const newAgenda = [...meetingData.agenda];
        newAgenda[index] = value;
        setMeetingData(prev => ({ ...prev, agenda: newAgenda }));
    };

    const removeAgendaItem = (index: number) => {
        setMeetingData(prev => ({
            ...prev,
            agenda: prev.agenda.filter((_, i) => i !== index)
        }));
    };

    const handleAudioUpload = async (blob: Blob) => {
        if (!user) return;
        try {
            const url = await uploadAudio(user.organizationId, "temp", blob);
            setMeetingData(prev => ({ ...prev, audioUrl: url }));
            setShowRecorder(false);
        } catch (error) {
            console.error(error);
            alert("Error al subir el audio.");
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user) return;

        // Validate file type
        if (!file.type.startsWith('audio/')) {
            alert("Por favor selecciona un archivo de audio válido.");
            return;
        }

        // Validate file size (max 25MB)
        if (file.size > 25 * 1024 * 1024) {
            alert("El archivo es demasiado grande. El tamaño máximo es 25MB.");
            return;
        }

        setUploadingAudio(true);
        try {
            const url = await uploadAudio(user.organizationId, "temp", file);
            setMeetingData(prev => ({ ...prev, audioUrl: url }));
        } catch (error) {
            console.error(error);
            alert("Error al cargar el archivo de audio.");
        } finally {
            setUploadingAudio(false);
            // Reset input
            if (audioInputRef.current) {
                audioInputRef.current.value = '';
            }
        }
    };

    const handleGenerate = async () => {
        if (!user) return;
        setGenerating(true);
        try {
            // 1. Generate content with Gemini (including audio if available)
            const generatedContent = await generateMeetingActa(
                meetingData.title,
                format(meetingData.date, "PPP"),
                meetingData.location,
                meetingData.modality,
                meetingData.attendees,
                meetingData.agenda,
                meetingData.rawContent,
                meetingData.audioUrl || undefined
            );

            // 2. Clean generated content - remove undefined values (Firestore doesn't accept undefined)
            const cleanedContent = {
                introduction: generatedContent.introduction || "",
                development: generatedContent.development || "",
                agreements: generatedContent.agreements || [],
                commitments: (generatedContent.commitments || []).map(c => ({
                    description: c.description || "",
                    responsible: c.responsible || "",
                    ...(c.dueDate ? { dueDate: c.dueDate } : {})
                })),
                closure: generatedContent.closure || "",
                ...(generatedContent.nextMeeting ? { nextMeeting: generatedContent.nextMeeting } : {})
            };

            // 3. Save to Firestore (or localStorage in demo mode)
            const actaData: any = {
                organizationId: user.organizationId,
                createdBy: user.id,
                status: "draft",
                meetingInfo: {
                    title: meetingData.title || "",
                    date: createTimestamp(meetingData.date),
                    startTime: meetingData.startTime || "",
                    endTime: meetingData.endTime || "",
                    location: meetingData.location || "",
                    modality: meetingData.modality || "presencial",
                },
                attendees: meetingData.attendees || [],
                agenda: meetingData.agenda || [],
                rawContent: meetingData.rawContent || "",
                generatedContent: cleanedContent,
            };

            // Only add audioUrl if it's a valid URL (not a data URL which is too large for Firestore)
            if (meetingData.audioUrl && !meetingData.audioUrl.startsWith('data:')) {
                actaData.audioUrl = meetingData.audioUrl;
            }

            const actaId = await saveActa(actaData);

            // 3. Navigate to view
            navigate(`/actas/view/${actaId}`);
        } catch (error: any) {
            console.error("Error completo:", error);
            const errorMessage = error?.message || "Error desconocido";
            alert(`Error al generar el acta: ${errorMessage}`);
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Crear Nueva Acta</h1>
                <p className="text-muted-foreground text-lg">Sigue los pasos para documentar tu reunión asistido por IA.</p>
            </div>

            {/* Stepper Indicator */}
            <div className="flex justify-between items-center mb-8 relative">
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 -z-10" />
                {["Datos Básicos", "Asistentes", "Contenido", "Revisión"].map((label, i) => {
                    const stepsArr: FormStep[] = ["basics", "attendees", "content", "review"];
                    const isActive = stepsArr.indexOf(step) >= i;
                    return (
                        <div key={label} className="flex flex-col items-center gap-2 bg-slate-50 px-2 sm:px-4">
                            <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors",
                                isActive ? "bg-primary text-primary-foreground" : "bg-white border text-slate-400"
                            )}>
                                {i + 1}
                            </div>
                            <span className={cn("text-xs font-medium", isActive ? "text-slate-900" : "text-slate-400")}>{label}</span>
                        </div>
                    );
                })}
            </div>

            <Card className="shadow-lg border-slate-200">
                <CardHeader>
                    <CardTitle>
                        {step === "basics" && "Información General"}
                        {step === "attendees" && "Participantes"}
                        {step === "content" && "Desarrollo de la Reunión"}
                        {step === "review" && "Generar Acta con IA"}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {step === "basics" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="title">Título de la Reunión</Label>
                                <Input
                                    id="title"
                                    placeholder="Ej: Seguimiento de Proyecto Q1"
                                    value={meetingData.title}
                                    onChange={(e) => setMeetingData({ ...meetingData, title: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Fecha</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {meetingData.date ? format(meetingData.date, "PPP") : <span>Selecciona una fecha</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={meetingData.date}
                                            onSelect={(date) => date && setMeetingData({ ...meetingData, date })}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="space-y-2">
                                <Label>Modalidad</Label>
                                <Select
                                    value={meetingData.modality}
                                    onValueChange={(val: any) => setMeetingData({ ...meetingData, modality: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona modalidad" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="presencial">Presencial</SelectItem>
                                        <SelectItem value="virtual">Virtual</SelectItem>
                                        <SelectItem value="híbrida">Híbrida</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="location">Lugar / Link</Label>
                                <Input
                                    id="location"
                                    placeholder="Sala de conferencias o URL"
                                    value={meetingData.location}
                                    onChange={(e) => setMeetingData({ ...meetingData, location: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Hora Inicio</Label>
                                    <Input
                                        type="time"
                                        value={meetingData.startTime}
                                        onChange={(e) => setMeetingData({ ...meetingData, startTime: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Hora Fin</Label>
                                    <Input
                                        type="time"
                                        value={meetingData.endTime}
                                        onChange={(e) => setMeetingData({ ...meetingData, endTime: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {step === "attendees" && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end bg-slate-50 p-4 rounded-lg border border-slate-100">
                                <div className="space-y-2">
                                    <Label>Nombre</Label>
                                    <Input
                                        placeholder="Juan Pérez"
                                        value={newAttendee.name}
                                        onChange={e => setNewAttendee({ ...newAttendee, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Email</Label>
                                    <Input
                                        type="email"
                                        placeholder="juan@empresa.com"
                                        value={newAttendee.email}
                                        onChange={e => setNewAttendee({ ...newAttendee, email: e.target.value })}
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <div className="space-y-2 flex-1">
                                        <Label>Cargo</Label>
                                        <Input
                                            placeholder="Gerente"
                                            value={newAttendee.role}
                                            onChange={e => setNewAttendee({ ...newAttendee, role: e.target.value })}
                                        />
                                    </div>
                                    <Button type="button" size="icon" onClick={handleAddAttendee}>
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            <div className="border rounded-md overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 border-b">
                                        <tr>
                                            <th className="px-4 py-2 text-left">Asistente</th>
                                            <th className="px-4 py-2 text-left">Email</th>
                                            <th className="px-4 py-2 text-left">Cargo</th>
                                            <th className="px-4 py-2 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {meetingData.attendees.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                                                    No hay asistentes registrados todavía.
                                                </td>
                                            </tr>
                                        ) : (
                                            meetingData.attendees.map((a) => (
                                                <tr key={a.id} className="border-b last:border-0">
                                                    <td className="px-4 py-2 font-medium">{a.name}</td>
                                                    <td className="px-4 py-2">{a.email}</td>
                                                    <td className="px-4 py-2">{a.role}</td>
                                                    <td className="px-4 py-2 text-right">
                                                        <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => removeAttendee(a.id)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {step === "content" && (
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <Label className="text-lg font-semibold">Nota o Transcripción</Label>
                                    <div className="flex gap-2">
                                        {!showRecorder ? (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="gap-2 text-primary border-primary hover:bg-primary/5"
                                                onClick={() => setShowRecorder(true)}
                                            >
                                                <Mic className="h-4 w-4" /> Grabar
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="gap-2 h-8 w-8 p-0"
                                                onClick={() => setShowRecorder(false)}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        )}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="gap-2"
                                            onClick={() => audioInputRef.current?.click()}
                                            disabled={uploadingAudio}
                                        >
                                            {uploadingAudio ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Upload className="h-4 w-4" />
                                            )}
                                            {uploadingAudio ? "Cargando..." : "Subir Audio"}
                                        </Button>
                                        <input
                                            ref={audioInputRef}
                                            type="file"
                                            accept="audio/*"
                                            onChange={handleFileUpload}
                                            className="hidden"
                                        />
                                    </div>
                                </div>

                                {showRecorder && (
                                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                        <AudioRecorder onRecordingComplete={handleAudioUpload} />
                                    </div>
                                )}

                                <Textarea
                                    placeholder="Escribe aquí las notas, ideas principales y decisiones de la reunión. No importa el orden, la IA lo estructurará por ti."
                                    className="min-h-[300px] leading-relaxed"
                                    value={meetingData.rawContent}
                                    onChange={(e) => setMeetingData({ ...meetingData, rawContent: e.target.value })}
                                />

                                {meetingData.audioUrl && (
                                    <div className="flex items-center gap-2 p-2 bg-primary/5 border border-primary/20 rounded-lg text-sm text-primary">
                                        <FileAudio className="h-4 w-4" /> Audio adjunto correctamente
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4 pt-4 border-t">
                                <div className="flex justify-between items-center">
                                    <Label className="text-lg font-semibold">Orden del Día (Opcional)</Label>
                                    <Button type="button" variant="ghost" size="sm" onClick={addAgendaItem} className="gap-2">
                                        <Plus className="h-4 w-4" /> Agregar Item
                                    </Button>
                                </div>
                                <div className="space-y-2">
                                    {meetingData.agenda.map((item, idx) => (
                                        <div key={idx} className="flex gap-2">
                                            <Input
                                                placeholder={`Punto ${idx + 1}`}
                                                value={item}
                                                onChange={(e) => updateAgendaItem(idx, e.target.value)}
                                            />
                                            <Button variant="ghost" size="icon" onClick={() => removeAgendaItem(idx)} className="text-slate-400">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === "review" && (
                        <div className="flex flex-col items-center justify-center space-y-6 py-12 text-center">
                            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                                <Sparkles className="h-10 w-10 text-primary" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-bold">¡Todo listo para procesar!</h3>
                                <p className="text-muted-foreground max-w-sm">
                                    Al hacer clic en "Generar Acta", nuestra IA Gemini analizará el contenido y creará un documento formal estructurado con acuerdos y compromisos.
                                </p>
                            </div>
                            <div className="w-full max-w-md bg-slate-50 p-6 rounded-xl border space-y-4 text-left">
                                <div className="flex justify-between border-b pb-2">
                                    <span className="font-semibold">Reunión:</span>
                                    <span className="text-slate-600 truncate max-w-[200px]">{meetingData.title || "Sin título"}</span>
                                </div>
                                <div className="flex justify-between border-b pb-2">
                                    <span className="font-semibold">Asistentes:</span>
                                    <span className="text-slate-600 font-medium">{meetingData.attendees.length} personas</span>
                                </div>
                                <div className="flex justify-between border-b pb-2">
                                    <span className="font-semibold">Notas:</span>
                                    <span className="text-slate-600 text-sm">{meetingData.rawContent.length} caracteres</span>
                                </div>
                                {meetingData.audioUrl && (
                                    <div className="flex justify-between border-b pb-2">
                                        <span className="font-semibold">Audio:</span>
                                        <span className="text-success text-sm flex items-center gap-1">
                                            <CheckCircle2 className="h-3 w-3" /> Adjunto
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex justify-between bg-slate-50/50 p-6 rounded-b-lg border-t">
                    <Button
                        variant="ghost"
                        onClick={() => {
                            if (step === "attendees") setStep("basics");
                            if (step === "content") setStep("attendees");
                            if (step === "review") setStep("content");
                        }}
                        disabled={step === "basics" || generating}
                        className="gap-2"
                    >
                        <ChevronLeft className="h-4 w-4" /> Atrás
                    </Button>

                    {step !== "review" ? (
                        <Button
                            onClick={() => {
                                if (step === "basics") setStep("attendees");
                                if (step === "attendees") setStep("content");
                                if (step === "content") setStep("review");
                            }}
                            className="gap-2 px-8"
                            disabled={step === "basics" && !meetingData.title}
                        >
                            Siguiente <ChevronRight className="h-4 w-4" />
                        </Button>
                    ) : (
                        <Button
                            onClick={handleGenerate}
                            className="gap-2 bg-gradient-to-r from-primary to-indigo-600 px-10 hover:opacity-90 transition-opacity"
                            disabled={generating || (!meetingData.rawContent && !meetingData.audioUrl)}
                        >
                            {generating ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" /> Generando...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="h-4 w-4" /> Generar Acta
                                </>
                            )}
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}
