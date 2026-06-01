import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
})

// Auto-attach token ke setiap request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers['Authorization'] = token
  }
  return config
})

// Handle 401 — hanya redirect ke login jika sedang di halaman admin
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isAdminPage = window.location.pathname.startsWith('/admin')
      if (isAdminPage) {
        localStorage.removeItem('token')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
