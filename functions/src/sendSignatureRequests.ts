import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { defineSecret } from "firebase-functions/params";
import * as nodemailer from "nodemailer";
import * as crypto from "crypto";

// Define secrets for email configuration
const smtpHost = defineSecret("SMTP_HOST");
const smtpPort = defineSecret("SMTP_PORT");
const smtpUser = defineSecret("SMTP_USER");
const smtpPass = defineSecret("SMTP_PASS");
const appUrl = defineSecret("APP_URL");

interface Attendee {
  id: string;
  name: string;
  email: string;
  role: string;
  signatureStatus: "pending" | "signed";
  signatureToken?: string;
}

interface SendSignatureRequestsData {
  actaId: string;
  attendeeIds?: string[]; // Optional: send to specific attendees only
}

// Generate a secure unique token
function generateSignatureToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export const sendSignatureRequests = onCall(
  {
    secrets: [smtpHost, smtpPort, smtpUser, smtpPass, appUrl],
    cors: true,
  },
  async (request) => {
    // Verify authentication
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "El usuario debe estar autenticado para enviar solicitudes de firma."
      );
    }

    const { actaId, attendeeIds } = request.data as SendSignatureRequestsData;

    if (!actaId) {
      throw new HttpsError("invalid-argument", "Se requiere el ID del acta.");
    }

    const db = getFirestore();
    const actaRef = db.collection("actas").doc(actaId);
    const actaDoc = await actaRef.get();

    if (!actaDoc.exists) {
      throw new HttpsError("not-found", "El acta no existe.");
    }

    const actaData = actaDoc.data();
    if (!actaData) {
      throw new HttpsError("internal", "Error al leer los datos del acta.");
    }

    // Verify the user has permission (belongs to same organization)
    const userDoc = await db.collection("users").doc(request.auth.uid).get();
    const userData = userDoc.data();

    if (!userData || userData.organizationId !== actaData.organizationId) {
      throw new HttpsError(
        "permission-denied",
        "No tienes permiso para enviar solicitudes de firma para esta acta."
      );
    }

    // Filter attendees to send to
    let attendeesToNotify: Attendee[] = actaData.attendees || [];

    if (attendeeIds && attendeeIds.length > 0) {
      attendeesToNotify = attendeesToNotify.filter((a: Attendee) =>
        attendeeIds.includes(a.id)
      );
    }

    // Only notify attendees who haven't signed yet
    attendeesToNotify = attendeesToNotify.filter(
      (a: Attendee) => a.signatureStatus !== "signed"
    );

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
    const meetingTitle = actaData.meetingInfo?.title || "Reunión";
    const meetingDate = actaData.meetingInfo?.date?.toDate?.()
      ? actaData.meetingInfo.date.toDate().toLocaleDateString("es-ES")
      : "Fecha no especificada";

    const results: { email: string; success: boolean; error?: string }[] = [];
    const updatedAttendees = [...actaData.attendees];

    for (const attendee of attendeesToNotify) {
      try {
        // Generate unique signature token
        const token = generateSignatureToken();
        const signatureUrl = `${baseUrl}/actas/${actaId}/sign?token=${token}&attendeeId=${attendee.id}`;

        // Update attendee with token
        const attendeeIndex = updatedAttendees.findIndex(
          (a: Attendee) => a.id === attendee.id
        );
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
      } catch (error) {
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
      signatureRequestSentAt: FieldValue.serverTimestamp(),
    });

    const successCount = results.filter((r) => r.success).length;

    return {
      success: true,
      message: `Se enviaron ${successCount} de ${results.length} solicitudes de firma.`,
      sentCount: successCount,
      results,
    };
  }
);

// Function to verify signature token
export const verifySignatureToken = onCall(
  {
    cors: true,
  },
  async (request) => {
    const { actaId, attendeeId, token } = request.data as {
      actaId: string;
      attendeeId: string;
      token: string;
    };

    if (!actaId || !attendeeId || !token) {
      throw new HttpsError(
        "invalid-argument",
        "Se requieren actaId, attendeeId y token."
      );
    }

    const db = getFirestore();
    const actaDoc = await db.collection("actas").doc(actaId).get();

    if (!actaDoc.exists) {
      throw new HttpsError("not-found", "El acta no existe.");
    }

    const actaData = actaDoc.data();
    const attendee = actaData?.attendees?.find(
      (a: Attendee) => a.id === attendeeId
    );

    if (!attendee) {
      throw new HttpsError("not-found", "El asistente no existe.");
    }

    // Verify token
    const isValid = attendee.signatureToken === token;

    if (!isValid) {
      throw new HttpsError("permission-denied", "Token de firma inválido.");
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
        title: actaData?.meetingInfo?.title,
        date: actaData?.meetingInfo?.date,
      },
    };
  }
);

// Function to record signature
export const recordSignature = onCall(
  {
    cors: true,
  },
  async (request) => {
    const { actaId, attendeeId, token, signatureUrl } = request.data as {
      actaId: string;
      attendeeId: string;
      token: string;
      signatureUrl: string;
    };

    if (!actaId || !attendeeId || !token || !signatureUrl) {
      throw new HttpsError(
        "invalid-argument",
        "Se requieren todos los campos: actaId, attendeeId, token, signatureUrl."
      );
    }

    const db = getFirestore();
    const actaRef = db.collection("actas").doc(actaId);
    const actaDoc = await actaRef.get();

    if (!actaDoc.exists) {
      throw new HttpsError("not-found", "El acta no existe.");
    }

    const actaData = actaDoc.data();
    const attendeeIndex = actaData?.attendees?.findIndex(
      (a: Attendee) => a.id === attendeeId
    );

    if (attendeeIndex === undefined || attendeeIndex < 0) {
      throw new HttpsError("not-found", "El asistente no existe.");
    }

    const attendee = actaData?.attendees[attendeeIndex];

    // Verify token
    if (attendee.signatureToken !== token) {
      throw new HttpsError("permission-denied", "Token de firma inválido.");
    }

    // Check if already signed
    if (attendee.signatureStatus === "signed") {
      throw new HttpsError("already-exists", "El acta ya fue firmada.");
    }

    // Update attendee signature
    const updatedAttendees = [...actaData!.attendees];
    updatedAttendees[attendeeIndex] = {
      ...attendee,
      signatureStatus: "signed",
      signatureUrl,
      signedAt: FieldValue.serverTimestamp(),
    };

    // Check if all attendees have signed
    const allSigned = updatedAttendees.every(
      (a: Attendee) => a.signatureStatus === "signed"
    );

    await actaRef.update({
      attendees: updatedAttendees,
      status: allSigned ? "completed" : "pending_signatures",
      ...(allSigned && { completedAt: FieldValue.serverTimestamp() }),
    });

    return {
      success: true,
      message: "Firma registrada exitosamente.",
      allSigned,
    };
  }
);
