import React, { useState, useEffect } from 'react';
import { AppShell } from '../../layouts/AppShell';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/apiClient';
import {
 BookOpen, Plus, CheckCircle2, Clock,
 X, ChevronDown, ChevronUp, Loader2, RefreshCw, Link2
} from 'lucide-react';

interface Group { group_id: string; group_name: string; status: string; }

interface Logbook {
 log_id: string;
 week_number: number;
 work_summary: string;
 evidence_url?: string;
 guide_status: string;
 guide_remarks?: string;
 created_at: string;
}

// ─────────────────────────────────────────────────────────────────

export const StudentLogbook: React.FC = () => {
 const { token } = useAuthStore();
 const [groups, setGroups] = useState<Group[]>([]);
 const [selectedGroupId, setSelectedGroupId] = useState<string>('');
 const [logbooks, setLogbooks] = useState<Logbook[]>([]);
 const [isGroupsLoading, setIsGroupsLoading] = useState(true);
 const [isLoading, setIsLoading] = useState(false);
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
 const [expandedId, setExpandedId] = useState<string | null>('l8');
 const [showSubmitModal, setShowSubmitModal] = useState(false);

 const [weekNumber, setWeekNumber] = useState('');
 const [workSummary, setWorkSummary] = useState('');
 const [evidenceUrl, setEvidenceUrl] = useState('');
 const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
 const [_uploading, setUploading] = useState(false);

 const showToast = (type: 'success' | 'error', msg: string) => {
 setToast({ type, msg });
 setTimeout(() => setToast(null), 3500);
 };

 const fetchGroups = async () => {
 if (!token) return;
 try {
 setIsGroupsLoading(true);
 const data = await api.getGroups(token);
 const list = Array.isArray(data) ? data : [];
 setGroups(list);
 if (list.length > 0) {
 setSelectedGroupId(list[0].group_id);
 }
 } catch (_err) {
 setGroups([]);
 } finally {
 setIsGroupsLoading(false);
 }
 };

 const fetchLogbooks = async (groupId: string) => {
 if (!token || !groupId) {
 setLogbooks([]);
 return;
 }
 try {
 setIsLoading(true);
 const data = await api.getLogbooks(token, groupId);
 const list = Array.isArray(data) ? data : ((data as any)?.logbooks ?? []);
 setLogbooks(list.sort((a: Logbook, b: Logbook) => b.week_number - a.week_number));
 } catch (_err) {
 setLogbooks([]);
 } finally {
 setIsLoading(false);
 }
 };

 useEffect(() => { fetchGroups(); }, []); // eslint-disable-line
 useEffect(() => { if (selectedGroupId) fetchLogbooks(selectedGroupId); }, [selectedGroupId]); // eslint-disable-line

 const handleGroupChange = (id: string) => {
 setSelectedGroupId(id);
 setLogbooks([]);
 };

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!weekNumber || !workSummary.trim()) {
 showToast('error', 'Week number and work summary are required');
 return;
 }
 try {
 setIsSubmitting(true);
 let finalEvidenceUrl = evidenceUrl.trim();

 if (evidenceFile && token) {
 setUploading(true);
 try {
 const uploadRes = await api.uploadEvidence(token, evidenceFile);
 // Append full API url if it's a relative path, but local might be enough depending on how frontend displays it
 finalEvidenceUrl = uploadRes.url;
 } catch (err) {
 showToast('error', 'Failed to upload evidence file');
 setIsSubmitting(false);
 setUploading(false);
 return;
 }
 setUploading(false);
 }

 if (token) {
 await api.submitLogbook(token, selectedGroupId, parseInt(weekNumber), workSummary.trim(), finalEvidenceUrl || undefined);
 }
 const newEntry: Logbook = {
 log_id: `l-${Date.now()}`,
 week_number: parseInt(weekNumber),
 work_summary: workSummary.trim(),
 evidence_url: finalEvidenceUrl || undefined,
 guide_status: 'PENDING',
 created_at: new Date().toISOString().split('T')[0],
 };
 setLogbooks(prev => [newEntry, ...prev].sort((a, b) => b.week_number - a.week_number));
 setExpandedId(newEntry.log_id);
 showToast('success', `Week ${weekNumber} logbook submitted!`);
 setShowSubmitModal(false);
 setWeekNumber('');
 setWorkSummary('');
 setEvidenceUrl('');
 setEvidenceFile(null);
 } catch (err) {
 showToast('error', err instanceof Error ? err.message : 'Failed to submit logbook');
 } finally {
 setIsSubmitting(false);
 setUploading(false);
 }
 };

 const statusConfig = (status: string) => {
 switch (status) {
 case 'APPROVED': return { label: 'Approved', icon: <CheckCircle2 size={11} />, cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
 case 'NEEDS_REVISION': return { label: 'Needs Revision', icon: <RefreshCw size={11} />, cls: 'bg-orange-500/10 text-orange-400 border-orange-500/20' };
 default: return { label: 'Pending Review', icon: <Clock size={11} />, cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
 }
 };

 const approvedCount = logbooks.filter(l => l.guide_status === 'APPROVED').length;
 const pendingCount = logbooks.filter(l => l.guide_status === 'PENDING').length;
 const revisionCount = logbooks.filter(l => l.guide_status === 'NEEDS_REVISION').length;

 return (
 <AppShell currentPage="/student/logbook">
 {/* Toast */}
 {toast && (
 <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-sm font-semibold animate-slide-up ${
 toast.type === 'success'
 ? 'bg-emerald-900/90 border-emerald-500/30 text-emerald-300'
 : 'bg-red-900/90 border-red-500/30 text-red-300'
 }`}>
 {toast.type === 'success' ? <CheckCircle2 size={16} /> : <X size={16} />}
 {toast.msg}
 <button onClick={() => setToast(null)} className="ml-2 opacity-60 hover:opacity-100"><X size={13} /></button>
 </div>
 )}

 {/* Header */}
 <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
 <div>
 <div className="flex items-center gap-3 mb-1">
 <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
 <BookOpen size={20} className="text-purple-400" />
 </div>
 <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">Logbook</h1>
 </div>
 <p className="text-white/50 text-sm ml-[52px]">Weekly project progress journal</p>
 </div>
 {groups.length > 0 && (
 <button
 onClick={() => setShowSubmitModal(true)}
 className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-600 text-white text-sm font-bold rounded-xl hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:-translate-y-0.5 transition-all"
 >
 <Plus size={16} /> New Entry
 </button>
 )}
 </div>

 {/* No Group State */}
 {isGroupsLoading ? (
 <div className="flex flex-col items-center justify-center py-24 gap-4">
 <Loader2 size={32} className="text-purple-400 animate-spin" />
 <p className="text-white/50 text-sm">Loading your groups...</p>
 </div>
 ) : groups.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-24 gap-6 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
 <div className="p-5 rounded-2xl bg-purple-500/10 border border-purple-500/20">
 <BookOpen size={36} className="text-purple-400" />
 </div>
 <div className="text-center">
 <h2 className="text-xl font-bold text-white mb-2">No Group Yet</h2>
 <p className="text-white/50 text-sm max-w-sm">You haven't been added to a project group yet. Once your coordinator assigns you to a group, your logbook will appear here.</p>
 </div>
 </div>
 ) : (
 <>
 {/* Group Selector */}
 {groups.length > 1 && (
 <div className="mb-6 flex items-center gap-3">
 <p className="text-xs font-bold text-white/50 uppercase tracking-widest">Group:</p>
 <div className="flex gap-2">
 {groups.map(g => (
 <button
 key={g.group_id}
 onClick={() => handleGroupChange(g.group_id)}
 className={`px-4 py-1.5 rounded-xl text-sm font-semibold transition-all ${
 selectedGroupId === g.group_id
 ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
 : 'text-white/50 hover:text-white bg-white/[0.04] border border-white/[0.08]'
 }`}
 >
 {g.group_name}
 </button>
 ))}
 </div>
 </div>
 )}

 {/* Stats */}
 <div className="grid grid-cols-4 gap-4 mb-8">
 {[
 { label: 'Total Entries', value: logbooks.length, color: 'from-purple-500 to-pink-500' },
 { label: 'Approved', value: approvedCount, color: 'from-emerald-500 to-teal-500' },
 { label: 'Pending', value: pendingCount, color: 'from-amber-500 to-orange-500' },
 { label: 'Needs Revision', value: revisionCount, color: 'from-orange-500 to-red-500' },
 ].map(s => (
 <div key={s.label} className="rounded-2xl p-5 bg-white/[0.04] border border-white/[0.08]">
 <p className="text-xs font-bold text-white/50 uppercase tracking-widest mb-2">{s.label}</p>
 <p className={`text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r ${s.color}`}>{s.value}</p>
 </div>
 ))}
 </div>

 {/* Logbook Entries */}
 <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] overflow-hidden">
 <div className="p-5 border-b border-white/[0.08][0.06] flex items-center justify-between">
 <h2 className="text-sm font-bold text-white">Weekly Entries</h2>
 <button
 onClick={() => fetchLogbooks(selectedGroupId)}
 className="p-1.5 text-white/50 hover:text-white hover:bg-white/[0.04] /10 rounded-lg transition-all"
 >
 {isLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
 </button>
 </div>

 {logbooks.length === 0 ? (
 <div className="p-12 text-center">
 <BookOpen size={32} className="text-white/50 mx-auto mb-3" />
 <p className="text-sm text-white/50 mb-4">No entries yet</p>
 <button onClick={() => setShowSubmitModal(true)} className="text-xs text-purple-400 hover:text-purple-300 font-semibold transition-colors">
 Submit your first entry →
 </button>
 </div>
 ) : (
 <div className="p-6 relative">
 {/* Timeline vertical line */}
 <div className="absolute left-[3.25rem] top-10 bottom-10 w-px bg-white/[0.04]" />
 <div className="space-y-6 relative">
 {logbooks.map((log) => {
 const sc = statusConfig(log.guide_status);
 const isExpanded = expandedId === log.log_id;
 return (
 <div key={log.log_id} className="relative flex gap-6 group">
 <div className="relative z-10 flex flex-col items-center mt-1">
 <div className={`w-11 h-11 rounded-full flex items-center justify-center border-4 border-[#0B0F19] shadow-[0_0_15px_rgba(255,255,255,0.05)] ${
 log.guide_status === 'APPROVED' ? 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/10' :
 log.guide_status === 'NEEDS_REVISION' ? 'bg-gradient-to-br from-orange-500/20 to-red-500/20 text-orange-400 border-orange-500/10' :
 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 text-purple-400 border-purple-500/10'
 }`}>
 <span className="text-sm font-black">W{log.week_number}</span>
 </div>
 </div>
 <div className="flex-1 bg-white/[0.04] border border-white/[0.08][0.05] rounded-2xl overflow-hidden hover:border-white/[0.08][0.12] hover:bg-white/[0.04] transition-all hover:-translate-y-0.5 hover:shadow-lg">
 <button
 onClick={() => setExpandedId(isExpanded ? null : log.log_id)}
 className="w-full flex flex-col md:flex-row md:items-center justify-between p-5 text-left gap-4"
 >
 <div className="flex-1">
 <div className="flex items-center gap-3 mb-2">
 <p className="text-sm font-semibold text-white">Week {log.week_number} Update</p>
 <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${sc.cls}`}>
 {sc.icon} {sc.label}
 </span>
 </div>
 <p className={`text-xs text-white/50 ${isExpanded ? '' : 'line-clamp-2'}`}>{log.work_summary}</p>
 </div>
 <div className="flex items-center gap-4 text-white/50 flex-shrink-0">
 <span className="text-[11px] font-semibold tracking-wider">{log.created_at}</span>
 <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/[0.04] /10 transition-colors">
 {isExpanded ? <ChevronUp size={16} className="text-white/50" /> : <ChevronDown size={16} className="text-white/50" />}
 </div>
 </div>
 </button>

 {isExpanded && (
 <div className="px-5 pb-5 pt-2 border-t border-white/[0.08][0.05] space-y-4">
 <div className="p-4 rounded-xl bg-white/5 border border-white/[0.08][0.04]">
 <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2">Detailed Summary</p>
 <p className="text-sm text-white/50 leading-relaxed whitespace-pre-wrap">{log.work_summary}</p>
 </div>
 {log.evidence_url && (
 <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center gap-3">
 <div className="p-1.5 rounded-lg bg-blue-500/20">
 <Link2 size={14} className="text-blue-400 flex-shrink-0" />
 </div>
 <a href={log.evidence_url} target="_blank" rel="noreferrer" className="text-xs font-medium text-blue-400 hover:text-blue-300 underline underline-offset-2 break-all">
 {log.evidence_url.split('/').pop()}
 </a>
 </div>
 )}
 {log.guide_remarks && (
 <div className={`p-4 rounded-xl border relative overflow-hidden ${
 log.guide_status === 'APPROVED'
 ? 'bg-emerald-500/[0.06] border-emerald-500/[0.15]'
 : 'bg-orange-500/[0.06] border-orange-500/[0.15]'
 }`}>
 <div className={`absolute top-0 left-0 w-1 h-full ${
 log.guide_status === 'APPROVED' ? 'bg-emerald-500' : 'bg-orange-500'
 }`} />
 <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2 ml-1">Guide Feedback</p>
 <p className="text-sm text-white/50 italic ml-1 leading-relaxed">"{log.guide_remarks}"</p>
 </div>
 )}
 </div>
 )}
 </div>
 </div>
 );
 })}
 </div>
 </div>
 )}
 </div>

 {/* Submit Modal */}
 {showSubmitModal && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
 <div className="absolute inset-0 bg-white/5 backdrop-blur-sm" onClick={() => setShowSubmitModal(false)} />
 <div className="relative w-full max-w-lg bg-white/[0.02] dark:bg-slate-900/95 backdrop-blur-xl border border-white/[0.08] rounded-3xl p-7 shadow-2xl">
 <h3 className="text-lg font-bold text-white mb-6">Submit Weekly Entry</h3>
 <form onSubmit={handleSubmit} className="space-y-4">
 <div>
 <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">Week Number</label>
 <input
 type="number" min="1" max="52"
 value={weekNumber}
 onChange={e => setWeekNumber(e.target.value)}
 placeholder={`Next: Week ${logbooks.length > 0 ? Math.max(...logbooks.map(l => l.week_number)) + 1 : 1}`}
 className="w-full px-4 py-3 bg-white/5 border border-white/[0.08] text-white placeholder:text-white/25 rounded-xl text-sm focus:outline-none focus:border-white/[0.08] transition-all"
 autoFocus
 />
 </div>
 <div>
 <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">Work Summary</label>
 <textarea
 value={workSummary}
 onChange={e => setWorkSummary(e.target.value)}
 placeholder="Describe what you accomplished this week..."
 rows={5}
 className="w-full px-4 py-3 bg-white/5 border border-white/[0.08] text-white placeholder:text-white/25 rounded-xl text-sm focus:outline-none focus:border-white/[0.08] transition-all resize-none"
 />
 <p className="text-[10px] text-white/50 mt-1 text-right">{workSummary.length} chars</p>
 </div>
 
 <div className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.08][0.06] space-y-3">
 <p className="text-xs font-bold text-white/50 uppercase tracking-widest">Evidence Attachment <span className="normal-case font-normal text-white/50">(Optional)</span></p>
 
 <div>
 <label className="block text-[10px] font-semibold text-white/50 uppercase mb-1.5">Upload File</label>
 <input 
 type="file" 
 accept=".pdf,.docx,.png,.jpg,.jpeg"
 onChange={e => {
 setEvidenceFile(e.target.files?.[0] || null);
 if (e.target.files?.[0]) setEvidenceUrl(''); // Clear url if file chosen
 }}
 className="w-full text-xs text-white/50 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-500/20 file:text-purple-300 hover:file:bg-purple-500/30 transition-all" 
 />
 <p className="text-[10px] text-white/50 mt-1">Accepts PDF, DOCX, JPG, PNG (Max 5MB)</p>
 </div>
 
 <div className="relative">
 <div className="absolute inset-0 flex items-center">
 <div className="w-full border-t border-white/[0.08]"></div>
 </div>
 <div className="relative flex justify-center text-[10px]">
 <span className="bg-white/[0.02] dark:bg-slate-900 px-2 text-white/50 uppercase font-bold tracking-widest">OR</span>
 </div>
 </div>

 <div>
 <label className="block text-[10px] font-semibold text-white/50 uppercase mb-1.5">Paste External Link</label>
 <input
 type="url"
 value={evidenceUrl}
 onChange={e => {
 setEvidenceUrl(e.target.value);
 if (e.target.value) setEvidenceFile(null); // Clear file if url pasted
 }}
 placeholder="https://github.com/..."
 disabled={evidenceFile !== null}
 className="w-full px-3 py-2 bg-white/5 border border-white/[0.08] text-white placeholder:text-white/25 rounded-lg text-xs focus:outline-none focus:border-white/[0.08] transition-all disabled:opacity-50"
 />
 </div>
 </div>

 <div className="flex gap-3 pt-2">
 <button type="button" onClick={() => setShowSubmitModal(false)}
 className="flex-1 py-2.5 text-sm text-white/50 border border-white/[0.08] rounded-xl hover:bg-white/5 font-semibold transition-all">Cancel</button>
 <button type="submit" disabled={isSubmitting}
 className="flex-1 py-2.5 text-sm bg-gradient-to-r from-purple-500 to-pink-600 text-white font-bold rounded-xl hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all disabled:opacity-40">
 {isSubmitting ? 'Submitting…' : 'Submit Entry'}
 </button>
 </div>
 </form>
 </div>
 </div>
 )}

 <style>{`
 @keyframes slide-up { from{opacity:0;transform:translateY(-12px)} to{opacity:1;transform:translateY(0)} }
 .animate-slide-up{animation:slide-up 0.3s ease-out}
 `}</style>
 </>
 )}
 </AppShell>
 );
};
