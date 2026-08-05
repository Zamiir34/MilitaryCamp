import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Shield, CheckCircle, XCircle, Clock, User, Award, Home,
  Building2, Car, Phone, Mail, IdCard, Flag
} from 'lucide-react';
import api from '../utils/api';
import { format } from 'date-fns';

function InfoRow({ icon: Icon, label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>
        {Icon && <Icon size={10} />} {label}
      </label>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', wordBreak: 'break-word' }}>{value}</div>
    </div>
  );
}

export default function Verify() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const statusColor = (s) => {
    if (!s) return '#64748b';
    const sl = String(s).toLowerCase();
    if (sl === 'active' || sl === 'approved') return '#22c55e';
    if (sl === 'denied' || sl === 'suspended' || sl === 'blacklisted') return '#ef4444';
    if (sl === 'pending') return '#f59e0b';
    if (sl === 'completed' || sl === 'inactive') return '#64748b';
    return '#64748b';
  };

  useEffect(() => {
    const fetchIdentity = async () => {
      try {
        const { data: result } = await api.get(`/public/verify/${id}`);
        setData(result);
      } catch (err) {
        setError(err.response?.data?.message || 'Verification Failed');
      } finally {
        setLoading(false);
      }
    };
    fetchIdentity();
  }, [id]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', fontFamily: 'Rajdhani, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <Shield size={48} className="animate-pulse" style={{ color: 'var(--accent-primary)', marginBottom: '1rem' }} />
          <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '0.1em' }}>VERIFYING IDENTITY...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', padding: '2rem', textAlign: 'center', fontFamily: 'Rajdhani, sans-serif' }}>
        <div className="card" style={{ maxWidth: 400, border: '2px solid var(--accent-red)', background: 'rgba(239, 68, 68, 0.05)' }}>
          <XCircle size={64} color="var(--accent-red)" style={{ margin: '0 auto 1.5rem' }} />
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: '1rem' }}>UNAUTHORIZED</h1>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{error}</p>
          <div style={{ marginTop: '2rem', fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
            SEC_AUTH_ERR_{Date.now().toString(36).toUpperCase()}
          </div>
        </div>
      </div>
    );
  }

  const titleByType = {
    Personnel: 'PERSONNEL IDENTITY',
    Visitor: 'VISITOR PASS',
    Vehicle: 'VEHICLE RECORD',
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', fontFamily: 'Rajdhani, sans-serif' }}>
      <div className="card" style={{ maxWidth: 560, width: '100%', padding: 0, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1)' }}>
        <div style={{ background: 'var(--bg-primary)', padding: '1.5rem', borderBottom: '2px solid var(--accent-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--accent-primary)', fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Military Camp System</div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '0.05em', color: 'var(--text-primary)' }}>
              {titleByType[data.type] || 'IDENTITY VERIFIED'}
            </div>
          </div>
          <CheckCircle size={32} color="var(--accent-green)" />
        </div>

        <div style={{ padding: '2rem', background: 'var(--bg-primary)' }}>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <div style={{ position: 'relative' }}>
              <div style={{ width: 160, height: 200, borderRadius: 12, background: 'var(--bg-secondary)', border: '3px solid var(--accent-primary)', overflow: 'hidden', boxShadow: '0 0 20px rgba(37, 99, 235, 0.1)' }}>
                {data.photo
                  ? <img src={data.photo} alt="Identity" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                      {data.type === 'Vehicle' ? <Car size={64} /> : <User size={64} />}
                    </div>
                  )}
              </div>
              <div style={{ position: 'absolute', bottom: -10, left: '50%', transform: 'translateX(-50%)' }}>
                <span style={{
                  background: statusColor(data.status), color: '#fff', padding: '4px 12px', borderRadius: 20,
                  fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', boxShadow: '0 4px 6px rgba(0,0,0,0.15)', whiteSpace: 'nowrap',
                }}>
                  {(data.status || 'UNKNOWN').toUpperCase()}
                </span>
              </div>
            </div>

            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>
                  {data.type === 'Vehicle' ? 'Plate Number' : 'Full Name'}
                </label>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>{data.fullName}</div>
              </div>

              {data.type === 'Personnel' && (
                <div className="grid-2-mobile" style={{ marginBottom: '1rem' }}>
                  <InfoRow icon={Award} label="Rank" value={data.rank || 'N/A'} />
                  <InfoRow icon={Home} label="Unit" value={data.unit || 'N/A'} />
                  <InfoRow icon={IdCard} label="Military ID" value={data.militaryId || 'N/A'} />
                  <InfoRow icon={Shield} label="Category" value={data.type} />
                  <InfoRow icon={Phone} label="Phone" value={data.phone} />
                  <InfoRow icon={Flag} label="Zones" value={(data.authorizedZones || []).join(', ')} />
                  {data.hasVehicle && (
                    <InfoRow icon={Car} label="Vehicle" value={[data.vehiclePlate, data.vehicleModel].filter(Boolean).join(' · ')} />
                  )}
                </div>
              )}

              {data.type === 'Visitor' && (
                <div className="grid-2-mobile" style={{ marginBottom: '1rem' }}>
                  <InfoRow icon={Shield} label="Visitor Type" value={data.visitorType} />
                  <InfoRow icon={IdCard} label="ID Number" value={data.idNumber} />
                  <InfoRow icon={Building2} label="Organization" value={data.organization} />
                  <InfoRow icon={User} label="Host Officer" value={data.hostName} />
                  <InfoRow icon={Flag} label="Purpose" value={data.purposeOfVisit} />
                  <InfoRow icon={Clock} label="Visit Date" value={data.visitDate ? format(new Date(data.visitDate), 'yyyy-MM-dd HH:mm') : ''} />
                  <InfoRow icon={Phone} label="Phone" value={data.phone} />
                  <InfoRow icon={Mail} label="Email" value={data.email} />
                  {data.hasVehicle && (
                    <InfoRow icon={Car} label="Vehicle" value={[data.vehiclePlate, data.vehicleModel, data.vehicleColor].filter(Boolean).join(' · ')} />
                  )}
                </div>
              )}

              {data.type === 'Vehicle' && (
                <div className="grid-2-mobile" style={{ marginBottom: '1rem' }}>
                  <InfoRow icon={Car} label="Type" value={data.vehicleType} />
                  <InfoRow icon={Flag} label="Category" value={data.category} />
                  <InfoRow icon={Home} label="Make / Model" value={[data.make, data.model].filter(Boolean).join(' ') || 'N/A'} />
                  <InfoRow icon={Award} label="Color" value={data.color} />
                  <InfoRow icon={User} label="Owner" value={data.ownerName} />
                  <InfoRow icon={Phone} label="Owner Phone" value={data.ownerPhone} />
                  <InfoRow icon={Shield} label="Authorized" value={data.isAuthorized ? 'YES' : 'NO'} />
                </div>
              )}

              <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 4 }}>SECURE IDENTIFIER</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent-primary)', fontFamily: 'monospace', letterSpacing: '0.1em' }}>{data.id}</div>
                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                  Verified at {new Date(data.verifiedAt).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--bg-secondary)', padding: '1rem', textAlign: 'center', fontSize: 10, color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
          Official verification page. Scan the QR code to view this identity record.
          <br />© 2026 MILITARY COMMAND — ALL RIGHTS RESERVED
        </div>
      </div>
    </div>
  );
}
