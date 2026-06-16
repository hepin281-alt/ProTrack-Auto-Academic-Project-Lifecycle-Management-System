import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/apiClient';
import { Megaphone, X, Loader2 } from 'lucide-react';

interface Props {
 isOpen: boolean;
 onClose: () => void;
 onSuccess: () => void;
}

export const GuideAnnouncementsModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
 const { token } = useAuthStore();
 const [content, setContent] = useState('');
 const [isSubmitting, setIsSubmitting] = useState(false);

 if (!isOpen) return null;

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!content.trim()) return;

 setIsSubmitting(true);
 try {
 await api.broadcastAnnouncement(token!, content);
 setContent('');
 onSuccess();
 } catch (error) {
 console.error('Failed to broadcast announcement', error);
 alert('Failed to send announcement');
 } finally {
 setIsSubmitting(false);
 }
 };

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/5 backdrop-blur-sm">
 <div className="bg-[#1a1a1a] border border-white/[0.08] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
 <div className="flex items-center justify-between p-5 border-b border-white/[0.08]">
 <h3 className="text-lg font-bold text-white flex items-center gap-2">
 <Megaphone size={20} className="text-purple-400" />
 Broadcast Announcement
 </h3>
 <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
 <X size={20} />
 </button>
 </div>
 
 <form onSubmit={handleSubmit} className="p-5 space-y-4">
 <p className="text-sm text-white/50">
 This message will be sent to the group chat of <strong>all</strong> project groups assigned to you.
 </p>
 
 <div>
 <textarea
 required
 value={content}
 onChange={e => setContent(e.target.value)}
 className="w-full bg-white/5 border border-white/[0.08] rounded-xl p-4 text-white placeholder-white/20 outline-none focus:border-purple-500 min-h-[120px]"
 placeholder="Type your announcement here..."
 />
 </div>
 
 <div className="flex justify-end gap-3 pt-2">
 <button
 type="button"
 onClick={onClose}
 className="px-4 py-2 rounded-lg text-sm font-bold text-white/50 hover:bg-white/5 transition-colors"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={isSubmitting || !content.trim()}
 className="flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold bg-purple-500 hover:bg-purple-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
 >
 {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Megaphone size={16} />}
 Broadcast
 </button>
 </div>
 </form>
 </div>
 </div>
 );
};
