import React, { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, CheckCircle, XCircle, User, Car, UserCheck, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';

export default function QRScan() {
  const [scanInput, setScanInput] = useState('');
  const [result, setResult] = useState(null);
  const [gate, setGate] = useState('Main Gate');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState({ type: 'Personnel', name: '', id: '' });
  const [generatedQR, setGeneratedQR] = useState('');

  const handleScan = async () => {
    if (!scanInput.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.post('/entries/scan', { qrData: scanInput, gate });
      setResult({ success: true, ...data });
      toast.success(data.message);
      setScanInput(''); // Clear for next scan
    } catch (err) {
      setResult({ success: false, message: err.response?.data?.message || 'Invalid QR Code data' });
      toast.error('Scan failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = () => {
    if (!generating.name || !generating.id) {
      toast.error('Please fill in all fields');
      return;
    }
    setGeneratedQR(JSON.stringify({ type: generating.type, id: generating.id, name: generating.name, generatedAt: new Date().toISOString() }));
    toast.success('QR Code generated');
  };

  const typeIcon = { Personnel: User, Vehicle: Car, Visitor: UserCheck };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">QR Code System</h1>
          <p className="page-subtitle">Generate and scan QR codes for personnel, vehicles, and visitors</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {/* QR Scanner */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.5rem' }}>
            <QrCode size={20} color="var(--accent-green)" />
            <h2 style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>QR Scanner</h2>
          </div>

          <div style={{ background: 'var(--bg-secondary)', border: '2px dashed var(--border)', borderRadius: 8, padding: '2rem', textAlign: 'center', marginBottom: '1rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, var(--accent-green), transparent)', animation: 'scanline 2s linear infinite' }} />
            <QrCode size={48} color="var(--border-light)" style={{ margin: '0 auto 1rem' }} />
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Paste QR data or scan with device camera</p>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, fontFamily: 'Share Tech Mono, monospace' }}>Camera integration requires HTTPS environment</p>
          </div>

          <div className="form-grid" style={{ marginBottom: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Active Gate</label>
              <select className="input" value={gate} onChange={e => setGate(e.target.value)}>
                <option>Main Gate</option>
                <option>North Post</option>
                <option>South Post</option>
                <option>VIP Entrance</option>
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">QR Code Data (JSON)</label>
            <textarea
              className="input mono"
              rows={4}
              value={scanInput}
              onChange={e => setScanInput(e.target.value)}
              placeholder={'{"type":"Personnel","id":"P20240001","name":"SGT. Mitchell"}'}
              style={{ fontSize: 12 }}
            />
          </div>

          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleScan} disabled={loading || !scanInput.trim()}>
            <QrCode size={14} /> {loading ? 'Processing...' : 'Process QR Code'}
          </button>

          {result && (
            <div className="animate-fadeIn" style={{
              marginTop: '1.5rem',
              padding: '1.5rem',
              borderRadius: 12,
              background: result.success ? 'rgba(30, 41, 59, 0.4)' : 'rgba(239, 68, 68, 0.05)',
              border: `2px solid ${result.success ? 'var(--accent-primary)' : 'var(--accent-red)'}`,
              boxShadow: result.success ? '0 0 30px rgba(59, 130, 246, 0.15)' : 'none'
            }}>
              {result.success ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ 
                    width: 150, height: 180, borderRadius: 12, margin: '0 auto 1.5rem',
                    background: '#fff', border: '3px solid var(--accent-primary)',
                    overflow: 'hidden', boxShadow: '0 10px 20px rgba(0,0,0,0.3)'
                  }}>
                    {result.photo ? (
                      <img src={result.photo} alt="Identity" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                        <User size={64} />
                      </div>
                    )}
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{result.subjectName}</div>
                    <div style={{ fontSize: 13, color: 'var(--accent-primary)', fontWeight: 700, marginTop: 4, fontFamily: 'Share Tech Mono, monospace' }}>ID: {result.log.subjectId}</div>
                  </div>

                  <div style={{ 
                    background: result.action === 'Entry' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(6, 182, 212, 0.1)',
                    border: `1px solid ${result.action === 'Entry' ? 'var(--accent-green)' : 'var(--accent-cyan)'}`,
                    padding: '1rem', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                    marginBottom: '1rem'
                  }}>
                    {result.action === 'Entry' ? <ArrowUpRight size={24} color="var(--accent-green)" /> : <ArrowDownLeft size={24} color="var(--accent-cyan)" />}
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Current Action</div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: result.action === 'Entry' ? 'var(--accent-green)' : 'var(--accent-cyan)' }}>
                        {result.action === 'Entry' ? 'ENTRY AUTHORIZED' : 'EXIT RECORDED'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: 6 }}>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700 }}>GATE</div>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>{result.log.gate}</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: 6 }}>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700 }}>TIMESTAMP</div>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>{new Date().toLocaleTimeString()}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '1rem' }}>
                  <XCircle size={48} color="var(--accent-red)" style={{ margin: '0 auto 1rem' }} />
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent-red)' }}>SCAN FAILED</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>{result.message}</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* QR Generator */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.5rem' }}>
            <QrCode size={20} color="var(--accent-gold)" />
            <h2 style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>QR Generator</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="input" value={generating.type} onChange={e => setGenerating(p => ({ ...p, type: e.target.value }))}>
                <option>Personnel</option><option>Vehicle</option><option>Visitor</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Name / Description *</label>
              <input className="input" value={generating.name} onChange={e => setGenerating(p => ({ ...p, name: e.target.value }))} placeholder="e.g. SGT. John Mitchell" />
            </div>
            <div className="form-group">
              <label className="form-label">ID / Plate Number *</label>
              <input className="input" value={generating.id} onChange={e => setGenerating(p => ({ ...p, id: e.target.value }))} placeholder="e.g. P20240001 or MIL-4472" />
            </div>
            <button className="btn btn-gold" style={{ justifyContent: 'center' }} onClick={handleGenerate}>
              Generate QR Code
            </button>
          </div>

          {generatedQR && (
            <div style={{ textAlign: 'center', animation: 'fadeIn 0.3s ease' }}>
              <div className="qr-download" style={{ background: 'white', padding: '1.5rem', borderRadius: 12, display: 'inline-block', marginBottom: '1rem', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
                <QRCodeSVG value={generatedQR} size={200} />
              </div>
              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 16 }}>{generating.name}</div>
              <div className="mono" style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{generating.id}</div>
              <span className="badge badge-green" style={{ marginTop: 8 }}>{generating.type}</span>
              <div style={{ marginTop: '1rem' }}>
                <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => {
                  const svg = document.querySelector('.qr-download svg');
                  if (svg) {
                    const svgData = new XMLSerializer().serializeToString(svg);
                    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
                    const svgUrl = URL.createObjectURL(svgBlob);
                    const downloadLink = document.createElement('a');
                    downloadLink.href = svgUrl;
                    downloadLink.download = `qr-${generating.id}.svg`;
                    document.body.appendChild(downloadLink);
                    downloadLink.click();
                    document.body.removeChild(downloadLink);
                    toast.success('QR Code download started');
                  } else {
                    toast.error('Failed to find QR code for download');
                  }
                }}>
                  Download QR Code
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3 style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 14, textTransform: 'uppercase', marginBottom: '1rem', color: 'var(--text-secondary)' }}>QR Code Usage Guide</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {[
            { icon: User, title: 'Personnel Pass', desc: 'Each registered personnel receives a unique QR code for quick gate verification' },
            { icon: Car, title: 'Vehicle Tag', desc: 'Vehicles are assigned QR tags for windshield display at entry/exit checkpoints' },
            { icon: UserCheck, title: 'Visitor Pass', desc: 'Temporary QR codes issued to approved visitors for their visit duration' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} style={{ display: 'flex', gap: 12, padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={18} color="var(--accent-green)" />
              </div>
              <div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', marginBottom: 4 }}>{title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
