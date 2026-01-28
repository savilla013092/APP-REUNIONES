import { onObjectFinalized } from "firebase-functions/v2/storage";
import { getStorage } from "firebase-admin/storage";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { SpeechClient } from "@google-cloud/speech";

const speechClient = new SpeechClient();

export const transcribeAudio = onObjectFinalized(
  {
    bucket: process.env.GCLOUD_PROJECT + ".appspot.com",
    region: "us-central1",
    memory: "1GiB",
    timeoutSeconds: 540,
  },
  async (event) => {
    const filePath = event.data.name;
    const contentType = event.data.contentType;

    // Only process audio files in the audios/ folder
    if (!filePath?.startsWith("audios/") || !contentType?.startsWith("audio/")) {
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

    const storage = getStorage();
    const bucket = storage.bucket(event.data.bucket);
    const file = bucket.file(filePath);

    try {
      // Download audio file for processing
      const [audioBuffer] = await file.download();
      const audioBytes = audioBuffer.toString("base64");

      // Determine encoding based on content type
      let encoding: "WEBM_OPUS" | "MP3" | "FLAC" | "LINEAR16" = "WEBM_OPUS";
      if (contentType?.includes("mp3") || contentType?.includes("mpeg")) {
        encoding = "MP3";
      } else if (contentType?.includes("flac")) {
        encoding = "FLAC";
      } else if (contentType?.includes("wav")) {
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

      const transcription = response.results
        ?.map((result) => result.alternatives?.[0]?.transcript)
        .filter(Boolean)
        .join("\n");

      if (!transcription) {
        console.log("No transcription generated for:", filePath);
        return;
      }

      console.log(`Transcription completed: ${transcription.substring(0, 100)}...`);

      // Update the acta document with the transcription
      const db = getFirestore();
      await db.collection("actas").doc(actaId).update({
        audioTranscription: transcription,
        audioTranscriptionStatus: "completed",
        audioTranscriptionAt: FieldValue.serverTimestamp(),
      });

      console.log(`Updated acta ${actaId} with transcription`);
    } catch (error) {
      console.error("Error transcribing audio:", error);

      // Update status to failed
      const db = getFirestore();
      await db.collection("actas").doc(actaId).update({
        audioTranscriptionStatus: "failed",
        audioTranscriptionError:
          error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// Callable function for manual transcription trigger
import { onCall, HttpsError } from "firebase-functions/v2/https";

export const requestTranscription = onCall(
  {
    cors: true,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "El usuario debe estar autenticado."
      );
    }

    const { actaId, audioPath } = request.data as {
      actaId: string;
      audioPath: string;
    };

    if (!actaId || !audioPath) {
      throw new HttpsError(
        "invalid-argument",
        "Se requiere actaId y audioPath."
      );
    }

    // Mark transcription as pending
    const db = getFirestore();
    await db.collection("actas").doc(actaId).update({
      audioTranscriptionStatus: "pending",
    });

    return { success: true, message: "Transcripción iniciada" };
  }
);
