import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

// Singleton socket — shared across all components
let sharedSocket = null;
let listenerCount = 0;

function getSocket() {
  if (!sharedSocket) {
    const url = typeof window !== 'undefined' && import.meta.env.PROD ? undefined : 'http://localhost:3001';
    sharedSocket = io(url, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
    });
  }
  return sharedSocket;
}

export function useSocket() {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;
    listenerCount++;

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // Set initial state
    if (socket.connected) setConnected(true);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      listenerCount--;
      // Don't disconnect — keep the socket alive
    };
  }, []);

  const emit = useCallback((event, data) => {
    socketRef.current?.emit(event, data);
  }, []);

  const on = useCallback((event, handler) => {
    socketRef.current?.on(event, handler);
    return () => socketRef.current?.off(event, handler);
  }, []);

  return { socket: socketRef.current, connected, emit, on };
}
