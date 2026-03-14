import React, { Suspense, useEffect, useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Shell from './components/layout/Shell'
import { api } from './lib/api'
import type { User } from './types'

const Dashboard = React.lazy(() => import('./pages/Dashboard'))
const MealPlan = React.lazy(() => import('./pages/MealPlan'))
const Homework = React.lazy(() => import('./pages/Homework'))
const Calendar = React.lazy(() => import('./pages/Calendar'))
const Groceries = React.lazy(() => import('./pages/Groceries'))
const Recipes = React.lazy(() => import('./pages/Recipes'))
const Login = React.lazy(() => import('./pages/Login'))
const Admin = React.lazy(() => import('./pages/Admin'))
const Aula = React.lazy(() => import('./pages/Aula'))
const Todos = React.lazy(() => import('./pages/Todos'))
const Settings = React.lazy(() => import('./pages/Settings'))
const Family = React.lazy(() => import('./pages/Family'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
})


const pageTitles: Record<string, string> = {
  '/': 'Oversigt',
  '/meals': 'Madplan',
  '/homework': 'Lektier',
  '/calendar': 'Kalender',
  '/groceries': 'Indkøbsliste',
  '/recipes': 'Opskrifter',
  '/admin': 'Admin',
  '/aula': 'Aula',
  '/todos': 'Opgaver',
  '/family': 'Familie',
}

function AuthenticatedRoutes() {
  const location = useLocation()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.auth
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Indlæser...</div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  const title = pageTitles[location.pathname] || 'Family Hub'

  return (
    <Shell title={title} user={user}>
      <Suspense fallback={<div className="text-muted-foreground">Indlæser...</div>}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/meals" element={<MealPlan />} />
          <Route path="/homework" element={<Homework />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/groceries" element={<Groceries />} />
          <Route path="/recipes" element={<Recipes />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/aula" element={<Aula />} />
          <Route path="/todos" element={<Todos />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/family" element={<Family />} />
        </Routes>
      </Suspense>
    </Shell>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="text-muted-foreground">Indlæser...</div></div>}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={<AuthenticatedRoutes />} />
        </Routes>
      </Suspense>
    </QueryClientProvider>
  )
}
