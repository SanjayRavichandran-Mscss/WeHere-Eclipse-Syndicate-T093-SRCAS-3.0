import { io, Socket } from 'socket.io-client';

// Same host used across the app for the backend (see index.tsx / register.tsx)
export const SOCKET_URL = ' http://10.100.67.248:5000';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: true,
    });
  }
  return socket;
};