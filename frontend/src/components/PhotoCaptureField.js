import React, { useEffect, useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PhotoCaptureField({
  photo,
  onPhotoChange,
  label,
  hint,
  emptyLabel = 'NO PHOTO',
  cameraFacing = 'user',
}) {
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
  };

  const closeCamera = () => {
    stopCamera();
    setShowCamera(false);
  };

  const openCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error('Camera is not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: cameraFacing },
        audio: false,
      });
      streamRef.current = stream;
      setShowCamera(true);
    } catch {
      toast.error('Could not access camera. Check permissions and try again.');
    }
  };

  useEffect(() => {
    if (!showCamera || !videoRef.current || !streamRef.current) return;
    videoRef.current.srcObject = streamRef.current;
    videoRef.current.play().catch(() => {});
  }, [showCamera]);

  useEffect(() => () => stopCamera(), []);

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video?.videoWidth) {
      toast.error('Camera is not ready yet.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    onPhotoChange(canvas.toDataURL('image/jpeg', 0.85));
    closeCamera();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Fadlan kaliya sawir geli (Please upload an image file only)');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => onPhotoChange(reader.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <>
      <div className="form-group" style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
        <label className="form-label">{label}</label>
        <div className="photo-capture-row">
          <div style={{
            width: 110, height: 140, borderRadius: 10, background: 'var(--bg-secondary)',
            border: `2px solid ${photo ? 'var(--accent-green)' : 'var(--accent-primary)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0,
          }}>
            {photo
              ? <img src={photo} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Camera size={36} />
                  <div style={{ fontSize: 10, marginTop: 6, fontWeight: 700, letterSpacing: '0.05em' }}>{emptyLabel}</div>
                </div>
              )}
          </div>
          <div className="photo-capture-controls">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="photo-capture-actions">
                <button type="button" className="btn btn-primary" style={{ fontSize: 13 }} onClick={openCamera}>
                  <Camera size={14} /> Open Camera
                </button>
                <button type="button" className="btn btn-ghost" style={{ fontSize: 13 }} onClick={() => fileInputRef.current?.click()}>
                  Upload Photo
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </div>
              {photo && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ fontSize: 12, alignSelf: 'flex-start', color: 'var(--accent-red)' }}
                  onClick={() => onPhotoChange('')}
                >
                  Remove Photo
                </button>
              )}
              {hint && <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>{hint}</p>}
            </div>
          </div>
        </div>
      </div>

      {showCamera && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 520 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 18, textTransform: 'uppercase', margin: 0 }}>
                Open Camera
              </h2>
              <button type="button" className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={closeCamera}>
                <X size={16} />
              </button>
            </div>
            <div style={{
              borderRadius: 12, overflow: 'hidden', background: '#000',
              border: '1px solid var(--border)', marginBottom: '1rem',
            }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', display: 'block', maxHeight: 360, objectFit: 'cover' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost" onClick={closeCamera}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={capturePhoto}>Capture Photo</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
