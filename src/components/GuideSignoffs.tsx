import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/apiClient';
import { FileSignature, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import dayjs from 'dayjs';

interface Signoff {
 signoff_id: string;
 document_type: string;
 status: 'APPROVED' | 'REJECTED' | 'PENDING';
 comments: string;
 signed_at: string;
}

export const GuideSignoffs: React.FC<{ groupId: string }> = ({ groupId }) => {
 const { token } = useAuthStore();
 const [signoffs, setSignoffs] = useState<Signoff[]>([]);
 const [isLoading, setIsLoading] = useState(true);

 const documentTypes = ['Project Charter', 'Requirement Specification', 'Design Document', 'Final Report'];

 useEffect(() => {
 if (token && groupId) fetchSignoffs();
 }, [token, groupId]);

 const fetchSignoffs = async () => {
 try {
 setIsLoading(true);
 const data = await api.getSignoffs(token!, groupId);
 setSignoffs(data);
 } catch (error) {
 console.error('Failed to fetch signoffs', error);
 } finally {
 setIsLoading(false);
 }
 };

 const handleSignoff = async (docType: string, status: 'APPROVED' | 'REJECTED') => {
 const comments = window.prompt(`Add any comments for ${status === 'APPROVED' ? 'approving' : 'rejecting'} ${docType}:`);
 if (comments === null) return; // User cancelled

 try {
 await api.updateSignoff(token!, groupId, docType, status, comments);
 fetchSignoffs();
 } catch (error) {
 console.error('Failed to update signoff', error);
 }
 };

 const getStatusConfig = (status: string | undefined) => {
 switch (status) {
 case 'APPROVED': return { color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', icon: CheckCircle };
 case 'REJECTED': return { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: XCircle };
 default: return { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', icon: Clock };
 }
 };

 if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-purple-500" /></div>;

 return (
 <div className="space-y-6">
 <h3 className="text-lg font-bold text-white flex items-center gap-2">
 <FileSignature size={20} className="text-purple-400" />
 Document Sign-offs
 </h3>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {documentTypes.map(docType => {
 const signoff = signoffs.find(s => s.document_type === docType);
 const status = signoff?.status || 'PENDING';
 const config = getStatusConfig(status);
 const StatusIcon = config.icon;

 return (
 <div key={docType} className={`border rounded-xl p-5 ${config.bg} ${config.border}`}>
 <div className="flex justify-between items-start mb-4">
 <div>
 <h4 className="font-bold text-white text-lg">{docType}</h4>
 <div className={`flex items-center gap-1.5 mt-1 text-sm font-medium ${config.color}`}>
 <StatusIcon size={14} />
 {status}
 </div>
 </div>
 </div>

 {signoff?.comments && (
 <div className="mb-4 text-sm text-white/50 bg-white/5 p-3 rounded-lg border border-white/[0.08]">
 <span className="font-bold text-white/50 block mb-1">Guide Comments:</span>
 {signoff.comments}
 </div>
 )}

 {signoff?.signed_at && (
 <div className="text-xs text-white/50 mb-4">
 Signed on {dayjs(signoff.signed_at).format('MMM D, YYYY at h:mm A')}
 </div>
 )}

 <div className="flex gap-2">
 <button 
 onClick={() => handleSignoff(docType, 'APPROVED')}
 className="flex-1 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 rounded-lg text-sm font-bold transition-colors"
 >
 Approve
 </button>
 <button 
 onClick={() => handleSignoff(docType, 'REJECTED')}
 className="flex-1 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg text-sm font-bold transition-colors"
 >
 Reject
 </button>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 );
};
