# APP-REUNIONES

Plataforma SaaS para generar actas de reunión con inteligencia artificial.

## Descripcion

APP-REUNIONES es una aplicacion web que permite a equipos y organizaciones gestionar sus reuniones de manera eficiente. Utiliza inteligencia artificial (Gemini) para generar actas automaticas, resumenes y puntos de accion a partir de las notas de la reunion.

## Caracteristicas Principales

- **Gestion de reuniones**: Crear, editar y organizar reuniones
- **Generacion de actas con IA**: Utiliza Gemini AI para generar actas profesionales automaticamente
- **Exportacion multiple**: Exporta actas en PDF y Word (DOCX)
- **Autenticacion**: Sistema de usuarios con Firebase Authentication
- **Almacenamiento en la nube**: Datos sincronizados con Firebase/Firestore
- **Firmas digitales**: Soporte para firmas de participantes
- **Interfaz moderna**: UI construida con React, Tailwind CSS y componentes Radix UI

## Tecnologias

- **Frontend**: React 19, TypeScript, Vite
- **Estilos**: Tailwind CSS, Radix UI
- **Estado**: Zustand
- **Backend/Auth**: Firebase (Authentication, Firestore)
- **IA**: Google Gemini AI
- **Exportacion**: jsPDF, docx

## Requisitos Previos

- Node.js 18 o superior
- npm o yarn
- Cuenta de Firebase con proyecto configurado
- API Key de Google Gemini

## Instalacion

1. Clonar el repositorio:
```bash
git clone https://github.com/tu-usuario/app-reuniones.git
cd app-reuniones
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno:
```bash
cp .env.example .env
```

4. Editar `.env` con tus credenciales:
```env
VITE_FIREBASE_API_KEY=tu-api-key
VITE_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu-proyecto-id
VITE_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=tu-sender-id
VITE_FIREBASE_APP_ID=tu-app-id
GEMINI_API_KEY=tu-gemini-api-key
```

## Scripts Disponibles

| Comando | Descripcion |
|---------|-------------|
| `npm run dev` | Inicia el servidor de desarrollo |
| `npm run build` | Compila el proyecto para produccion |
| `npm run preview` | Previsualiza la build de produccion |
| `npm run lint` | Ejecuta ESLint para analisis de codigo |
| `npm run format` | Formatea el codigo con Prettier |

## Estructura del Proyecto

```
app-reuniones/
├── src/
│   ├── components/     # Componentes React
│   ├── pages/          # Paginas de la aplicacion
│   ├── hooks/          # Custom hooks
│   ├── store/          # Estado global (Zustand)
│   ├── lib/            # Utilidades y configuraciones
│   └── types/          # Tipos TypeScript
├── public/             # Archivos estaticos
└── ...
```

## Deployment

### Firebase Hosting

1. Instalar Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Iniciar sesion y configurar:
```bash
firebase login
firebase init hosting
```

3. Compilar y desplegar:
```bash
npm run build
firebase deploy
```

### Otras Plataformas

El proyecto puede desplegarse en cualquier plataforma que soporte aplicaciones SPA:
- Vercel
- Netlify
- GitHub Pages

## Contribuir

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## Licencia

Este proyecto esta bajo la Licencia MIT. Ver el archivo [LICENSE](LICENSE) para mas detalles.
