# Plan de Arquitectura: Plataforma de Actas de Reunión con IA

## Resumen Ejecutivo
Plataforma web para generar actas de reunión automáticas usando IA (Gemini), con soporte para entrada de texto/audio, firmas digitales y exportación a PDF.

---

## 1. Stack Tecnológico Seleccionado

| Componente | Tecnología |
|------------|------------|
| Frontend | React 18 + Vite + TypeScript |
| UI Framework | Tailwind CSS + shadcn/ui |
| Estado | Zustand o React Context |
| Backend | Firebase (Auth, Firestore, Storage, Functions) |
| LLM | Google Gemini API (gemini-1.5-pro) |
| Speech-to-Text | Google Cloud Speech-to-Text |
| PDF | jsPDF + html2canvas |
| Firmas | react-signature-canvas |

---

## 2. Arquitectura General del Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + Vite)                   │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │  Auth    │  │  Actas   │  │  Firmas  │  │  Organizaciones  │ │
│  │  Module  │  │  Module  │  │  Module  │  │     Module       │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FIREBASE SERVICES                             │
├─────────────┬─────────────┬─────────────┬───────────────────────┤
│   Auth      │  Firestore  │   Storage   │   Cloud Functions     │
│             │             │             │                       │
│ • Email/Pw  │ • Usuarios  │ • Audios    │ • generateActa()      │
│ • Google    │ • Orgs      │ • Firmas    │ • transcribeAudio()   │
│             │ • Actas     │ • PDFs      │ • sendSignatureReq()  │
│             │ • Firmas    │             │ • generatePDF()       │
└─────────────┴─────────────┴─────────────┴───────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SERVICIOS EXTERNOS                            │
├──────────────────────────────┬──────────────────────────────────┤
│   Google Gemini API          │   Google Cloud Speech-to-Text    │
│   (Generación de actas)      │   (Transcripción de audio)       │
└──────────────────────────────┴──────────────────────────────────┘
```

---

## 3. Flujo del Usuario Paso a Paso

### 3.1 Flujo Principal de Creación de Acta

```
1. LOGIN/REGISTRO
   └─> Usuario se autentica (Email/Google)
   └─> Se asigna a una organización (o crea una nueva)

2. CREAR NUEVA ACTA
   └─> Formulario de datos básicos:
       • Fecha y hora
       • Lugar
       • Asistentes (nombre, email, cargo)
       • Orden del día (items)

3. INGRESAR CONTENIDO DE LA REUNIÓN
   └─> Opción A: Texto libre
       • Textarea para escribir notas/ideas desordenadas
   └─> Opción B: Audio
       • Grabar audio en vivo O
       • Subir archivo de audio
       └─> Transcripción automática vía Speech-to-Text

4. GENERAR ACTA CON IA
   └─> Click en "Generar Acta"
   └─> Firebase Function procesa con Gemini:
       • Interpreta contenido desordenado
       • Estructura según formato estándar
       • Genera redacción formal

5. REVISAR Y EDITAR
   └─> Vista previa del acta generada
   └─> Editor para ajustes manuales
   └─> Regenerar secciones específicas si necesario

6. SOLICITAR FIRMAS
   └─> Enviar links de firma a asistentes por email
   └─> Dashboard de estado de firmas (pendiente/firmado)

7. EXPORTAR Y FINALIZAR
   └─> Generar PDF con firmas incluidas
   └─> Guardar en historial
   └─> Compartir/descargar
```

### 3.2 Flujo de Firma para Asistentes

```
1. RECIBIR EMAIL
   └─> Link único con token temporal (expira en 7 días)

2. ACCEDER AL LINK
   └─> Vista del acta en modo lectura
   └─> Sin necesidad de registro

3. FIRMAR
   └─> Canvas para dibujar firma manuscrita
   └─> Confirmar con nombre completo

4. CONFIRMACIÓN
   └─> Firma guardada en Storage
   └─> Notificación al creador del acta
```

---

## 4. Diseño de Base de Datos (Firestore)

### 4.1 Colecciones

```typescript
// COLECCIÓN: organizations
{
  id: string,                    // Auto-generated
  name: string,                  // "Empresa ABC"
  slug: string,                  // "empresa-abc" (único)
  createdAt: Timestamp,
  createdBy: string,             // userId
  settings: {
    logoUrl?: string,
    defaultTemplate?: string,
    geminiApiKey?: string,       // Encriptada, opcional para API propia
  }
}

