import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { auth, db, isFirebaseConfigured } from '@/services/firebase'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore'
import { useState } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useMockLogin } from '@/hooks/useMockLogin'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  FileText,
  Mic,
  Download,
  Loader2,
  User,
} from 'lucide-react'

export default function Login() {
  const location = useLocation()
  const isRegisterMode = location.pathname === '/register'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const navigate = useNavigate()

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Escribe tu correo electronico primero y luego haz clic en "Olvide mi contrasena".')
      return
    }
    setLoading(true)
    setError('')
    try {
      await sendPasswordResetEmail(auth, email)
      setResetSent(true)
    } catch (err: any) {
      setError('No se pudo enviar el correo. Verifica que el correo este bien escrito.')
    } finally {
      setLoading(false)
    }
  }
  const { loginAsGuest } = useMockLogin()

  const createUserDocument = async (uid: string, email: string, name: string) => {
    await setDoc(doc(db, 'users', uid), {
      email,
      displayName: name,
      organizationId: 'org-' + uid.substring(0, 8), // Create personal org
      role: 'admin',
      createdAt: Timestamp.now(),
      lastLoginAt: Timestamp.now(),
    })
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isFirebaseConfigured) {
      setError('Firebase no esta configurado. Usa el modo Invitado para probar la aplicacion.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password)

      // Ensure Firestore user document exists (may be missing if account
      // was created outside the app's register flow)
      const userRef = doc(db, 'users', credential.user.uid)
      const userSnap = await getDoc(userRef)
      if (!userSnap.exists()) {
        await createUserDocument(
          credential.user.uid,
          credential.user.email || email,
          credential.user.displayName || email.split('@')[0]
        )
      }

      navigate('/dashboard')
    } catch (err: any) {
      console.error(err)
      if (
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/invalid-login-credentials'
      ) {
        setError('Correo o contrasena incorrectos. Si no tienes cuenta ve a Registrate.')
      } else {
        setError('Error al iniciar sesion: ' + (err.message || err.code))
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isFirebaseConfigured) {
      setError('Firebase no esta configurado. Usa el modo Invitado para probar la aplicacion.')
      return
    }
    if (password.length < 6) {
      setError('La contrasena debe tener al menos 6 caracteres.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)

      // Update display name in Auth
      await updateProfile(userCredential.user, { displayName })

      // Create user document in Firestore
      await createUserDocument(userCredential.user.uid, email, displayName)

      navigate('/dashboard')
    } catch (err: any) {
      console.error(err)
      if (err.code === 'auth/email-already-in-use') {
        setError('Este correo ya esta registrado. Inicia sesion.')
      } else if (err.code === 'auth/weak-password') {
        setError('La contrasena es muy debil. Usa al menos 6 caracteres.')
      } else if (err.code === 'auth/invalid-email') {
        setError('El correo electronico no es valido.')
      } else {
        setError('Error al registrar. ' + err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    if (!isFirebaseConfigured) {
      setError('Firebase no esta configurado. Usa el modo Invitado para probar la aplicacion.')
      return
    }
    const provider = new GoogleAuthProvider()
    setLoading(true)
    setError('')
    try {
      const result = await signInWithPopup(auth, provider)

      // Create user document if it doesn't exist
      await createUserDocument(
        result.user.uid,
        result.user.email || '',
        result.user.displayName || 'Usuario'
      )

      navigate('/dashboard')
    } catch (err: any) {
      console.error(err)
      setError('Error con el inicio de sesion de Google.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* LEFT PANEL — only desktop */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 relative overflow-hidden">
        {/* Decorative blur circles */}
        <div className="absolute top-[-80px] left-[-80px] w-72 h-72 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-60px] right-[-60px] w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Brand */}
        <div className="relative z-10 flex items-center gap-3">
          <img
            src="/logo-serviciudad.png"
            alt="SERVICIUDAD E.S.P."
            className="w-10 h-10 object-contain"
          />
          <div>
            <span className="text-white font-bold text-lg tracking-tight leading-tight block">
              SERVICIUDAD E.S.P.
            </span>
            <span className="text-slate-400 text-xs tracking-wide">
              Acueducto · Aseo · Alcantarillado
            </span>
          </div>
        </div>

        {/* Hero */}
        <div className="relative z-10 space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-white leading-tight">
              Gestion de actas de reunion{' '}
              <span className="text-blue-300">oficial e inteligente</span>
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed">
              Plataforma institucional para documentar, organizar y firmar las actas de
              los comites y reuniones de SERVICIUDAD E.S.P.
            </p>
          </div>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-9 h-9 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 border border-blue-500/30">
                <FileText className="w-4 h-4 text-blue-300" />
              </div>
              <div>
                <p className="text-white font-medium text-sm">Actas automaticas con IA</p>
                <p className="text-slate-400 text-sm">
                  Redaccion profesional a partir de notas o audio
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-9 h-9 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 border border-blue-500/30">
                <Mic className="w-4 h-4 text-blue-300" />
              </div>
              <div>
                <p className="text-white font-medium text-sm">Firmas digitales</p>
                <p className="text-slate-400 text-sm">
                  Los asistentes firman directamente en la plataforma
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-9 h-9 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 border border-blue-500/30">
                <Download className="w-4 h-4 text-blue-300" />
              </div>
              <div>
                <p className="text-white font-medium text-sm">Exportacion PDF y Word</p>
                <p className="text-slate-400 text-sm">
                  Con encabezado oficial GGFO-02 listo para archivar
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="relative z-10 text-slate-500 text-xs">
          © 2026 SERVICIUDAD E.S.P. Todos los derechos reservados.
        </p>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 lg:w-1/2 flex items-center justify-center p-6 bg-white min-h-screen lg:min-h-0">
        <div className="w-full max-w-sm space-y-6">
          {/* Mobile logo */}
          <div className="flex lg:hidden flex-col items-center gap-1 mb-2">
            <img
              src="/logo-serviciudad.png"
              alt="SERVICIUDAD E.S.P."
              className="w-12 h-12 object-contain"
            />
            <span className="font-bold text-base tracking-tight text-slate-900">
              SERVICIUDAD E.S.P.
            </span>
            <span className="text-xs text-slate-400">Acueducto · Aseo · Alcantarillado</span>
          </div>

          {/* Demo banner */}
          {!isFirebaseConfigured && (
            <div className="flex items-start gap-3 p-3 bg-primary/8 border border-primary/20 rounded-lg">
              <Lock className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-xs text-primary/80 leading-relaxed">
                <span className="font-semibold text-primary">Modo demo activo.</span> Los datos se
                guardan en tu navegador. Usa el boton{' '}
                <span className="font-medium">Continuar como Invitado</span> para explorar la app.
              </p>
            </div>
          )}

          {/* Form header */}
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-slate-900">
              {isRegisterMode ? 'Crear cuenta' : 'Bienvenido de nuevo'}
            </h2>
            <p className="text-sm text-slate-500">
              {isRegisterMode
                ? 'Completa los datos para comenzar'
                : 'Ingresa tus datos para continuar'}
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={isRegisterMode ? handleRegister : handleEmailLogin}
            className="space-y-4"
          >
            {isRegisterMode && (
              <div className="space-y-1.5">
                <Label htmlFor="displayName" className="text-sm font-medium text-slate-700">
                  Nombre completo
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="Juan Perez"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    required
                    disabled={!isFirebaseConfigured}
                    className="pl-9 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                {!isFirebaseConfigured && (
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    No disponible en modo demo
                  </p>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                Correo electronico
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@ejemplo.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  disabled={!isFirebaseConfigured}
                  className="pl-9 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              {!isFirebaseConfigured && (
                <p className="text-xs text-slate-400 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  No disponible en modo demo
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                Contrasena
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={isRegisterMode ? 'Minimo 6 caracteres' : '••••••••'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  disabled={!isFirebaseConfigured}
                  className="pl-9 pr-10 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {!isFirebaseConfigured && (
                <p className="text-xs text-slate-400 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  No disponible en modo demo
                </p>
              )}
            </div>

            {/* Forgot password link — only on login mode */}
            {!isRegisterMode && isFirebaseConfigured && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={loading}
                  className="text-xs text-primary hover:underline underline-offset-4 disabled:opacity-50"
                >
                  Olvide mi contrasena
                </button>
              </div>
            )}

            {/* Reset sent confirmation */}
            {resetSent && (
              <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-green-700 leading-relaxed">
                  Correo de restablecimiento enviado a <strong>{email}</strong>. Revisa tu bandeja
                  de entrada (y spam).
                </p>
              </div>
            )}

            {/* Error box */}
            {error && (
              <div className="flex items-start gap-2 p-3 bg-destructive/8 border border-destructive/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-xs text-destructive leading-relaxed">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !isFirebaseConfigured}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cargando...
                </>
              ) : isRegisterMode ? (
                'Crear cuenta'
              ) : (
                'Entrar'
              )}
            </Button>
          </form>

          {/* Separator */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-slate-400 uppercase tracking-wide">
                O continua con
              </span>
            </div>
          </div>

          {/* Social buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={handleGoogleLogin}
              disabled={loading || !isFirebaseConfigured}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              )}
              Google
            </Button>
            <Button
              variant={isFirebaseConfigured ? 'secondary' : 'default'}
              className="w-full"
              onClick={loginAsGuest}
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Invitado
            </Button>
          </div>

          {/* Toggle login/register */}
          <p className="text-center text-sm text-slate-500">
            {isRegisterMode ? (
              <>
                Ya tienes cuenta?{' '}
                <Link
                  to="/login"
                  className="text-primary font-medium hover:underline underline-offset-4"
                >
                  Inicia sesion
                </Link>
              </>
            ) : (
              <>
                No tienes cuenta?{' '}
                <Link
                  to="/register"
                  className="text-primary font-medium hover:underline underline-offset-4"
                >
                  Registrate gratis
                </Link>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
