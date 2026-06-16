import React, { useState, useEffect } from 'react';
import { AppShell } from '../../layouts/AppShell';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/apiClient';
import { Star, Users, CheckCircle, AlertCircle } from 'lucide-react';

interface Member {
 student_id: string;
 prn_no: string;
}

export const StudentPeerEvaluation: React.FC = () => {
 const { token, user } = useAuthStore();
 const [groupId, setGroupId] = useState<string | null>(null);
 const [members, setMembers] = useState<Member[]>([]);
 const [submittedIds, setSubmittedIds] = useState<string[]>([]);
 const [isLoading, setIsLoading] = useState(false);
 const [error, setError] = useState('');

 const [evaluations, setEvaluations] = useState<Record<string, { score: number; comments: string }>>({});

 useEffect(() => {
 const fetchGroupAndMembers = async () => {
 if (!token) return;
 try {
 setIsLoading(true);
 const groups = await api.getGroups(token);
 const active = groups.find((g: any) => g.status === 'ACTIVE' || g.status === 'WAITING_ALLOCATION');
 if (active) {
 setGroupId(active.group_id);
 const membersData = await api.getMembers(token, active.group_id);
 // Filter out current user
 const peers = membersData.filter((m: any) => m.student_id !== user?.user_id);
 setMembers(peers);
 
 // Initialize evaluation state
 const initialEval: any = {};
 peers.forEach((p: any) => {
 initialEval[p.student_id] = { score: 5, comments: '' };
 });
 setEvaluations(initialEval);
 } else {
 setError('You do not have an active group to evaluate.');
 }
 } catch (err) {
 setError('Failed to load group members');
 } finally {
 setIsLoading(false);
 }
 };
 fetchGroupAndMembers();
 }, [token, user]);

 const handleSubmit = async (evaluateeId: string) => {
 if (!token || !groupId) return;
 const data = evaluations[evaluateeId];
 try {
 await api.submitPeerEvaluation(token, groupId, evaluateeId, data.score, data.comments);
 setSubmittedIds([...submittedIds, evaluateeId]);
 } catch (err) {
 console.error('Failed to submit evaluation:', err);
 alert('Failed to submit evaluation');
 }
 };

 const updateEval = (id: string, field: 'score' | 'comments', value: any) => {
 setEvaluations(prev => ({
 ...prev,
 [id]: { ...prev[id], [field]: value }
 }));
 };

 return (
 <AppShell currentPage="/student/peer-evaluation">
 <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
 <div>
 <div className="flex items-center gap-3 mb-1">
 <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30">
 <Star size={20} className="text-amber-400" />
 </div>
 <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">Peer Evaluation</h1>
 </div>
 <p className="text-white/50 text-sm ml-[52px]">Anonymously grade your group members' contributions</p>
 </div>
 </div>

 {error && (
 <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-300">
 <AlertCircle size={18} />
 <span className="text-sm">{error}</span>
 </div>
 )}

 {!isLoading && !error && members.length > 0 && (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {members.map(member => {
 const isSubmitted = submittedIds.includes(member.student_id);
 const currentEval = evaluations[member.student_id];
 
 return (
 <div key={member.student_id} className="p-7 bg-white/[0.04] border border-white/[0.08][0.05] rounded-3xl relative overflow-hidden hover:bg-white/[0.04] hover:border-white/[0.08][0.1] hover:-translate-y-1 transition-all hover:shadow-2xl">
 {isSubmitted && (
 <div className="absolute inset-0 bg-white/[0.02] dark:bg-slate-900/80 backdrop-blur-md z-10 flex flex-col items-center justify-center animate-in fade-in duration-500">
 <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
 <CheckCircle size={32} className="text-emerald-400" />
 </div>
 <p className="text-lg font-bold text-white">Evaluation Submitted</p>
 <p className="text-sm text-white/50 mt-1">Thank you for your feedback.</p>
 </div>
 )}
 
 <div className="flex items-center gap-4 mb-8">
 <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 border border-white/[0.08] flex items-center justify-center shadow-inner">
 <Users size={20} className="text-white/50" />
 </div>
 <div>
 <p className="text-white font-black text-lg tracking-wide">PRN: {member.prn_no}</p>
 <p className="text-white/50 text-xs uppercase tracking-widest font-bold mt-0.5">Group Member</p>
 </div>
 </div>
 
 <div className="space-y-6">
 <div>
 <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-3">Contribution Score (1-5)</label>
 <div className="flex gap-2">
 {[1, 2, 3, 4, 5].map(score => (
 <button
 key={score}
 onClick={() => updateEval(member.student_id, 'score', score)}
 className={`flex-1 aspect-square rounded-xl flex items-center justify-center font-black text-lg transition-all ${
 currentEval.score === score 
 ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.4)] scale-105' 
 : 'bg-white/5 text-white/50 hover:bg-white/[0.04] /10 hover:text-white/50'
 }`}
 >
 {score}
 </button>
 ))}
 </div>
 </div>
 
 <div>
 <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-3">Private Comments for Committee</label>
 <textarea
 value={currentEval.comments}
 onChange={(e) => updateEval(member.student_id, 'comments', e.target.value)}
 placeholder="Briefly describe their contribution to the project..."
 className="w-full h-28 bg-white/5 border border-white/[0.08] rounded-2xl p-4 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-amber-500/50 focus:bg-white/[0.04] /10 transition-all resize-none"
 />
 </div>
 
 <button
 onClick={() => handleSubmit(member.student_id)}
 className="w-full py-3.5 mt-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] text-white font-bold text-sm uppercase tracking-wider rounded-xl transition-all"
 >
 Submit Evaluation
 </button>
 </div>
 </div>
 );
 })}
 </div>
 )}
 
 {!isLoading && !error && members.length === 0 && groupId && (
 <div className="text-center py-12">
 <p className="text-white/50">No other members in your group to evaluate.</p>
 </div>
 )}
 </AppShell>
 );
};
