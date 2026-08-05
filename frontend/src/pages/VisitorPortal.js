import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { User, QrCode, Shield, CheckCircle, Mail, KeyRound, Download, LogOut, Loader, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { downloadQrAsPng } from '../utils/downloadQr';

export default function VisitorPortal() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: Dashboard
  const [loading, setLoading] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [visitorData, setVisitorData] = useState(null);
  
  const otpRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

  // Check if already logged in as visitor
  useEffect(() => {
    const token = localStorage.getItem('visitor_token');
    if (token) {
      fetchVisitorMe(token);
    }
  }, []);

  const fetchVisitorMe = async (token) => {
    try {
      setLoading(true);
      const { data } = await api.get('/public/visitor-auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setVisitorData(data);
      setStep(3);
    } catch (err) {
      localStorage.removeItem('visitor_token');
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    try {
      setLoading(true);
      const { data } = await api.post('/public/visitor-auth/request-otp', { email: email.trim() });
      setMaskedEmail(data.emailMasked || email);
      toast.success(data.message);
      setStep(2);
      setTimeout(() => otpRefs[0].current?.focus(), 100);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to request OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const code = otp.join('');
    if (code.length !== 6) return;
    try {
      setLoading(true);
      const { data } = await api.post('/public/visitor-auth/verify-otp', { email: email.trim(), code });
      localStorage.setItem('visitor_token', data.token);
      setVisitorData(data.visitor);
      toast.success('Login successful');
      setStep(3);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP');
      setOtp(['', '', '', '', '', '']);
      otpRefs[0].current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^[0-9]*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) otpRefs[index + 1].current?.focus();
    if (newOtp.join('').length === 6) {
      // Auto-submit requires a slight delay to allow state update
      setTimeout(() => {
        const currentCode = newOtp.join('');
        if (currentCode.length === 6) handleVerifyOtpInternal(currentCode);
      }, 50);
    }
  };

  const handleVerifyOtpInternal = async (code) => {
    try {
      setLoading(true);
      const { data } = await api.post('/public/visitor-auth/verify-otp', { email: email.trim(), code });
      localStorage.setItem('visitor_token', data.token);
      setVisitorData(data.visitor);
      toast.success('Login successful');
      setStep(3);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP');
      setOtp(['', '', '', '', '', '']);
      otpRefs[0].current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs[index - 1].current?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData) {
      const newOtp = [...otp];
      for (let i = 0; i < pastedData.length; i++) newOtp[i] = pastedData[i];
      setOtp(newOtp);
      if (pastedData.length === 6) setTimeout(() => handleVerifyOtpInternal(pastedData), 50);
      else otpRefs[pastedData.length].current?.focus();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('visitor_token');
    setVisitorData(null);
    setOtp(['', '', '', '', '', '']);
    setEmail('');
    setStep(1);
  };

  const verifyUrl = visitorData ? `${window.location.origin}/verify/${visitorData.visitorId}` : '';

  const downloadQR = () => {
    if (!visitorData?.visitorId) return;
    const ok = downloadQrAsPng('.qr-download', `VisitorQR_${visitorData.visitorId}.png`, 512);
    if (ok) toast.success('QR image downloaded');
    else toast.error('Could not download QR image');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', fontFamily: 'Rajdhani, sans-serif' }}>
      <div className="card animate-fadeIn" style={{ maxWidth: 450, width: '100%', padding: '2.5rem', border: '1px solid var(--border)', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
        
        {step === 1 && (
          <div className="animate-fadeIn">
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(34, 197, 94, 0.1)', border: '2px solid var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <Shield size={32} color="var(--accent-green)" />
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Visitor Portal</h1>
              <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>Access your approved visit details and QR pass</p>
            </div>

            <form onSubmit={handleRequestOtp}>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Mail size={14} /> Email Address</label>
                <input
                  type="email"
                  className="input"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Enter your registered email"
                  required
                  disabled={loading}
                  style={{ padding: '1rem', fontSize: 16 }}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '1rem', justifyContent: 'center', fontSize: 16, marginTop: '1rem' }} disabled={loading}>
                {loading ? <Loader className="animate-spin" size={20} /> : 'Request Access Code'}
              </button>
            </form>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fadeIn">
            <button onClick={() => setStep(1)} className="btn btn-ghost" style={{ padding: 0, marginBottom: '1.5rem', color: 'var(--text-muted)' }}>
              <ArrowLeft size={16} style={{ marginRight: 6 }} /> Back
            </button>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(56, 189, 248, 0.1)', border: '2px solid var(--accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <KeyRound size={32} color="var(--accent-cyan)" />
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Enter Access Code</h2>
              <p style={{ color: 'var(--text-muted)', marginTop: 4, fontSize: 13 }}>
                We've sent a 6-digit code to <strong style={{ color: 'var(--text-primary)' }}>{maskedEmail}</strong>
              </p>
            </div>

            <div className="otp-row" style={{ marginBottom: '2rem' }}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={otpRefs[i]}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  onPaste={handlePaste}
                  disabled={loading}
                  className="otp-digit"
                  style={{
                    fontWeight: 800,
                    background: 'var(--bg-primary)',
                    borderColor: digit ? 'var(--accent-cyan)' : undefined,
                  }}
                />
              ))}
            </div>

            <button onClick={handleVerifyOtp} className="btn btn-primary" style={{ width: '100%', padding: '1rem', justifyContent: 'center', fontSize: 16, background: 'var(--accent-cyan)' }} disabled={loading || otp.join('').length !== 6}>
              {loading ? <Loader className="animate-spin" size={20} /> : 'Verify & Access Portal'}
            </button>
            
            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <button onClick={handleRequestOtp} className="btn btn-ghost" style={{ fontSize: 13 }} disabled={loading}>
                Didn't receive the code? Resend
              </button>
            </div>
          </div>
        )}

        {step === 3 && visitorData && (
          <div className="animate-fadeIn">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle size={20} color="var(--accent-green)" />
                <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--accent-green)', letterSpacing: '0.05em' }}>APPROVED VISIT</span>
              </div>
              <button onClick={handleLogout} className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 12, color: 'var(--accent-red)' }}>
                <LogOut size={14} style={{ marginRight: 6 }} /> Logout
              </button>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: 24, fontWeight: 800 }}>{visitorData.fullName}</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{visitorData.visitorType.toUpperCase()} VISITOR • ID: {visitorData.visitorId}</p>
            </div>

            {visitorData.visitorId ? (
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <div className="qr-download" style={{ background: '#fff', padding: '1rem', borderRadius: 16, display: 'inline-block' }}>
                  <QRCodeSVG value={verifyUrl} size={220} includeMargin />
                </div>
                <div style={{ marginTop: '1.5rem' }}>
                  <button onClick={downloadQR} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '1rem', fontSize: 15 }}>
                    <Download size={18} style={{ marginRight: 8 }} /> Download QR Image
                  </button>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: '1rem' }}>
                  Downloads a PNG image of the QR code only.
                </p>
              </div>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--bg-primary)', borderRadius: 12, border: '1px dashed var(--border)' }}>
                <QrCode size={40} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
                <p>QR Code not generated yet.</p>
              </div>
            )}

            <div style={{ background: 'var(--bg-primary)', padding: '1.25rem', borderRadius: 12, border: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '1rem' }}>Visit Details</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: 13 }}>
                <div>
                  <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>Date</div>
                  <div style={{ fontWeight: 600 }}>{new Date(visitorData.visitDate).toLocaleDateString()}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>Host</div>
                  <div style={{ fontWeight: 600 }}>{visitorData.hostName || 'N/A'}</div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>Purpose</div>
                  <div style={{ fontWeight: 600 }}>{visitorData.purposeOfVisit}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
