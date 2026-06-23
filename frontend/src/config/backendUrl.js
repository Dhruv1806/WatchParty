const rawBackendUrl = import.meta.env.VITE_BACKEND_URL

if (!rawBackendUrl) {
  throw new Error('VITE_BACKEND_URL is not set')
}

export const BACKEND_URL = rawBackendUrl.replace(/\/+$/, "")