// COLECCIÓN: users
{
  id: string,                    // Mismo que Firebase Auth UID
  email: string,
  displayName: string,
  photoURL?: string,
  organizationId: string,        // Referencia a organization
  role: 'admin' | 'member',
  createdAt: Timestamp,
  lastLoginAt: Timestamp
}

// COLECCIÓN: actas
{
  id: string,
  organizationId: string,        // Para multitenancy
  createdBy: string,             // userId
  status: 'draft' | 'pending_signatures' | 'completed',

  // Datos básicos
  meetingInfo: {
    title: string,
    date: Timestamp,
    startTime: string,           // "14:00"
    endTime?: string,            // "15:30"
    location: string,
    modality: 'presencial' | 'virtual' | 'híbrida'
  },

  // Asistentes
  attendees: [{
    id: string,                  // UUID generado
    name: string,
    email: string,
    role: string,                // "Gerente", "Desarrollador"
    attendance: 'present' | 'absent' | 'excused',
    signatureStatus: 'pending' | 'signed',
    signatureToken?: string,     // Token único para firmar
    signatureUrl?: string,       // URL en Storage
    signedAt?: Timestamp
  }],

  // Contenido
  agenda: string[],              // Orden del día
  rawContent: string,            // Texto/transcripción original
  audioUrl?: string,             // URL del audio en Storage

  // Acta generada
  generatedContent: {
    introduction: string,
    development: string,         // Desarrollo de la reunión
    agreements: string[],        // Acuerdos
    commitments: [{
      description: string,
      responsible: string,
      dueDate?: Timestamp
    }],
    closure: string,
    nextMeeting?: {
      date: Timestamp,
      location: string
    }
  },

  // Metadata
  createdAt: Timestamp,
  updatedAt: Timestamp,
  completedAt?: Timestamp,
  pdfUrl?: string
}

// COLECCIÓN: actaTemplates (opcional, para plantillas personalizadas)
{
  id: string,
  organizationId: string,
  name: string,
  structure: object,
  promptTemplate: string,
  isDefault: boolean
}
```

### 4.2 Reglas de Seguridad (Firestore Rules)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Usuarios solo pueden leer/escribir su propio documento
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Organizaciones: miembros pueden leer, admins pueden escribir
    match /organizations/{orgId} {
      allow read: if isOrgMember(orgId);
      allow write: if isOrgAdmin(orgId);
    }

    // Actas: acceso basado en organización
    match /actas/{actaId} {
      allow read: if isOrgMember(resource.data.organizationId);
      allow create: if isOrgMember(request.resource.data.organizationId);
      allow update, delete: if isOrgMember(resource.data.organizationId);
    }

    // Funciones helper
    function isOrgMember(orgId) {
      return request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.organizationId == orgId;
    }

    function isOrgAdmin(orgId) {
      return isOrgMember(orgId) &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

---

## 5. Integración con Google Gemini

### 5.1 Prompt Base para Generación de Actas

```typescript
const ACTA_GENERATION_PROMPT = `
Eres un asistente especializado en redacción de actas de reunión formales y profesionales.

CONTEXTO DE LA REUNIÓN:
- Título: {title}
- Fecha: {date}
- Hora: {startTime} - {endTime}
- Lugar: {location}
- Modalidad: {modality}

ASISTENTES:
{attendeesList}

ORDEN DEL DÍA:
{agenda}

CONTENIDO DE LA REUNIÓN (notas/transcripción):
{rawContent}

INSTRUCCIONES:
1. Interpreta las ideas, aunque estén desordenadas o sean informales
2. Genera un acta formal y profesional con la siguiente estructura:
   - INTRODUCCIÓN: Párrafo formal indicando fecha, hora, lugar y propósito
   - DESARROLLO: Resumen estructurado de los temas tratados, siguiendo el orden del día
   - ACUERDOS: Lista numerada de decisiones tomadas
   - COMPROMISOS: Tabla con descripción, responsable y fecha límite
   - CIERRE: Párrafo formal de cierre indicando hora de finalización

FORMATO DE RESPUESTA:
Responde ÚNICAMENTE con un JSON válido con esta estructura:
{
  "introduction": "texto...",
  "development": "texto...",
  "agreements": ["acuerdo 1", "acuerdo 2"],
  "commitments": [
    {"description": "...", "responsible": "...", "dueDate": "YYYY-MM-DD"}
  ],
  "closure": "texto...",
  "nextMeeting": {"date": "YYYY-MM-DD", "location": "..."} // opcional
}

REGLAS DE REDACCIÓN:
- Usa lenguaje formal y profesional en español
- Tercera persona del singular o plural
- Evita coloquialismos
- Sé conciso pero completo
- Mantén coherencia y fluidez
`;
```

### 5.2 Cloud Function para Generación

```typescript
// functions/src/generateActa.ts
import { onCall } from 'firebase-functions/v2/https';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const generateActa = onCall(async (request) => {
  const { meetingInfo, attendees, agenda, rawContent } = request.data;

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

  const prompt = buildPrompt(meetingInfo, attendees, agenda, rawContent);

  const result = await model.generateContent(prompt);
  const response = result.response.text();

  // Parsear JSON de la respuesta
  const generatedContent = JSON.parse(response);

  return { success: true, content: generatedContent };
});
```

---

## 6. Manejo de Audio y Transcripción

### 6.1 Flujo de Transcripción

```
1. CAPTURA DE AUDIO
   ├─> Grabación en vivo (MediaRecorder API)
   │   └─> Formato: webm/opus
   └─> Subida de archivo
       └─> Formatos: mp3, wav, m4a, webm

