import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/apiClient';
import { Users, Loader2 } from 'lucide-react';
import dayjs from 'dayjs';

interface PeerEval {
 evaluation_id: string;
 evaluator_name: string;
 evaluatee_name: string;
 score: number;
 comments: string;
 created_at: string;
}

export const GuidePeerEvals: React.FC<{ groupId: string }> = ({ groupId }) => {
 const { token } = useAuthStore();
 const [evals, setEvals] = useState<PeerEval[]>([]);
 const [isLoading, setIsLoading] = useState(true);

 useEffect(() => {
 if (token && groupId) fetchEvals();
 }, [token, groupId]);

 const fetchEvals = async () => {
 try {
 setIsLoading(true);
 const data = await api.getGuideGroupPeerEvaluations(token!, groupId);
 setEvals(data);
 } catch (error) {
 console.error('Failed to fetch peer evaluations', error);
 } finally {
 setIsLoading(false);
 }
 };

 if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-purple-500" /></div>;

 return (
 <div className="space-y-6">
 <h3 className="text-lg font-bold text-white flex items-center gap-2">
 <Users size={20} className="text-purple-400" />
 Peer Evaluations
 </h3>

 {evals.length === 0 ? (
 <div className="text-center py-10 bg-white/5 rounded-xl border border-white/[0.08]">
 <Users size={40} className="mx-auto text-white/50 mb-3" />
 <p className="text-white/50">No peer evaluations have been submitted yet.</p>
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {evals.map(ev => (
 <div key={ev.evaluation_id} className="bg-white/5 border border-white/[0.08] rounded-xl p-5">
 <div className="flex justify-between items-start mb-3">
 <div>
 <div className="text-xs font-bold text-white/50 uppercase mb-1">Evaluator</div>
 <div className="text-white font-medium">{ev.evaluator_name}</div>
 </div>
 <div className="text-right">
 <div className="text-xs font-bold text-white/50 uppercase mb-1">Score</div>
 <div className="text-xl font-bold text-purple-400">{ev.score} / 5</div>
 </div>
 </div>
 
 <div className="mb-4">
 <div className="text-xs font-bold text-white/50 uppercase mb-1">Evaluated Peer</div>
 <div className="text-white font-medium">{ev.evaluatee_name}</div>
 </div>

 {ev.comments && (
 <div className="bg-white/5 p-3 rounded-lg text-sm text-white/50 border border-white/[0.08]">
 {ev.comments}
 </div>
 )}
 
 <div className="mt-4 text-xs text-white/50 text-right">
 {dayjs(ev.created_at).format('MMM D, YYYY')}
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 );
};
