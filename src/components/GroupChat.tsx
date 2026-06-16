import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/apiClient';
import { useGroupChat } from '../hooks/useGroupChat';
import { MessageSquareDashed, Send, Loader2, AlertCircle, Wifi } from 'lucide-react';

interface GroupChatProps {
 groupId: string;
}

export const GroupChat: React.FC<GroupChatProps> = ({ groupId }) => {
 const { token, user } = useAuthStore();
 const [messages, setMessages] = useState<any[]>([]);
 const [newMessage, setNewMessage] = useState('');
 const [isLoading, setIsLoading] = useState(true);
 const [isSending, setIsSending] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const messagesEndRef = useRef<HTMLDivElement>(null);

 // Fetch initial message history from REST API
 const fetchMessages = async () => {
 if (!token || !groupId) return;
 try {
 const chatData = await api.getGroupChat(token, groupId);
 setMessages(Array.isArray(chatData) ? chatData : []);
 setError(null);
 } catch (err) {
 console.error('Failed to fetch chat', err);
 setError('Could not load discussion history.');
 } finally {
 setIsLoading(false);
 }
 };

 // Socket.IO real-time — receives new messages pushed from server
 const { sendSocketMessage, isConnected } = useGroupChat(groupId, (msg) => {
 setMessages(prev => {
 // Avoid duplicates by message_id
 if (prev.some(m => m.message_id === msg.message_id)) return prev;
 return [...prev, msg];
 });
 });

 useEffect(() => {
 setIsLoading(true);
 setMessages([]);
 fetchMessages();
 }, [groupId, token]);

 // Auto-scroll to bottom
 useEffect(() => {
 messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
 }, [messages]);

 const handleSendMessage = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!newMessage.trim() || !token || !groupId) return;

 setIsSending(true);
 try {
 // Persist to DB via REST
 const savedMsg = await api.sendGroupMessage(token, groupId, newMessage.trim());
 setNewMessage('');
 // Optimistically add locally
 setMessages(prev => {
 if (prev.some(m => m.message_id === savedMsg.message_id)) return prev;
 return [...prev, savedMsg];
 });
 // Broadcast to other users via WebSocket
 sendSocketMessage(savedMsg);
 } catch (err) {
 console.error('Failed to send message', err);
 setError('Failed to send message.');
 } finally {
 setIsSending(false);
 }
 };

 if (isLoading) {
 return (
 <div className="flex-1 flex flex-col items-center justify-center text-white/50 h-[400px]">
 <Loader2 size={32} className="animate-spin mb-4 opacity-50" />
 <p className="text-sm font-semibold">Loading discussion...</p>
 </div>
 );
 }

 return (
 <div className="flex flex-col h-full min-h-[400px] max-h-[600px]">
 {/* Live indicator */}
 <div className="flex items-center gap-2 mb-3">
 <div className={`flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-full ${isConnected ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/5 text-white/50'}`}>
 <Wifi size={10} className={isConnected ? 'animate-pulse' : ''} />
 {isConnected ? 'LIVE' : 'CONNECTING...'}
 </div>
 </div>

 {error && (
 <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-xs font-bold">
 <AlertCircle size={14} />
 {error}
 </div>
 )}

 <div className="flex-1 overflow-y-auto space-y-6 mb-4 pr-3 custom-scrollbar">
 {messages.length === 0 ? (
 <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-10">
 <div className="p-4 rounded-full bg-white/5 mb-4">
 <MessageSquareDashed size={32} className="text-white" />
 </div>
 <p className="text-sm font-bold text-white mb-1">It's quiet here...</p>
 <p className="text-xs text-white/50">Start the discussion by sending a message below.</p>
 </div>
 ) : (
 messages.map((msg, idx) => {
 const isMe = msg.sender_email === user?.email;
 const isAnnouncement = msg.is_announcement;

 const prevMsg = idx > 0 ? messages[idx - 1] : null;
 const isNewSender = !prevMsg || prevMsg.sender_email !== msg.sender_email || prevMsg.is_announcement !== isAnnouncement;
 const showAvatar = isNewSender && !isMe && !isAnnouncement;
 const showSenderInfo = isNewSender && !isAnnouncement;

 if (isAnnouncement) {
 return (
 <div key={msg.message_id} className="flex justify-center my-6">
 <div className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20 px-5 py-3 rounded-2xl text-xs max-w-[85%] text-center shadow-lg shadow-orange-500/5">
 <strong className="flex items-center justify-center gap-1.5 mb-1.5 text-[10px] uppercase tracking-widest text-orange-400">
 <span>📢 Global Announcement</span>
 </strong>
 <p className="text-orange-200/90 leading-relaxed">{msg.content}</p>
 </div>
 </div>
 );
 }

 return (
 <div key={msg.message_id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'} ${isNewSender ? 'mt-6' : 'mt-1.5'}`}>
 {!isMe && (
 <div className="w-8 flex-shrink-0 mr-3 flex flex-col items-center">
 {showAvatar && (
 <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-md">
 <span className="text-white text-xs font-bold">
 {(msg.sender_email || '?').charAt(0).toUpperCase()}
 </span>
 </div>
 )}
 </div>
 )}

 <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[75%]`}>
 {showSenderInfo && (
 <div className="flex items-baseline gap-2 mb-1.5 mx-1">
 {isMe ? (
 <>
 <span className="text-[9px] text-white/50 uppercase tracking-wider">{msg.sender_role}</span>
 <span className="text-[10px] font-bold text-white/50">You</span>
 </>
 ) : (
 <>
 <span className="text-[10px] font-bold text-white/50">{(msg.sender_email || 'Unknown').split('@')[0]}</span>
 <span className="text-[9px] text-white/50 uppercase tracking-wider">{msg.sender_role}</span>
 </>
 )}
 </div>
 )}

 <div className={`p-4 shadow-md text-sm leading-relaxed ${
 isMe
 ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-2xl rounded-tr-sm'
 : 'bg-white/[0.04] /10 text-white/50 rounded-2xl rounded-tl-sm border border-white/[0.08]'
 }`}>
 <p className="whitespace-pre-wrap break-words">{msg.content}</p>
 </div>

 <span className="text-[9px] font-semibold text-white/50 mt-1.5 mx-1">
 {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
 </span>
 </div>
 </div>
 );
 })
 )}
 <div ref={messagesEndRef} />
 </div>

 <form onSubmit={handleSendMessage} className="flex gap-3 mt-auto p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] shadow-inner">
 <input
 type="text"
 value={newMessage}
 onChange={e => setNewMessage(e.target.value)}
 placeholder="Type a message..."
 disabled={isSending}
 className="flex-1 px-4 py-3 bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/25 rounded-xl text-sm focus:outline-none focus:border-purple-500/50 focus:bg-white/[0.04] transition-all disabled:opacity-50"
 />
 <button
 type="submit"
 disabled={!newMessage.trim() || isSending}
 className="px-6 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded-xl disabled:opacity-50 hover:shadow-lg hover:shadow-purple-500/20 transition-all w-28"
 >
 {isSending ? (
 <Loader2 size={18} className="animate-spin" />
 ) : (
 <>
 <span>Send</span>
 <Send size={16} className="-mt-0.5" />
 </>
 )}
 </button>
 </form>
 </div>
 );
};
