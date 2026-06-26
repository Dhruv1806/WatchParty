const rawBackendUrl = import.meta.env.VITE_BACKEND_URL?.trim() || 'https://movieparty-backend.onrender.com'

export const BACKEND_URL = rawBackendUrl.replace(/\/+$/, '')
