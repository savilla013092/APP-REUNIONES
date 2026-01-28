import { Button } from "@/components/ui/button";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { Mic, Square, Trash2, CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface AudioRecorderProps {
    onRecordingComplete: (blob: Blob) => void;
}

export function AudioRecorder({ onRecordingComplete }: AudioRecorderProps) {
    const { isRecording, audioBlob, recordingTime, startRecording, stopRecording, clearRecording } = useAudioRecorder();
    const [isProcessing, setIsProcessing] = useState(false);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleConfirm = async () => {
        if (audioBlob) {
            setIsProcessing(true);
            try {
                await onRecordingComplete(audioBlob);
            } catch (error) {
                console.error(error);
            } finally {
                setIsProcessing(false);
            }
        }
    };

    return (
        <div className="border rounded-xl p-6 bg-slate-50/50 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "w-3 h-3 rounded-full",
                        isRecording ? "bg-red-500 animate-pulse" : "bg-slate-300"
                    )} />
                    <span className="font-mono text-xl font-bold">
                        {formatTime(recordingTime)}
                    </span>
                </div>

                <div className="flex gap-2">
                    {!isRecording && !audioBlob && (
                        <Button onClick={startRecording} className="rounded-full gap-2">
                            <Mic className="h-4 w-4" /> Iniciar Grabación
                        </Button>
                    )}

                    {isRecording && (
                        <Button onClick={stopRecording} variant="destructive" className="rounded-full gap-2">
                            <Square className="h-4 w-4" /> Detener
                        </Button>
                    )}

                    {audioBlob && !isRecording && (
                        <>
                            <Button variant="outline" size="icon" onClick={clearRecording} className="rounded-full text-destructive">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button onClick={handleConfirm} disabled={isProcessing} className="rounded-full gap-2 bg-success hover:bg-success/90">
                                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                Usar esta grabación
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {isRecording && (
                <p className="text-xs text-slate-500 text-center animate-pulse">
                    Grabando audio de la reunión... asegúrate de que el micrófono esté cerca.
                </p>
            )}

            {audioBlob && !isRecording && (
                <div className="bg-white p-3 rounded-lg border shadow-sm">
                    <audio src={URL.createObjectURL(audioBlob)} controls className="w-full h-8" />
                </div>
            )}
        </div>
    );
}
