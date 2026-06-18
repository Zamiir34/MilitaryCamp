import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

let socket = null;

/**
 * Returns the shared socket instance, creating it if needed.
 * Automatically re-creates the socket if the token has changed
 * (e.g. after logout → login with a different account).
 */
export function getSocket() {
  const token = localStorage.getItem('token');

  // If the existing socket used a different token, tear it down first
  if (socket && socket._authToken !== token) {
    socket.disconnect();
    socket = null;
  }

  if (!socket) {
    socket = io(SOCKET_URL, {
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });
    // Tag the socket with the token it was created with
    socket._authToken = token;
  }

  return socket;
}

/**
 * Disconnects and destroys the socket.
 * Call this on logout so the next login gets a fresh, authenticated socket.
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
