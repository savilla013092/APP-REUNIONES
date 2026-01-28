import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getActa, updateActa } from "@/services/actas";
import { uploadSignature } from "@/services/storage";
import type { Acta, GeneratedContent } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Save, FileText, ArrowLeft, Loader2, CheckCircle2, PenTool, RotateCcw, X } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { generateActaPDF } from "@/services/pdf";
import { generateActaWord } from "@/services/word";
import { File as FileIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import SignatureCanvas from "react-signature-canvas";
import { Timestamp } from "firebase/firestore";
import { isFirebaseConfigured } from "@/services/firebase";
import { isUsingDemoFallback } from "@/services/actas";

// Helper to check if we should use demo mode
const shouldUseDemoMode = (): boolean => {
    return !isFirebaseConfigured || isUsingDemoFallback();
};

// Helper to create timestamp compatible with both modes
const createTimestamp = () => {
    if (!shouldUseDemoMode()) {
        return Timestamp.now();
    }
    return { toDate: () => new Date() } as any;
};

export default function ViewActa() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [acta, setActa] = useState<Acta | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editedContent, setEditedContent] = useState<GeneratedContent | null>(null);

    // Signature state
    const [signingAttendeeId, setSigningAttendeeId] = useState<string | null>(null);
    const [savingSignature, setSavingSignature] = useState(false);
    const sigCanvas = useRef<SignatureCanvas>(null);

    useEffect(() => {
        if (id) {
            loadActa(id);
        }
    }, [id]);

    const loadActa = async (actaId: string) => {
        try {
            const data = await getActa(actaId);
            if (data) {
                setActa(data);
                if (data.generatedContent) {
                    setEditedContent(data.generatedContent);
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!id || !editedContent) return;
        setSaving(true);
        try {
            await updateActa(id, { generatedContent: editedContent });
            toast({
                title: "Cambios guardados",
                description: "El acta se ha actualizado correctamente.",
            });
        } catch (error) {
            console.error(error);
            toast({
                title: "Error",
                description: "No se pudieron guardar los cambios.",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    const handleStartSignature = (attendeeId: string) => {
        setSigningAttendeeId(attendeeId);
    };

    const handleCancelSignature = () => {
        setSigningAttendeeId(null);
        sigCanvas.current?.clear();
    };

    const handleClearSignature = () => {
        sigCanvas.current?.clear();
    };

    const handleSaveSignature = async () => {
        if (!sigCanvas.current || sigCanvas.current.isEmpty() || !acta || !signingAttendeeId || !id) {
            toast({
                title: "Error",
                description: "Por favor dibuja tu firma antes de guardar.",
                variant: "destructive",
            });
            return;
        }

        setSavingSignature(true);
        try {
            const signatureDataUrl = sigCanvas.current.getTrimmedCanvas().toDataURL("image/png");

            // Upload signature (handles both demo and Firebase modes)
            const signatureUrl = await uploadSignature(id, signingAttendeeId, signatureDataUrl);

            // Update attendee in Acta
            const updatedAttendees = acta.attendees.map(a =>
                a.id === signingAttendeeId
                    ? {
                        ...a,
                        signatureUrl,
                        signatureStatus: 'signed' as const,
                        signedAt: createTimestamp()
                    }
                    : a
            );

            // Check if all signed
            const allSigned = updatedAttendees.every(a => a.signatureStatus === 'signed');

            await updateActa(id, {
                attendees: updatedAttendees,
                status: allSigned ? 'completed' : acta.status
            });

            // Update local state
            setActa({ ...acta, attendees: updatedAttendees, status: allSigned ? 'completed' : acta.status });
            setSigningAttendeeId(null);
            sigCanvas.current?.clear();

            toast({
                title: "Firma guardada",
                description: allSigned ? "Todas las firmas han sido completadas." : "La firma se ha registrado correctamente.",
            });
        } catch (error) {
            console.error("Error guardando firma:", error);
            toast({
                title: "Error",
                description: "No se pudo guardar la firma.",
                variant: "destructive",
            });
        } finally {
            setSavingSignature(false);
        }
    };


    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!acta || !editedContent) {
        return <div className="p-8 text-center text-slate-500">Acta no encontrada.</div>;
    }

    const meetingDate = acta.meetingInfo.date.toDate();

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6">
                <div className="space-y-1">
                    <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="mb-2 -ml-2 gap-2 text-slate-500">
                        <ArrowLeft className="h-4 w-4" /> Volver al Dashboard
                    </Button>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold tracking-tight">{acta.meetingInfo.title}</h1>
                        <Badge variant={acta.status === 'completed' ? 'default' : 'secondary'}>
                            {acta.status === 'completed' ? 'Completada' : acta.status === 'pending_signatures' ? 'Pendiente Firmas' : 'Borrador'}
                        </Badge>
                    </div>
                    <p className="text-slate-500 flex items-center gap-2">
                        {format(meetingDate, "PPPP", { locale: es })} • {acta.meetingInfo.startTime} - {acta.meetingInfo.endTime}
                    </p>
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                    <Button variant="outline" className="flex-1 sm:flex-none gap-2" onClick={handleSave} disabled={saving}>
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar
                    </Button>
                    <Button className="flex-1 sm:flex-none gap-2" variant="outline" onClick={() => acta && generateActaWord(acta)}>
                        <FileIcon className="h-4 w-4" /> Word
                    </Button>
                    <Button className="flex-1 sm:flex-none gap-2" onClick={() => acta && generateActaPDF(acta)}>
                        <FileText className="h-4 w-4" /> PDF
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Main Content Edits */}
                <div className="lg:col-span-2 space-y-8">
                    <section className="space-y-4">
                        <Label className="text-lg font-bold flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-primary" /> Introducción
                        </Label>
                        <Textarea
                            value={editedContent.introduction}
                            onChange={(e) => setEditedContent({ ...editedContent, introduction: e.target.value })}
                            className="min-h-[100px] text-lg leading-relaxed bg-white shadow-sm"
                        />
                    </section>

                    <section className="space-y-4">
                        <Label className="text-lg font-bold flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-primary" /> Desarrollo de la Reunión
                        </Label>
                        <Textarea
                            value={editedContent.development}
                            onChange={(e) => setEditedContent({ ...editedContent, development: e.target.value })}
                            className="min-h-[400px] text-lg leading-relaxed bg-white shadow-sm"
                        />
                    </section>

                    <section className="space-y-4">
                        <Label className="text-lg font-bold flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-primary" /> Cierre
                        </Label>
                        <Textarea
                            value={editedContent.closure}
                            onChange={(e) => setEditedContent({ ...editedContent, closure: e.target.value })}
                            className="min-h-[100px] text-lg leading-relaxed bg-white shadow-sm"
                        />
                    </section>
                </div>

                {/* Right Column: Summarized lists */}
                <div className="space-y-6">
                    <Card className="border-slate-200 shadow-sm overflow-hidden">
                        <CardHeader className="bg-slate-50/50 border-b py-3">
                            <CardTitle className="text-base">Acuerdos Tomados</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3">
                            {editedContent.agreements.length === 0 ? (
                                <p className="text-sm text-slate-400">No hay acuerdos registrados.</p>
                            ) : (
                                editedContent.agreements.map((agreement, idx) => (
                                    <div key={idx} className="flex gap-3 items-start group">
                                        <Badge variant="outline" className="mt-1 h-5 w-5 flex items-center justify-center p-0 rounded-full">{idx + 1}</Badge>
                                        <p className="text-slate-700 text-sm flex-1">{agreement}</p>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 shadow-sm overflow-hidden">
                        <CardHeader className="bg-slate-50/50 border-b py-3">
                            <CardTitle className="text-base">Compromisos y Tareas</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {editedContent.commitments.length === 0 ? (
                                <p className="text-sm text-slate-400 p-4">No hay compromisos registrados.</p>
                            ) : (
                                <div className="divide-y">
                                    {editedContent.commitments.map((commit, idx) => (
                                        <div key={idx} className="p-4 space-y-1">
                                            <p className="font-semibold text-sm">{commit.description}</p>
                                            <div className="flex justify-between text-xs text-slate-500">
                                                <span>Responsable: {commit.responsible}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Signatures Section */}
                    <Card className="border-slate-200 shadow-sm overflow-hidden border-2 border-primary/20">
                        <CardHeader className="bg-primary/5 border-b py-4">
                            <CardTitle className="text-base flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <PenTool className="h-4 w-4 text-primary" /> Firmas de Asistentes
                                </span>
                                <span className="text-xs font-normal text-slate-500">
                                    {acta.attendees.filter(a => a.signatureStatus === 'signed').length}/{acta.attendees.length} firmadas
                                </span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y">
                                {acta.attendees.map((attendee) => (
                                    <div key={attendee.id} className="p-4">
                                        <div className="flex items-center justify-between gap-2 mb-2">
                                            <div className="min-w-0">
                                                <p className="font-medium text-sm truncate">{attendee.name}</p>
                                                <p className="text-xs text-slate-400">{attendee.role}</p>
                                            </div>
                                            <Badge
                                                variant={attendee.signatureStatus === 'signed' ? 'default' : 'outline'}
                                                className={attendee.signatureStatus === 'signed' ? 'bg-green-600' : 'border-amber-500 text-amber-600'}
                                            >
                                                {attendee.signatureStatus === 'signed' ? 'Firmado' : 'Pendiente'}
                                            </Badge>
                                        </div>

                                        {/* Show signature if signed */}
                                        {attendee.signatureStatus === 'signed' && attendee.signatureUrl && (
                                            <div className="mt-2 p-3 bg-green-50 rounded-lg border border-green-200">
                                                <img
                                                    src={attendee.signatureUrl}
                                                    alt={`Firma de ${attendee.name}`}
                                                    className="h-16 object-contain mx-auto"
                                                />
                                            </div>
                                        )}

                                        {/* Show sign button if not signed */}
                                        {attendee.signatureStatus !== 'signed' && signingAttendeeId !== attendee.id && (
                                            <Button
                                                variant="default"
                                                size="sm"
                                                className="w-full mt-2 gap-2 bg-primary hover:bg-primary/90"
                                                onClick={() => handleStartSignature(attendee.id)}
                                            >
                                                <PenTool className="h-4 w-4" /> Firmar Ahora
                                            </Button>
                                        )}

                                        {/* Signature canvas when signing */}
                                        {signingAttendeeId === attendee.id && (
                                            <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-2">
                                                <div className="border-2 border-dashed border-primary rounded-xl bg-white overflow-hidden shadow-inner">
                                                    <SignatureCanvas
                                                        ref={sigCanvas}
                                                        penColor="black"
                                                        canvasProps={{
                                                            className: "w-full h-40 cursor-crosshair",
                                                            style: { touchAction: 'none' }
                                                        }}
                                                    />
                                                </div>
                                                <p className="text-xs text-slate-500 text-center">
                                                    Dibuja tu firma con el mouse o el dedo
                                                </p>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="flex-1 gap-1"
                                                        onClick={handleClearSignature}
                                                    >
                                                        <RotateCcw className="h-4 w-4" /> Limpiar
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="gap-1"
                                                        onClick={handleCancelSignature}
                                                    >
                                                        <X className="h-4 w-4" /> Cancelar
                                                    </Button>
                                                </div>
                                                <Button
                                                    size="default"
                                                    className="w-full gap-2 bg-green-600 hover:bg-green-700"
                                                    onClick={handleSaveSignature}
                                                    disabled={savingSignature}
                                                >
                                                    {savingSignature ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <CheckCircle2 className="h-4 w-4" />
                                                    )}
                                                    Confirmar Firma
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
