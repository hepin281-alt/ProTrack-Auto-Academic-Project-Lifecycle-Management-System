import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';

// Strip /api suffix to get the bare server origin for Socket.IO
const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5001/api')
  .replace(/\/api\/?$/, '');

let socket: Socket | null = null;

function getSocket(): Socket {
 if (!socket || !socket.connected) {
 socket = io(SOCKET_URL, {
   transports: ['websocket', 'polling'], // websocket first — Render supports native WS
   autoConnect: true,
 });
 }
 return socket;
}


export function useGroupChat(
 groupId: string,
 onNewMessage: (msg: any) => void
) {
 const callbackRef = useRef(onNewMessage);
 callbackRef.current = onNewMessage;
 const [isConnected, setIsConnected] = useState(false);

 useEffect(() => {
 if (!groupId) return;
 const s = getSocket();

 setIsConnected(s.connected);

 const onConnect = () => setIsConnected(true);
 const onDisconnect = () => setIsConnected(false);

 s.on('connect', onConnect);
 s.on('disconnect', onDisconnect);

 s.emit('join_group', groupId);

 const handler = (msg: any) => callbackRef.current(msg);
 s.on('new_message', handler);

 return () => {
 s.off('connect', onConnect);
 s.off('disconnect', onDisconnect);
 s.off('new_message', handler);
 };
 }, [groupId]);

 const sendSocketMessage = useCallback((message: any) => {
 const s = getSocket();
 s.emit('send_message', { groupId, message });
 }, [groupId]);

 return { sendSocketMessage, isConnected };
}
