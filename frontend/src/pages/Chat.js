import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Send, MessageSquare, Search, Circle, ShieldAlert, Lock } from 'lucide-react';

const roleConfig = {
  Administrator: { color: 'var(--accent-red)', badge: 'badge-red', label: 'ADMIN' },
  SecurityOfficer: { color: 'var(--accent-gold)', badge: 'badge-gold', label: 'SEC OFFICER' },
  Guard: { color: 'var(--accent-green)', badge: 'badge-green', label: 'GUARD' },
};

function initials(name) {
  return (name || '').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}
function fmtTime(d) {
  return new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}
function fmtDate(d) {
  const date = new Date(d);
  const today = new Date();
  const yest = new Date(); yest.setDate(yest.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yest.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

let socketRef = null;

export default function Chat() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const selectedRef = useRef(null);

  useEffect(() => { selectedRef.current = selectedUser; }, [selectedUser]);

  // Try to connect socket.io if available
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    let sock = null;
    (async () => {
      try {
        const { io } = await import('socket.io-client');
        const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        sock = io(BASE, { auth: { token }, reconnectionAttempts: 5 });
        socketRef = sock;
        sock.on('connect', () => setConnected(true));
        sock.on('disconnect', () => setConnected(false));
        sock.on('connect_error', () => setConnected(false));
        sock.on('new_message', (msg) => {
          setMessages(prev => prev.some(m => m._id === msg._id) ? prev : [...prev, msg]);
          loadConversations();
          if (selectedRef.current?._id === (msg.sender?._id || msg.sender)) {
            api.put(`/chat/messages/${msg.sender?._id || msg.sender}/read`).catch(() => {});
          }
        });
        sock.on('message_sent', (msg) => {
          setMessages(prev => prev.some(m => m._id === msg._id) ? prev : [...prev, msg]);
        });
      } catch { setConnected(false); }
    })();
    return () => { sock?.disconnect(); socketRef = null; };
  }, []);

  const loadConversations = useCallback(async () => {
    try { const { data } = await api.get('/chat/conversations'); setConversations(data); } catch {}
  }, []);

  const loadUsers = useCallback(async () => {
    try { const { data } = await api.get('/chat/users'); setUsers(data); } catch {}
  }, []);

  useEffect(() => {
    loadUsers();
    loadConversations();
    const iv = setInterval(loadConversations, 12000);
    return () => clearInterval(iv);
  }, [loadUsers, loadConversations]);

  // Poll messages when no socket
  useEffect(() => {
    if (connected || !selectedUser) return;
    const iv = setInterval(async () => {
      try {
        const { data } = await api.get(`/chat/messages/${selectedUser._id}`);
        setMessages(data);
      } catch {}
    }, 5000);
    return () => clearInterval(iv);
  }, [connected, selectedUser]);

  const openConversation = useCallback(async (target) => {
    setSelectedUser(target);
    setLoading(true);
    try {
      const { data } = await api.get(`/chat/messages/${target._id}`);
      setMessages(data);
      await api.put(`/chat/messages/${target._id}/read`);
      setConversations(prev => prev.map(c => c.user._id === target._id ? { ...c, unread: 0 } : c));
    } catch { setMessages([]); }
    finally { setLoading(false); setTimeout(() => inputRef.current?.focus(), 100); }
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || !selectedUser || sending) return;
    const content = input.trim();
    setInput('');
    setSending(true);
    try {
      const { data } = await api.post('/chat/messages', { recipientId: selectedUser._id, content });
      if (!socketRef?.connected) {
        setMessages(prev => prev.some(m => m._id === data._id) ? prev : [...prev, data]);
      }
      loadConversations();
    } catch { setInput(content); }
    finally { setSending(false); inputRef.current?.focus(); }
  }, [input, selectedUser, sending, loadConversations]);

  const convIds = new Set(conversations.map(c => c.user._id));
  const extras = users.filter(u => !convIds.has(u._id));
  const filtConvs = conversations.filter(c =>
    c.user.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    c.user.role?.toLowerCase().includes(search.toLowerCase())
  );
  const filtExtras = extras.filter(u =>
    u.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    u.role?.toLowerCase().includes(search.toLowerCase())
  );

  // Group messages by date
  const grouped = [];
  let lastDate = null;
  for (const m of messages) {
    const ds = fmtDate(m.createdAt);
    if (ds !== lastDate) { grouped.push({ type: 'date', label: ds }); lastDate = ds; }
    grouped.push({ type: 'msg', data: m });
  }

  const UserRow = ({ u, conv }) => {
    const rc = roleConfig[u.role] || roleConfig.Guard;
    const isSel = selectedUser?._id === u._id;
    const unread = conv?.unread || 0;
    const lastMsg = conv?.lastMessage;
    const isMe = lastMsg && (lastMsg.sender?._id === user?._id || lastMsg.sender === user?._id);
    return (
      <button onClick={() => openConversation(u)} style={{
        display: 'flex', alignItems: 'center', gap: 10, width: '100%',
        padding: '10px 14px', background: isSel ? 'rgba(37,99,235,0.08)' : 'transparent',
        borderLeft: `3px solid ${isSel ? 'var(--accent-secondary)' : 'transparent'}`,
        border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
          background: rc.color + '18', border: `2px solid ${rc.color}50`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Rajdhani, sans-serif', fontWeight: 800, fontSize: 14, color: rc.color,
        }}>{initials(u.fullName)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Rajdhani, sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 130 }}>{u.fullName}</span>
            {lastMsg && <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>{fmtTime(lastMsg.createdAt)}</span>}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
            {lastMsg
              ? <span style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>{isMe ? '✓ ' : ''}{lastMsg.content}</span>
              : <span className={`badge ${rc.badge}`} style={{ fontSize: 9, padding: '1px 6px' }}>{rc.label}</span>
            }
            {unread > 0 && (
              <span style={{ background: 'var(--accent-secondary)', color: '#fff', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, flexShrink: 0 }}>
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px - 3rem)', gap: 0, animation: 'fadeIn 0.3s ease', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>

      {/* LEFT SIDEBAR */}
      <div style={{ width: 290, flexShrink: 0, background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '1rem 1rem 0.75rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <ShieldAlert size={17} color="var(--accent-secondary)" />
            <span style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 800, fontSize: 17, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-primary)' }}>Comms</span>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: connected ? 'var(--accent-green)' : 'var(--text-muted)', fontFamily: 'Share Tech Mono, monospace' }}>
              <Circle size={6} fill={connected ? 'var(--accent-green)' : '#94a3b8'} />
              {connected ? 'LIVE' : 'POLLING'}
            </div>
          </div>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="input" placeholder="Search personnel..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 30, fontSize: 13, padding: '8px 10px 8px 30px' }} />
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtConvs.length === 0 && filtExtras.length === 0 && (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No personnel found</div>
          )}
          {filtConvs.length > 0 && (
            <>
              <div style={{ padding: '8px 14px 4px', fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'Share Tech Mono, monospace' }}>Recent</div>
              {filtConvs.map(c => <UserRow key={c.user._id} u={c.user} conv={c} />)}
            </>
          )}
          {filtExtras.length > 0 && (
            <>
              <div style={{ padding: '8px 14px 4px', fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'Share Tech Mono, monospace' }}>All Personnel</div>
              {filtExtras.map(u => <UserRow key={u._id} u={u} conv={null} />)}
            </>
          )}
        </div>
      </div>

      {/* RIGHT CHAT AREA */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', minWidth: 0 }}>
        {!selectedUser ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, color: 'var(--text-muted)' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--bg-elevated)', border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageSquare size={30} color="var(--border-light)" />
            </div>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 20, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Select a Contact</div>
            <div style={{ fontSize: 13, maxWidth: 260, textAlign: 'center', lineHeight: 1.6 }}>Choose a security officer or guard from the list to begin a secure conversation.</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--accent-green)', fontFamily: 'Share Tech Mono, monospace', marginTop: 4 }}>
              <Lock size={12} /> END-TO-END SECURE CHANNEL
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', gap: 12 }}>
              {(() => {
                const rc = roleConfig[selectedUser.role] || roleConfig.Guard;
                return (
                  <>
                    <div style={{ width: 42, height: 42, borderRadius: '50%', flexShrink: 0, background: rc.color + '18', border: `2px solid ${rc.color}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Rajdhani, sans-serif', fontWeight: 800, fontSize: 15, color: rc.color }}>
                      {initials(selectedUser.fullName)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 800, fontSize: 17, color: 'var(--text-primary)', letterSpacing: '0.03em' }}>{selectedUser.fullName}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                        <span className={`badge ${rc.badge}`} style={{ fontSize: 10, padding: '1px 8px' }}>{rc.label}</span>
                        {selectedUser.rank && <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'Share Tech Mono, monospace' }}>{selectedUser.rank}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--accent-green)', fontFamily: 'Share Tech Mono, monospace' }}>
                      <Lock size={11} /> SECURE
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {loading
                ? <div className="loading">LOADING MESSAGES...</div>
                : messages.length === 0
                  ? <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12, fontFamily: 'Share Tech Mono, monospace' }}>— No messages yet. Begin the conversation. —</div>
                  : grouped.map((item, idx) => {
                    if (item.type === 'date') return (
                      <div key={`d-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '12px 0 8px' }}>
                        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'Share Tech Mono, monospace', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{item.label}</span>
                        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                      </div>
                    );
                    const msg = item.data;
                    const isMine = (msg.sender?._id || msg.sender) === user?._id;
                    const rc = roleConfig[msg.sender?.role] || roleConfig.Guard;
                    return (
                      <div key={msg._id || idx} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', marginBottom: 6, animation: 'fadeIn 0.2s ease' }}>
                        {!isMine && (
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: rc.color + '18', border: `1px solid ${rc.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Rajdhani, sans-serif', fontWeight: 800, fontSize: 10, color: rc.color, flexShrink: 0, marginRight: 8, alignSelf: 'flex-end', marginBottom: 16 }}>
                            {initials(msg.sender?.fullName)}
                          </div>
                        )}
                        <div style={{ maxWidth: '65%' }}>
                          {!isMine && <div style={{ fontSize: 10, color: rc.color, fontFamily: 'Share Tech Mono, monospace', letterSpacing: '0.05em', marginBottom: 3, marginLeft: 2 }}>{msg.sender?.fullName?.split(' ')[0]?.toUpperCase()}</div>}
                          <div style={{
                            padding: '9px 14px',
                            borderRadius: isMine ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
                            background: isMine ? 'var(--accent-secondary)' : 'var(--bg-secondary)',
                            border: isMine ? 'none' : '1px solid var(--border)',
                            color: isMine ? '#ffffff' : 'var(--text-primary)',
                            fontSize: 14, lineHeight: 1.5,
                            boxShadow: isMine ? '0 2px 8px rgba(37,99,235,0.25)' : '0 1px 3px rgba(0,0,0,0.06)',
                            wordBreak: 'break-word',
                          }}>{msg.content}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'Share Tech Mono, monospace', textAlign: isMine ? 'right' : 'left', marginTop: 3, paddingRight: isMine ? 4 : 0, paddingLeft: isMine ? 0 : 4 }}>
                            {fmtTime(msg.createdAt)}{isMine && <span style={{ marginLeft: 4 }}>{msg.read ? '✓✓' : '✓'}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })
              }
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{ padding: '0.85rem 1.25rem', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'flex-end', gap: 10 }}>
              <textarea
                ref={inputRef}
                className="input"
                placeholder="Type a secure message… (Enter to send)"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                rows={1}
                style={{ flex: 1, resize: 'none', minHeight: 44, maxHeight: 120, lineHeight: 1.5, fontSize: 14, padding: '10px 14px', fontFamily: 'Exo 2, sans-serif' }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || sending}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 44, height: 44, borderRadius: 10, flexShrink: 0, border: 'none', cursor: 'pointer',
                  background: input.trim() ? 'var(--accent-secondary)' : 'var(--bg-elevated)',
                  color: input.trim() ? '#fff' : 'var(--text-muted)',
                  transition: 'all 0.2s',
                  boxShadow: input.trim() ? '0 2px 8px rgba(37,99,235,0.3)' : 'none',
                }}
              >
                {sending ? <div className="spinner-small" style={{ borderTopColor: '#fff' }} /> : <Send size={16} />}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
