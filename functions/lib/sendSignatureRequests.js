"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordSignature = exports.verifySignatureToken = exports.sendSignatureRequests = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const params_1 = require("firebase-functions/params");
const nodemailer = __importStar(require("nodemailer"));
const crypto = __importStar(require("crypto"));
// Define secrets for email configuration
const smtpHost = (0, params_1.defineSecret)("SMTP_HOST");
const smtpPort = (0, params_1.defineSecret)("SMTP_PORT");
const smtpUser = (0, params_1.defineSecret)("SMTP_USER");
const smtpPass = (0, params_1.defineSecret)("SMTP_PASS");
const appUrl = (0, params_1.defineSecret)("APP_URL");
// Generate a secure unique token
function generateSignatureToken() {
    return crypto.randomBytes(32).toString("hex");
}
exports.sendSignatureRequests = (0, https_1.onCall)({
    secrets: [smtpHost, smtpPort, smtpUser, smtpPass, appUrl],
    cors: true,
}, async (request) => {
    var _a, _b, _c, _d;
    // Verify authentication
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "El usuario debe estar autenticado para enviar solicitudes de firma.");
    }
    const { actaId, attendeeIds } = request.data;
    if (!actaId) {
        throw new https_1.HttpsError("invalid-argument", "Se requiere el ID del acta.");
    }
    const db = (0, firestore_1.getFirestore)();
    const actaRef = db.collection("actas").doc(actaId);
    const actaDoc = await actaRef.get();
    if (!actaDoc.exists) {
        throw new https_1.HttpsError("not-found", "El acta no existe.");
    }
    const actaData = actaDoc.data();
    if (!actaData) {
        throw new https_1.HttpsError("internal", "Error al leer los datos del acta.");
    }
    // Verify the user has permission (belongs to same organization)
    const userDoc = await db.collection("users").doc(request.auth.uid).get();
    const userData = userDoc.data();
    if (!userData || userData.organizationId !== actaData.organizationId) {
        throw new https_1.HttpsError("permission-denied", "No tienes permiso para enviar solicitudes de firma para esta acta.");
    }
    // Filter attendees to send to
    let attendeesToNotify = actaData.attendees || [];
    if (attendeeIds && attendeeIds.length > 0) {
        attendeesToNotify = attendeesToNotify.filter((a) => attendeeIds.includes(a.id));
    }
    // Only notify attendees who haven't signed yet
    attendeesToNotify = attendeesToNotify.filter((a) => a.signatureStatus !== "signed");
    if (attendeesToNotify.length === 0) {
        return {
            success: true,
            message: "No hay asistentes pendientes de firma.",
            sentCount: 0,
        };
    }
    // Configure email transporter
    const transporter = nodemailer.createTransport({
        host: smtpHost.value(),
        port: parseInt(smtpPort.value() || "587"),
        secure: parseInt(smtpPort.value() || "587") === 465,
        auth: {
            user: smtpUser.value(),
            pass: smtpPass.value(),
        },
    });
    const baseUrl = appUrl.value() || "https://your-app.web.app";
    const meetingTitle = ((_a = actaData.meetingInfo) === null || _a === void 0 ? void 0 : _a.title) || "Reunión";
    const meetingDate = ((_d = (_c = (_b = actaData.meetingInfo) === null || _b === void 0 ? void 0 : _b.date) === null || _c === void 0 ? void 0 : _c.toDate) === null || _d === void 0 ? void 0 : _d.call(_c))
        ? actaData.meetingInfo.date.toDate().toLocaleDateString("es-ES")
        : "Fecha no especificada";
    const results = [];
    const updatedAttendees = [...actaData.attendees];
    for (const attendee of attendeesToNotify) {
        try {
            // Generate unique signature token
            const token = generateSignatureToken();
            const signatureUrl = `${baseUrl}/actas/${actaId}/sign?token=${token}&attendeeId=${attendee.id}`;
            // Update attendee with token
            const attendeeIndex = updatedAttendees.findIndex((a) => a.id === attendee.id);
            if (attendeeIndex >= 0) {
                updatedAttendees[attendeeIndex] = {
                    ...updatedAttendees[attendeeIndex],
                    signatureToken: token,
                };
            }
            // Send email
            await transporter.sendMail({
                from: `"Sistema de Actas" <${smtpUser.value()}>`,
                to: attendee.email,
                subject: `Solicitud de Firma - Acta: ${meetingTitle}`,
                html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
                .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                .footer { text-align: center; padding: 20px; font-size: 12px; color: #6b7280; }
                .info-box { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Solicitud de Firma</h1>
                </div>
                <div class="content">
                  <p>Estimado/a <strong>${attendee.name}</strong>,</p>

                  <p>Se requiere su firma para el acta de la siguiente reunión:</p>

                  <div class="info-box">
                    <p><strong>Reunión:</strong> ${meetingTitle}</p>
                    <p><strong>Fecha:</strong> ${meetingDate}</p>
                    <p><strong>Su rol:</strong> ${attendee.role}</p>
                  </div>

                  <p>Por favor, haga clic en el siguiente botón para revisar y firmar el acta:</p>

                  <p style="text-align: center;">
                    <a href="${signatureUrl}" class="button">Firmar Acta</a>
                  </p>

                  <p style="font-size: 12px; color: #6b7280;">
                    Si el botón no funciona, copie y pegue este enlace en su navegador:<br>
                    <a href="${signatureUrl}">${signatureUrl}</a>
                  </p>
                </div>
                <div class="footer">
                  <p>Este es un mensaje automático. Por favor no responda a este correo.</p>
                  <p>Sistema de Gestión de Actas</p>
                </div>
              </div>
            </body>
            </html>
          `,
                text: `
            Estimado/a ${attendee.name},

            Se requiere su firma para el acta de la reunión "${meetingTitle}" del ${meetingDate}.

            Su rol: ${attendee.role}

            Para firmar, visite: ${signatureUrl}

            Este es un mensaje automático.
          `,
            });
            results.push({ email: attendee.email, success: true });
        }
        catch (error) {
            console.error(`Error sending email to ${attendee.email}:`, error);
            results.push({
                email: attendee.email,
                success: false,
                error: error instanceof Error ? error.message : "Error desconocido",
            });
        }
    }
    // Update acta with new tokens and status
    await actaRef.update({
        attendees: updatedAttendees,
        status: "pending_signatures",
        signatureRequestSentAt: firestore_1.FieldValue.serverTimestamp(),
    });
    const successCount = results.filter((r) => r.success).length;
    return {
        success: true,
        message: `Se enviaron ${successCount} de ${results.length} solicitudes de firma.`,
        sentCount: successCount,
        results,
    };
});
// Function to verify signature token
exports.verifySignatureToken = (0, https_1.onCall)({
    cors: true,
}, async (request) => {
    var _a, _b, _c;
    const { actaId, attendeeId, token } = request.data;
    if (!actaId || !attendeeId || !token) {
        throw new https_1.HttpsError("invalid-argument", "Se requieren actaId, attendeeId y token.");
    }
    const db = (0, firestore_1.getFirestore)();
    const actaDoc = await db.collection("actas").doc(actaId).get();
    if (!actaDoc.exists) {
        throw new https_1.HttpsError("not-found", "El acta no existe.");
    }
    const actaData = actaDoc.data();
    const attendee = (_a = actaData === null || actaData === void 0 ? void 0 : actaData.attendees) === null || _a === void 0 ? void 0 : _a.find((a) => a.id === attendeeId);
    if (!attendee) {
        throw new https_1.HttpsError("not-found", "El asistente no existe.");
    }
    // Verify token
    const isValid = attendee.signatureToken === token;
    if (!isValid) {
        throw new https_1.HttpsError("permission-denied", "Token de firma inválido.");
    }
    return {
        valid: true,
        attendee: {
            id: attendee.id,
            name: attendee.name,
            role: attendee.role,
            signatureStatus: attendee.signatureStatus,
        },
        acta: {
            title: (_b = actaData === null || actaData === void 0 ? void 0 : actaData.meetingInfo) === null || _b === void 0 ? void 0 : _b.title,
            date: (_c = actaData === null || actaData === void 0 ? void 0 : actaData.meetingInfo) === null || _c === void 0 ? void 0 : _c.date,
        },
    };
});
// Function to record signature
exports.recordSignature = (0, https_1.onCall)({
    cors: true,
}, async (request) => {
    var _a;
    const { actaId, attendeeId, token, signatureUrl } = request.data;
    if (!actaId || !attendeeId || !token || !signatureUrl) {
        throw new https_1.HttpsError("invalid-argument", "Se requieren todos los campos: actaId, attendeeId, token, signatureUrl.");
    }
    const db = (0, firestore_1.getFirestore)();
    const actaRef = db.collection("actas").doc(actaId);
    const actaDoc = await actaRef.get();
    if (!actaDoc.exists) {
        throw new https_1.HttpsError("not-found", "El acta no existe.");
    }
    const actaData = actaDoc.data();
    const attendeeIndex = (_a = actaData === null || actaData === void 0 ? void 0 : actaData.attendees) === null || _a === void 0 ? void 0 : _a.findIndex((a) => a.id === attendeeId);
    if (attendeeIndex === undefined || attendeeIndex < 0) {
        throw new https_1.HttpsError("not-found", "El asistente no existe.");
    }
    const attendee = actaData === null || actaData === void 0 ? void 0 : actaData.attendees[attendeeIndex];
    // Verify token
    if (attendee.signatureToken !== token) {
        throw new https_1.HttpsError("permission-denied", "Token de firma inválido.");
    }
    // Check if already signed
    if (attendee.signatureStatus === "signed") {
        throw new https_1.HttpsError("already-exists", "El acta ya fue firmada.");
    }
    // Update attendee signature
    const updatedAttendees = [...actaData.attendees];
    updatedAttendees[attendeeIndex] = {
        ...attendee,
        signatureStatus: "signed",
        signatureUrl,
        signedAt: firestore_1.FieldValue.serverTimestamp(),
    };
    // Check if all attendees have signed
    const allSigned = updatedAttendees.every((a) => a.signatureStatus === "signed");
    await actaRef.update({
        attendees: updatedAttendees,
        status: allSigned ? "completed" : "pending_signatures",
        ...(allSigned && { completedAt: firestore_1.FieldValue.serverTimestamp() }),
    });
    return {
        success: true,
        message: "Firma registrada exitosamente.",
        allSigned,
    };
});
//# sourceMappingURL=sendSignatureRequests.js.map