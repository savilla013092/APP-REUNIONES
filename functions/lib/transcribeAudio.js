"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestTranscription = exports.transcribeAudio = void 0;
const storage_1 = require("firebase-functions/v2/storage");
const storage_2 = require("firebase-admin/storage");
const firestore_1 = require("firebase-admin/firestore");
const speech_1 = require("@google-cloud/speech");
const speechClient = new speech_1.SpeechClient();
exports.transcribeAudio = (0, storage_1.onObjectFinalized)({
    bucket: process.env.GCLOUD_PROJECT + ".appspot.com",
    region: "us-central1",
    memory: "1GiB",
    timeoutSeconds: 540,
}, async (event) => {
    var _a;
    const filePath = event.data.name;
    const contentType = event.data.contentType;
    // Only process audio files in the audios/ folder
    if (!(filePath === null || filePath === void 0 ? void 0 : filePath.startsWith("audios/")) || !(contentType === null || contentType === void 0 ? void 0 : contentType.startsWith("audio/"))) {
        console.log("Skipping non-audio file:", filePath);
        return;
    }
    // Extract actaId from path: audios/{actaId}/{filename}
    const pathParts = filePath.split("/");
    if (pathParts.length < 3) {
        console.log("Invalid path structure:", filePath);
        return;
    }
    const actaId = pathParts[1];
    console.log(`Processing audio for acta: ${actaId}`);
    const storage = (0, storage_2.getStorage)();
    const bucket = storage.bucket(event.data.bucket);
    const file = bucket.file(filePath);
    try {
        // Download audio file for processing
        const [audioBuffer] = await file.download();
        const audioBytes = audioBuffer.toString("base64");
        // Determine encoding based on content type
        let encoding = "WEBM_OPUS";
        if ((contentType === null || contentType === void 0 ? void 0 : contentType.includes("mp3")) || (contentType === null || contentType === void 0 ? void 0 : contentType.includes("mpeg"))) {
            encoding = "MP3";
        }
        else if (contentType === null || contentType === void 0 ? void 0 : contentType.includes("flac")) {
            encoding = "FLAC";
        }
        else if (contentType === null || contentType === void 0 ? void 0 : contentType.includes("wav")) {
            encoding = "LINEAR16";
        }
        // Configure Speech-to-Text request
        const request = {
            audio: {
                content: audioBytes,
            },
            config: {
                encoding: encoding,
                sampleRateHertz: 48000,
                languageCode: "es-ES",
                alternativeLanguageCodes: ["es-MX", "es-US"],
                enableAutomaticPunctuation: true,
                model: "latest_long",
                useEnhanced: true,
            },
        };
        // Perform transcription
        console.log("Starting transcription...");
        const [response] = await speechClient.recognize(request);
        const transcription = (_a = response.results) === null || _a === void 0 ? void 0 : _a.map((result) => { var _a, _b; return (_b = (_a = result.alternatives) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.transcript; }).filter(Boolean).join("\n");
        if (!transcription) {
            console.log("No transcription generated for:", filePath);
            return;
        }
        console.log(`Transcription completed: ${transcription.substring(0, 100)}...`);
        // Update the acta document with the transcription
        const db = (0, firestore_1.getFirestore)();
        await db.collection("actas").doc(actaId).update({
            audioTranscription: transcription,
            audioTranscriptionStatus: "completed",
            audioTranscriptionAt: firestore_1.FieldValue.serverTimestamp(),
        });
        console.log(`Updated acta ${actaId} with transcription`);
    }
    catch (error) {
        console.error("Error transcribing audio:", error);
        // Update status to failed
        const db = (0, firestore_1.getFirestore)();
        await db.collection("actas").doc(actaId).update({
            audioTranscriptionStatus: "failed",
            audioTranscriptionError: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
// Callable function for manual transcription trigger
const https_1 = require("firebase-functions/v2/https");
exports.requestTranscription = (0, https_1.onCall)({
    cors: true,
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "El usuario debe estar autenticado.");
    }
    const { actaId, audioPath } = request.data;
    if (!actaId || !audioPath) {
        throw new https_1.HttpsError("invalid-argument", "Se requiere actaId y audioPath.");
    }
    // Mark transcription as pending
    const db = (0, firestore_1.getFirestore)();
    await db.collection("actas").doc(actaId).update({
        audioTranscriptionStatus: "pending",
    });
    return { success: true, message: "Transcripción iniciada" };
});
//# sourceMappingURL=transcribeAudio.js.map