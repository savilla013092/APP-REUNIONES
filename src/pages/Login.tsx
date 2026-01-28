import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { auth, db, isFirebaseConfigured } from '@/services/firebase'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth'
import { doc, setDoc, Timestamp } from 'firebase/firestore'
import { useState } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useMockLogin } from '@/hooks/useMockLogin'
import { Badge } from '@/components/ui/badge'

export default function Login() {
  const location = useLocation()
  const isRegisterMode = location.pathname === '/register'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
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
      await signInWithEmailAndPassword(auth, email, password)
      navigate('/dashboard')
    } catch (err: any) {
      console.error(err)
      if (err.code === 'auth/user-not-found') {
        setError('Usuario no encontrado. Registrate primero.')
      } else if (err.code === 'auth/wrong-password') {
        setError('Contrasena incorrecta.')
      } else {
        setError('Error al iniciar sesion. Revisa tus credenciales.')
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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">
              {isRegisterMode ? 'Crear Cuenta' : 'Iniciar Sesion'}
            </CardTitle>
            {!isFirebaseConfigured && (
              <Badge variant="secondary" className="text-xs">
                Modo Demo
              </Badge>
            )}
          </div>
          <CardDescription>
            {isFirebaseConfigured
              ? isRegisterMode
                ? 'Crea tu cuenta para comenzar a gestionar tus actas'
                : 'Ingresa a tu cuenta para gestionar tus actas'
              : 'Firebase no configurado. Usa el boton Invitado para probar la app.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={isRegisterMode ? handleRegister : handleEmailLogin} className="space-y-4">
            {isRegisterMode && (
              <div className="space-y-2">
                <Label htmlFor="displayName">Nombre Completo</Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Juan Perez"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  required
                  disabled={!isFirebaseConfigured}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electronico</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@ejemplo.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                disabled={!isFirebaseConfigured}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contrasena</Label>
              <Input
                id="password"
                type="password"
                placeholder={isRegisterMode ? 'Minimo 6 caracteres' : ''}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                disabled={!isFirebaseConfigured}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading || !isFirebaseConfigured}>
              {loading ? 'Cargando...' : isRegisterMode ? 'Crear Cuenta' : 'Entrar'}
            </Button>
          </form>
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">O continua con</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleGoogleLogin}
              disabled={loading || !isFirebaseConfigured}
            >
              Google
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              onClick={loginAsGuest}
              disabled={loading}
            >
              Invitado
            </Button>
          </div>
          {!isFirebaseConfigured && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-800">
                <strong>Modo Demo:</strong> Los datos se guardan localmente en tu navegador. Para
                usar Firebase, configura las variables en{' '}
                <code className="bg-amber-100 px-1 rounded">.env.local</code>
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            {isRegisterMode ? (
              <>
                Ya tienes cuenta?{' '}
                <Link to="/login" className="text-primary hover:underline">
                  Inicia Sesion
                </Link>
              </>
            ) : (
              <>
                No tienes cuenta?{' '}
                <Link to="/register" className="text-primary hover:underline">
                  Registrate
                </Link>
              </>
            )}
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
