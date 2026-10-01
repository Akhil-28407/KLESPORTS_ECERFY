import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  headers: { 'Content-Type': 'application/json' },
})

export const backendBaseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace(/\/api$/, '')
export const clubLogoUrl = `${backendBaseUrl}/assets/kl%20esports%20logo.png`

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('adminToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export async function requestCertificate(participantId) {
  const { data } = await api.post('/certificates/request', { participantId })
  return data
}

export async function verifyCertificate(certificateId) {
  const { data } = await api.get(`/certificates/verify/${encodeURIComponent(certificateId)}`)
  return data
}

export async function loginAdmin(email, password) {
  const { data } = await api.post('/admin/login', { email, password })
  return data
}

export async function getStatistics() { const { data } = await api.get('/admin/statistics'); return data }
export async function getParticipants(params = {}) { const { data } = await api.get('/admin/participants', { params }); return data }
export async function createParticipant(participant) { const { data } = await api.post('/admin/participants', participant); return data }
export async function updateParticipant(id, participant) { const { data } = await api.put(`/admin/participants/${id}`, participant); return data }
export async function deleteParticipant(id) { const { data } = await api.delete(`/admin/participants/${id}`); return data }
export async function generateCertificate(id) { const { data } = await api.post(`/admin/participants/${id}/generate`); return data }
export async function getCertificates() { const { data } = await api.get('/admin/certificates'); return data }
export async function getBranding() { const { data } = await api.get('/admin/branding'); return data }
export async function updateBranding(formData) { const { data } = await api.put('/admin/branding', formData, { headers: { 'Content-Type': 'multipart/form-data' } }); return data }
export async function resetBrandingVisuals() { const { data } = await api.post('/admin/branding/reset-visuals'); return data }
export async function importParticipants(file) { const formData = new FormData(); formData.append('file', file); const { data } = await api.post('/admin/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } }); return data }

export function certificateDownloadUrl(certificateId) {
  const base = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'
  return `${base}/certificates/${encodeURIComponent(certificateId)}/download`
}
