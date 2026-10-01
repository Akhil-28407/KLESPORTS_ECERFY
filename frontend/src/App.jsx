import { useState } from 'react'
import { ArrowRight, Check, Download, FileBadge, Gamepad2, LockKeyhole, QrCode, ShieldCheck } from 'lucide-react'
import { Link, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { certificateDownloadUrl, loginAdmin, requestCertificate, verifyCertificate } from './services/api'
import AdminPanel from './components/AdminPanel'
import './App.css'


function Header() {
  return <header className="site-header"><Link className="brand" to="/"><span className="brand-mark">K</span><span><strong>KL ESPORTS</strong><small>CERTIFICATE PORTAL</small></span></Link><nav><Link to="/verify">Verify a certificate</Link><Link className="admin-link" to="/admin/login">Admin access <ArrowRight size={15} /></Link></nav></header>
}

function Home() {
  const [participantId, setParticipantId] = useState('')
  const [status, setStatus] = useState({ type: '', message: '' })
  const [certificate, setCertificate] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    setStatus({ type: 'loading', message: 'Verifying participant...' })
    setCertificate(null)
    try {
      const data = await requestCertificate(participantId)
      setCertificate(data)
      setStatus({ type: 'success', message: 'Certificate ready to download.' })
    } catch (error) {
      setStatus({ type: 'error', message: error.response?.data?.message || 'The certificate service is unavailable. Check your ID and try again.' })
    }
  }

  return <><Header /><main><section className="hero-section"><div className="hero-copy"><p className="eyebrow"><span className="live-dot" /> OFFICIAL CLUB RECORDS / 2026</p><h1>Your moment.<br /><em>Made official.</em></h1><p className="hero-description">Download your verified esports certificate from the KL Esports Club archive. Every award is backed by an official participant record.</p><form className="certificate-form" onSubmit={handleSubmit}><label htmlFor="participant-id">Participant or university ID</label><div className="input-row"><input id="participant-id" value={participantId} onChange={(event) => setParticipantId(event.target.value)} placeholder="e.g. KL2026CS1234" required minLength="3" /><button type="submit" disabled={status.type === 'loading'}>{status.type === 'loading' ? 'Checking...' : 'Find my certificate'}<ArrowRight size={18} /></button></div>{status.message && <p className={`form-status ${status.type}`} role="status">{status.type === 'success' && <Check size={15} />}{status.message}</p>}</form>{certificate && <div className="download-result"><div><span className="result-kicker">CERTIFICATE FOUND</span><strong>{certificate.certificate?.participantName}</strong><span>{certificate.certificate?.eventName} / {certificate.certificate?.result?.replace('_', ' ')}</span></div><a href={certificateDownloadUrl(certificate.certificateId)}><Download size={17} /> Download PDF</a></div>}</div><div className="hero-art" aria-label="Esports certificate archive visual"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="hero-card"><div className="card-top"><span>KL / 26</span><QrCode size={23} /></div><div className="card-seal"><FileBadge size={46} /><span>OFFICIAL<br />RECORD</span></div><p>CERTIFICATE<br /><b>OF ACHIEVEMENT</b></p><div className="card-line" /><small>VERIFIED PARTICIPANT</small></div><div className="art-caption">ARCHIVE<br /><span>01—06</span></div></div></section><section className="trust-strip"><div><LockKeyhole size={18} /><span><b>Private by design</b> Eligibility is checked server-side</span></div><div><ShieldCheck size={18} /><span><b>Instant verification</b> Every certificate has a unique ID</span></div><div><Gamepad2 size={18} /><span><b>Built for competition</b> Participation, winner & runner-up awards</span></div></section><section className="lower-section"><div><p className="eyebrow">ALREADY HAVE YOUR CERTIFICATE?</p><h2>Trust, but verify.</h2></div><Link className="outline-button" to="/verify">Open certificate verifier <ArrowRight size={17} /></Link></section></main><footer><span>© 2026 KL Esports Club</span><span>Official digital records for tournament participants</span></footer></>
}

function Verify() {
  const { certificateId: routeId } = useParams()
  const [certificateId, setCertificateId] = useState(routeId || '')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  async function handleVerify(event) { event.preventDefault(); setError(''); setResult(null); try { const data = await verifyCertificate(certificateId); setResult(data.certificate) } catch (requestError) { setError(requestError.response?.data?.message || 'This certificate could not be verified.') } }
  return <><Header /><main className="verify-page"><div className="verify-panel"><p className="eyebrow">PUBLIC RECORD CHECK</p><h1>Verify a certificate</h1><p>Enter the unique certificate ID to confirm that an award was issued by KL Esports Club.</p><form className="verify-form" onSubmit={handleVerify}><label htmlFor="certificate-id">Certificate ID</label><div className="input-row"><input id="certificate-id" value={certificateId} onChange={(event) => setCertificateId(event.target.value)} placeholder="ESPORTS-2026-BGMI-000123" required /><button type="submit">Verify <ShieldCheck size={17} /></button></div></form>{error && <p className="form-status error">{error}</p>}{result && <div className="verified-card"><div className="verified-heading"><span><Check size={19} /></span><div><strong>Certificate verified</strong><small>Issued by KL Esports Club</small></div></div><dl><div><dt>Participant</dt><dd>{result.participantName}</dd></div><div><dt>Event</dt><dd>{result.eventName}</dd></div><div><dt>Achievement</dt><dd>{result.achievement.replace('_', ' ')}</dd></div><div><dt>Certificate ID</dt><dd>{result.certificateId}</dd></div></dl></div>}</div></main></>
}

function AdminLogin() { const navigate = useNavigate(); const [message, setMessage] = useState(''); async function submit(event) { event.preventDefault(); const form = new FormData(event.currentTarget); try { const data = await loginAdmin(form.get('email'), form.get('password')); sessionStorage.setItem('adminToken', data.token); setMessage('Signed in. Opening console...'); setTimeout(() => navigate('/admin/dashboard'), 500) } catch (error) { setMessage(error.response?.data?.message || 'Unable to sign in.') } } return <><Header /><main className="verify-page"><div className="verify-panel admin-panel"><p className="eyebrow">RESTRICTED CONSOLE</p><h1>Admin access</h1><p>Manage participant eligibility and certificate records.</p><form className="admin-form" onSubmit={submit}><label>Email<input name="email" type="email" placeholder="admin@club.example" required /></label><label>Password<input name="password" type="password" placeholder="••••••••" required /></label><button type="submit">Sign in <ArrowRight size={17} /></button></form>{message && <p className="form-status success">{message}</p>}</div></main></> }

export default function App() { return <Routes><Route path="/" element={<Home />} /><Route path="/verify" element={<Verify />} /><Route path="/verify/:certificateId" element={<Verify />} /><Route path="/admin/login" element={<AdminLogin />} /><Route path="/admin/dashboard" element={<AdminPanel />} /></Routes> }