2. SUBIDA A STORAGE
   └─> Path: /organizations/{orgId}/audios/{actaId}/{filename}
   └─> Metadata: contentType, duration, originalName

3. TRANSCRIPCIÓN (Cloud Function)
   └─> Trigger: onFinalize en Storage
   └─> Proceso:
       • Convertir a formato compatible si necesario (ffmpeg)
       • Enviar a Google Speech-to-Text
       • Guardar transcripción en Firestore

4. DISPONIBILIDAD
   └─> Actualizar acta con rawContent = transcripción
   └─> Notificar al frontend vía Firestore listener
```

### 6.2 Cloud Function de Transcripción

```typescript
// functions/src/transcribeAudio.ts
import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { SpeechClient } from '@google-cloud/speech';

export const transcribeAudio = onObjectFinalized(async (event) => {
  const filePath = event.data.name;

  // Solo procesar audios en la carpeta correcta
  if (!filePath.includes('/audios/')) return;

  const speechClient = new SpeechClient();
  const gcsUri = `gs://${event.data.bucket}/${filePath}`;

  const [operation] = await speechClient.longRunningRecognize({
    audio: { uri: gcsUri },
    config: {
      encoding: 'WEBM_OPUS',
      sampleRateHertz: 48000,
      languageCode: 'es-ES',
      enableAutomaticPunctuation: true,
      model: 'latest_long',
    },
  });

  const [response] = await operation.promise();
  const transcription = response.results
    .map(result => result.alternatives[0].transcript)
    .join('\n');

  // Actualizar Firestore con la transcripción
  // ... (extraer actaId del path y actualizar)
});
```

---

## 7. Sistema de Firmas Digitales

### 7.1 Flujo Técnico

```
1. SOLICITUD DE FIRMAS
   └─> Cloud Function: sendSignatureRequests
       • Genera token único por asistente (UUID + hash)
       • Guarda token en Firestore (attendee.signatureToken)
       • Envía email con link: /sign/{actaId}?token={token}
       • Token expira en 7 días

2. PÁGINA DE FIRMA (Pública)
   └─> Ruta: /sign/:actaId
   └─> Validación:
       • Verificar token válido y no expirado
       • Verificar que no haya firmado ya
   └─> Contenido:
       • Vista del acta en modo lectura
       • Canvas para firma manuscrita
       • Campo de confirmación de nombre

3. CAPTURA DE FIRMA
   └─> react-signature-canvas
   └─> Exportar como PNG (base64)
   └─> Dimensiones: 400x150px
   └─> Fondo transparente

4. GUARDADO
   └─> Subir imagen a Storage: /signatures/{actaId}/{attendeeId}.png
   └─> Actualizar Firestore:
       • attendee.signatureStatus = 'signed'
       • attendee.signatureUrl = URL de Storage
       • attendee.signedAt = Timestamp

