import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/hooks/useAuth'
import { MOCK_USER, initializeDemoData } from '@/services/mockData'
import type { User } from '@/types'

export const useMockLogin = () => {
  const { setUser, setLoading } = useAuthStore()
  const navigate = useNavigate()

  const loginAsGuest = () => {
    setLoading(true)

    // Initialize demo data in localStorage
    initializeDemoData()

    // Create a properly typed mock user
    const mockUser: User = {
      ...MOCK_USER,
      createdAt: { toDate: () => new Date() } as any,
      lastLoginAt: { toDate: () => new Date() } as any,
    }

    console.log('Modo Demo: Iniciando sesion como invitado...')

    // Short delay to show loading state
    setTimeout(() => {
      setUser(mockUser)
      setLoading(false)
      navigate('/dashboard')
    }, 800)
  }

  return { loginAsGuest }
}
