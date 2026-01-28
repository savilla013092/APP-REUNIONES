import * as admin from "firebase-admin";

// Initialize Firebase Admin
admin.initializeApp();

// Export all Cloud Functions
export { generateActa } from "./generateActa";
export {
  transcribeAudio,
  requestTranscription,
} from "./transcribeAudio";
export {
  sendSignatureRequests,
  verifySignatureToken,
  recordSignature,
} from "./sendSignatureRequests";
