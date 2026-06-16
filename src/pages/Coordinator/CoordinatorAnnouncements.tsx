import React, { useState, useEffect } from 'react';
import { AppShell } from '../../layouts/AppShell';
import { api } from '../../lib/apiClient';
import { useAuthStore } from '../../store/authStore';
import { Bell, Loader2, Send, CheckCircle2, XCircle, X } from 'lucide-react';

export const CoordinatorAnnouncements: React.FC = () => {
 const { token } = useAuthStore();
 const [announcements, setAnnouncements] = useState<any[]>([]);
 const [newMessage, setNewMessage] = useState('');
 const [isLoading, setIsLoading] = useState(false);
 const [isSending, setIsSending] = useState(false);
 const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

 const showToast = (type: 'success' | 'error', msg: string) => {
 setToast({ type, msg });
 setTimeout(() => setToast(null), 3500);
 };

 useEffect(() => {
 fetchAnnouncements();
 }, [token]);

 const fetchAnnouncements = async () => {
 if (!token) return;
 setIsLoading(true);
 try {
 const data = await api.getAnnouncements(token);
 setAnnouncements(Array.isArray(data) ? data : []);
 } catch (err: any) {
 console.error(err);
 showToast('error', err.message || 'Failed to load announcements');
 } finally {
 setIsLoading(false);
 }
 };

 const handleSendAnnouncement = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!newMessage.trim() || !token) return;
 setIsSending(true);
 try {
 await api.sendAnnouncement(token, newMessage.trim());
 showToast('success', 'Announcement sent successfully');
 setNewMessage('');
 fetchAnnouncements();
 } catch (err: any) {
 console.error(err);
 showToast('error', err.message || 'Failed to send announcement');
 } finally {
 setIsSending(false);
 }
 };

 return (
 <AppShell currentPage="/coordinator/announcements">
 {toast && (
 <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-sm font-semibold animate-slide-up ${
 toast.type === 'success'
 ? 'bg-emerald-900/90 border-emerald-500/30 text-emerald-300'
 : 'bg-red-900/90 border-red-500/30 text-red-300'
 }`}>
 {toast.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
 {toast.msg}
 <button onClick={() => setToast(null)} className="ml-2 opacity-60 hover:opacity-100"><X size={13} /></button>
 </div>
 )}

 <div className="mb-8 flex items-center gap-3">
 <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-red-500">
 <Bell size={18} className="text-white" />
 </div>
 <div>
 <h1 className="text-2xl font-black text-white">Global Announcements</h1>
 <p className="text-white/50 text-sm">Send messages to all groups and guides</p>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 
 {/* Left Panel: Compose */}
 <div className="col-span-1">
 <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-6">
 <h2 className="text-lg font-bold text-white mb-4">New Announcement</h2>
 <form onSubmit={handleSendAnnouncement}>
 <textarea
 value={newMessage}
 onChange={(e) => setNewMessage(e.target.value)}
 placeholder="Type your announcement here... This will be visible in every group's chat."
 rows={6}
 className="w-full px-4 py-3 bg-white/5 border border-white/[0.08] text-white placeholder:text-white/25 rounded-xl text-sm focus:outline-none focus:border-white/[0.08] transition-all resize-none mb-4"
 />
 <button
 type="submit"
 disabled={!newMessage.trim() || isSending}
 className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-xl disabled:opacity-50 hover:shadow-lg transition-all flex items-center justify-center gap-2"
 >
 {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
 Blast Announcement
 </button>
 </form>
 </div>
 </div>

 {/* Right Panel: History */}
 <div className="col-span-1 lg:col-span-2">
 <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] overflow-hidden flex flex-col h-[calc(100vh-16rem)]">
 <div className="p-4 border-b border-white/[0.08][0.06] bg-white/[0.04] flex items-center justify-between">
 <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest">
 Announcement History
 </h3>
 {isLoading && <Loader2 size={14} className="animate-spin text-white/50" />}
 </div>
 <div className="flex-1 overflow-y-auto p-6 space-y-4">
 {announcements.length === 0 && !isLoading ? (
 <div className="text-center py-10 text-white/50 text-sm font-semibold">
 No announcements sent yet.
 </div>
 ) : (
 announcements.map((msg) => (
 <div key={msg.message_id} className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 relative">
 <div className="flex justify-between items-start mb-2">
 <span className="text-[10px] uppercase tracking-wider font-bold text-orange-400">Sent by Coordinator</span>
 <span className="text-xs text-white/50">
 {new Date(msg.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
 </span>
 </div>
 <p className="text-sm text-white/50 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
 </div>
 ))
 )}
 </div>
 </div>
 </div>
 </div>

 <style>{`
 @keyframes slide-up { from{opacity:0;transform:translateY(-12px)} to{opacity:1;transform:translateY(0)} }
 .animate-slide-up{animation:slide-up 0.3s ease-out}
 `}</style>
 </AppShell>
 );
};
