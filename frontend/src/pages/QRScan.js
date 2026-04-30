import React, { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, CheckCircle, XCircle, User, Car, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export default function QRScan() {
  const [scanInput, setScanInput] = useState('');
  const [result, setResult] = useState(null);
  const [generating, setGenerating] = useState({ type: 'Personnel', name: '', id: '' });
  const [generatedQR, setGeneratedQR] = useState('');

  const handleScan = () => {
    if (!scanInput.trim()) return;
    try {
      const parsed = JSON.parse(scanInput);
      setResult({ success: true, data: parsed });
      toast.success('QR Code scanned successfully');
    } catch {
      setResult({ success: false, message: 'Invalid QR Code data' });
      toast.error('Invalid QR Code');
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
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

          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleScan}>
            <QrCode size={14} /> Process QR Code
          </button>

          {result && (
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              borderRadius: 8,
              background: result.success ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
              border: `1px solid ${result.success ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: result.success ? 8 : 0 }}>
                {result.success
                  ? <CheckCircle size={16} color="var(--accent-green)" />
                  : <XCircle size={16} color="var(--accent-red)" />
                }
                <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'Rajdhani, sans-serif', color: result.success ? 'var(--accent-green)' : 'var(--accent-red)', textTransform: 'uppercase' }}>
                  {result.success ? 'Scan Successful' : 'Scan Failed'}
                </span>
              </div>
              {result.success && result.data && (
                <div style={{ paddingLeft: 24 }}>
                  {Object.entries(result.data).map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', gap: 8, fontSize: 12, marginTop: 4 }}>
                      <span style={{ color: 'var(--text-muted)', fontFamily: 'Share Tech Mono, monospace', minWidth: 100 }}>{k}:</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{String(v)}</span>
                    </div>
                  ))}
                </div>
              )}
              {!result.success && <p style={{ fontSize: 12, color: 'var(--accent-red)', marginTop: 4 }}>{result.message}</p>}
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
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: 12, display: 'inline-block', marginBottom: '1rem', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
                <QRCodeSVG value={generatedQR} size={200} />
              </div>
              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 16 }}>{generating.name}</div>
              <div className="mono" style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{generating.id}</div>
              <span className="badge badge-green" style={{ marginTop: 8 }}>{generating.type}</span>
              <div style={{ marginTop: '1rem' }}>
                <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => {
                  const svg = document.querySelector('.qr-download svg');
                  if (svg) {
                    const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `qr-${generating.id}.svg`;
                    a.click();
                  }
                  toast.success('Right-click the QR image and save to download');
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