5. NOTIFICACIÓN
   └─> Notificar al creador del acta
   └─> Si todas firmadas → marcar acta como 'completed'
```

### 7.2 Componente de Firma (React)

```typescript
// src/components/SignatureCanvas.tsx
import SignatureCanvas from 'react-signature-canvas';

interface Props {
  onSave: (signatureDataUrl: string) => void;
}

export function SignaturePad({ onSave }: Props) {
  const sigRef = useRef<SignatureCanvas>(null);

  const handleSave = () => {
    if (sigRef.current?.isEmpty()) {
      alert('Por favor, firme antes de continuar');
      return;
    }
    const dataUrl = sigRef.current.toDataURL('image/png');
    onSave(dataUrl);
  };

  return (
    <div className="border rounded-lg p-4">
      <SignatureCanvas
        ref={sigRef}
        canvasProps={{
          width: 400,
          height: 150,
          className: 'border bg-white'
        }}
      />
      <div className="flex gap-2 mt-2">
        <button onClick={() => sigRef.current?.clear()}>Limpiar</button>
        <button onClick={handleSave}>Confirmar Firma</button>
      </div>
    </div>
  );
}
```

---

## 8. Generación de PDF

### 8.1 Estructura del PDF

```
┌─────────────────────────────────────────┐
│            LOGO ORGANIZACIÓN            │
│                                         │
│         ACTA DE REUNIÓN N° XXX          │
│                                         │
├─────────────────────────────────────────┤
│ Fecha: XX/XX/XXXX                       │
│ Hora: XX:XX - XX:XX                     │
│ Lugar: XXXXX                            │
├─────────────────────────────────────────┤
│ ASISTENTES:                             │
│ • Nombre - Cargo                        │
│ • Nombre - Cargo                        │
├─────────────────────────────────────────┤
│ ORDEN DEL DÍA:                          │
│ 1. Tema 1                               │
│ 2. Tema 2                               │
├─────────────────────────────────────────┤
│ DESARROLLO DE LA REUNIÓN:               │
│ [Contenido generado por IA]             │
├─────────────────────────────────────────┤
│ ACUERDOS:                               │
│ 1. Acuerdo 1                            │
│ 2. Acuerdo 2                            │
├─────────────────────────────────────────┤
│ COMPROMISOS:                            │
│ ┌─────────────┬────────────┬──────────┐ │
│ │ Compromiso  │ Responsable│  Fecha   │ │
│ ├─────────────┼────────────┼──────────┤ │
│ │ ...         │ ...        │ ...      │ │
│ └─────────────┴────────────┴──────────┘ │
├─────────────────────────────────────────┤
│ FIRMAS:                                 │
│                                         │
│ [Firma 1]        [Firma 2]              │
│ ___________      ___________            │
│ Nombre           Nombre                 │
│ Cargo            Cargo                  │
└─────────────────────────────────────────┘
```

### 8.2 Implementación con jsPDF

```typescript
// src/utils/generatePDF.ts
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export async function generateActaPDF(acta: Acta): Promise<Blob> {
  const doc = new jsPDF();

  // Configuración
  doc.setFont('helvetica');

  // Header
  doc.setFontSize(18);
  doc.text('ACTA DE REUNIÓN', 105, 20, { align: 'center' });

  // Información básica
  doc.setFontSize(11);
  doc.text(`Fecha: ${formatDate(acta.meetingInfo.date)}`, 20, 40);
  doc.text(`Lugar: ${acta.meetingInfo.location}`, 20, 47);

  // Asistentes (tabla)
  doc.autoTable({
    startY: 55,
    head: [['Nombre', 'Cargo', 'Asistencia']],
    body: acta.attendees.map(a => [a.name, a.role, a.attendance]),
  });

  // Contenido generado
  // ... (agregar secciones)

  // Firmas
  const signaturesY = doc.lastAutoTable.finalY + 30;
  for (let i = 0; i < acta.attendees.length; i++) {
    const attendee = acta.attendees[i];
    if (attendee.signatureUrl) {
      const img = await loadImage(attendee.signatureUrl);
      const x = 20 + (i % 3) * 60;
      const y = signaturesY + Math.floor(i / 3) * 40;
      doc.addImage(img, 'PNG', x, y, 50, 20);
      doc.text(attendee.name, x + 25, y + 25, { align: 'center' });
    }
  }

  return doc.output('blob');
}
```

---

## 9. Estructura de Carpetas del Proyecto

```
app-reuniones/
├── src/
│   ├── components/
│   │   ├── ui/                    # Componentes shadcn/ui
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   └── AuthGuard.tsx
│   │   ├── actas/
│   │   │   ├── ActaForm.tsx       # Formulario de creación
│   │   │   ├── ActaPreview.tsx    # Vista previa
│   │   │   ├── ActaEditor.tsx     # Editor de acta generada
│   │   │   ├── ActaList.tsx       # Lista de actas
│   │   │   └── ActaCard.tsx
│   │   ├── audio/
│   │   │   ├── AudioRecorder.tsx  # Grabación en vivo
│   │   │   └── AudioUploader.tsx  # Subida de archivo
│   │   ├── signatures/
│   │   │   ├── SignaturePad.tsx
│   │   │   ├── SignatureStatus.tsx
│   │   │   └── SignatureRequest.tsx
│   │   └── organization/
│   │       ├── OrgSettings.tsx
│   │       └── MemberList.tsx
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── CreateActa.tsx
│   │   ├── ViewActa.tsx
│   │   ├── EditActa.tsx
│   │   ├── SignActa.tsx           # Página pública de firma
│   │   └── Settings.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useActas.ts
│   │   ├── useOrganization.ts
│   │   └── useAudioRecorder.ts
│   ├── services/
│   │   ├── firebase.ts            # Configuración Firebase
│   │   ├── auth.ts
│   │   ├── actas.ts
│   │   ├── storage.ts
│   │   └── gemini.ts
│   ├── utils/
│   │   ├── generatePDF.ts
│   │   ├── formatters.ts
│   │   └── validators.ts
│   ├── types/
│   │   └── index.ts               # Tipos TypeScript
│   ├── App.tsx
│   └── main.tsx
├── functions/
│   ├── src/
│   │   ├── index.ts
│   │   ├── generateActa.ts
│   │   ├── transcribeAudio.ts
│   │   ├── sendSignatureRequest.ts
│   │   └── generatePDF.ts
│   ├── package.json
│   └── tsconfig.json
├── public/
├── .env.local                     # Variables de entorno
├── firebase.json
├── firestore.rules
├── storage.rules
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── vite.config.ts
```

---

## 10. Recomendaciones de UX/UI

### 10.1 Principios de Diseño

- **Minimalista y profesional**: Colores corporativos neutros (azules, grises)
- **Flujo guiado**: Stepper/wizard para creación de actas
- **Feedback inmediato**: Estados de carga, éxito y error claros
- **Mobile-first**: Responsive para tablets (uso en reuniones)

### 10.2 Paleta de Colores Sugerida

```css
:root {
  --primary: #1e40af;      /* Azul corporativo */
  --primary-light: #3b82f6;
  --secondary: #64748b;    /* Gris slate */
  --success: #10b981;      /* Verde esmeralda */
  --warning: #f59e0b;      /* Ámbar */
  --error: #ef4444;        /* Rojo */
  --background: #f8fafc;   /* Gris muy claro */
  --surface: #ffffff;
}
```

### 10.3 Componentes Clave de UI

1. **Stepper de creación**: 4 pasos (Datos básicos → Asistentes → Contenido → Generar)
2. **Editor de texto enriquecido**: Para ajustes manuales del acta
3. **Timeline de firmas**: Estado visual de cada firma
4. **Preview modal**: Vista previa del PDF antes de exportar
5. **Toast notifications**: Feedback de acciones

---

## 11. Consideraciones de Seguridad

### 11.1 Autenticación y Autorización

- Firebase Auth con providers configurados
- Tokens de sesión con refresh automático
- Reglas de Firestore basadas en organización
- Tokens de firma con expiración (7 días)

### 11.2 Protección de Datos

- API keys de Gemini solo en Cloud Functions (nunca en frontend)
- Encriptación en tránsito (HTTPS)
- Firestore y Storage con reglas restrictivas
- Sanitización de inputs antes de enviar a Gemini

### 11.3 Validaciones

- Rate limiting en Cloud Functions
- Validación de tipos con Zod en frontend y backend
- Verificación de pertenencia a organización en cada operación

---

## 12. Consideraciones de Escalabilidad

### 12.1 Firebase

- Índices compuestos para queries frecuentes
- Paginación en listas de actas
- Cloud Functions con memory/timeout configurados apropiadamente

### 12.2 Optimizaciones

- Lazy loading de componentes pesados
- Compresión de audio antes de subir
- Cache de actas recientes en localStorage
- Debounce en autoguardado de borradores

### 12.3 Costos Estimados (Firebase + APIs)

| Servicio | Uso estimado | Costo aproximado |
|----------|--------------|------------------|
| Firebase Auth | Gratuito hasta 50k MAU | $0 |
| Firestore | ~10GB + 1M reads/month | ~$5-10/mes |
| Storage | ~50GB audios/firmas | ~$1-2/mes |
| Cloud Functions | ~100k invocaciones | ~$0-5/mes |
| Gemini API | ~1000 actas/mes | ~$5-15/mes |
| Speech-to-Text | ~100 horas audio/mes | ~$150/mes |

---

## 13. Plan de Implementación por Fases

### Fase 1: Fundación
- [ ] Setup proyecto React + Vite + TypeScript
- [ ] Configurar Firebase (Auth, Firestore, Storage)
- [ ] Implementar autenticación (Email + Google)
- [ ] Crear modelo de datos en Firestore
- [ ] UI básica con Tailwind + shadcn/ui

### Fase 2: Core de Actas
- [ ] Formulario de creación de actas
- [ ] Cloud Function de integración con Gemini
- [ ] Vista previa y edición de actas generadas
- [ ] Lista y búsqueda de actas

### Fase 3: Audio y Transcripción
- [ ] Componente de grabación de audio
- [ ] Upload de archivos de audio
- [ ] Cloud Function de transcripción
- [ ] Integración con flujo de creación

### Fase 4: Firmas y PDF
- [ ] Sistema de tokens para firmas
- [ ] Página pública de firma
- [ ] Canvas de firma manuscrita
- [ ] Generación de PDF con firmas
- [ ] Envío de emails de solicitud

### Fase 5: Organización y Polish
- [ ] Sistema multitenancy
- [ ] Gestión de miembros
- [ ] Dashboard y estadísticas
- [ ] Testing y corrección de bugs
- [ ] Optimizaciones de rendimiento

---

## 14. Verificación y Testing

### 14.1 Pruebas Manuales

1. **Flujo completo de creación**:
   - Crear acta con todos los campos
   - Generar con Gemini
   - Verificar calidad de redacción

2. **Transcripción de audio**:
   - Grabar audio de 5 minutos
   - Verificar transcripción correcta
   - Probar con diferentes acentos

3. **Sistema de firmas**:
   - Enviar solicitud de firma
   - Firmar desde link externo
   - Verificar firma en PDF final

4. **Multitenancy**:
   - Crear 2 organizaciones
   - Verificar aislamiento de datos

### 14.2 Tests Automatizados

- Unit tests para utilidades (formatters, validators)
- Integration tests para Cloud Functions
- E2E tests con Playwright para flujos críticos

---

## 15. Archivos Críticos a Crear

| Archivo | Propósito |
|---------|-----------|
| `src/services/firebase.ts` | Configuración e inicialización de Firebase |
| `src/types/index.ts` | Tipos TypeScript para toda la app |
| `src/pages/CreateActa.tsx` | Página principal de creación |
| `functions/src/generateActa.ts` | Cloud Function para Gemini |
| `functions/src/transcribeAudio.ts` | Cloud Function para STT |
| `firestore.rules` | Reglas de seguridad de Firestore |
| `storage.rules` | Reglas de seguridad de Storage |

---

## 16. Variables de Entorno Requeridas

```bash
# .env.local (Frontend)
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_AUTH_DOMAIN=xxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=xxx
VITE_FIREBASE_STORAGE_BUCKET=xxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=xxx
VITE_FIREBASE_APP_ID=xxx

# Firebase Functions (.env o Secret Manager)
GEMINI_API_KEY=xxx
```

---

## Próximos Pasos

Una vez aprobado este plan:
1. Inicializar proyecto con `npm create vite@latest`
2. Configurar Firebase en Google Cloud Console
3. Implementar Fase 1 (Fundación)
