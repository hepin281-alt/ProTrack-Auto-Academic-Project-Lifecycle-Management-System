import React, { useState, useEffect } from 'react';
import { AppShell } from '../../layouts/AppShell';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/apiClient';
import { CheckSquare, Clock, CheckCircle2, X, AlertOctagon, RefreshCw, Link2, MessageSquare, SlidersHorizontal } from 'lucide-react';

interface Group {
    group_id: string;
    group_name: string;
}

interface Logbook {
    log_id: string;
    group_id: string;
    week_number: number;
    work_summary: string;
    evidence_url?: string;
    guide_status: string;
    guide_remarks?: string;
    created_at: string;
    group_name?: string;
}

export const GuideReviews: React.FC = () => {
    const { token } = useAuthStore();
    const [logbooks, setLogbooks] = useState<Logbook[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    // Panel State
    const [reviewPanel, setReviewPanel] = useState<{ isOpen: boolean; log: Logbook | null }>({ isOpen: false, log: null });
    const [remarks, setRemarks] = useState('');
    const [scores, setScores] = useState({ progress: 3, quality: 3, punctuality: 3 });
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedLogs, setSelectedLogs] = useState<string[]>([]);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

    const showToast = (type: 'success' | 'error', msg: string) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchAllLogbooks = async () => {
        if (!token) return;
        try {
            setIsLoading(true);
            const groups: Group[] = await api.getGroups(token, 'ACTIVE');
            let allLogs: Logbook[] = [];

            for (const group of groups) {
                try {
                    const logs = await api.getLogbooks(token, group.group_id);
                    const logArray = Array.isArray(logs) ? logs : (logs as any).logbooks || [];
                    const mappedLogs = logArray.map((l: any) => ({
                        ...l,
                        group_name: group.group_name
                    }));
                    allLogs = [...allLogs, ...mappedLogs];
                } catch (e) {
                    console.error("Failed to fetch logs for group", group.group_id);
                }
            }

            allLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            setLogbooks(allLogs);
        } catch (error) {
            console.error("Failed to fetch logbooks", error);
            showToast('error', 'Failed to fetch logbooks.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAllLogbooks();
    }, [token]);

    const handleReview = async (status: string) => {
        if (!token || !reviewPanel.log) return;
        
        // Compile remarks with scores
        const compiledRemarks = `[Progress: ${scores.progress}/5, Quality: ${scores.quality}/5, Punctuality: ${scores.punctuality}/5] - ${remarks}`;
        
        try {
            setIsSubmitting(true);
            await api.approveLogbook(token, reviewPanel.log.log_id, status, compiledRemarks);
            showToast('success', `Logbook marked as ${status.replace('_', ' ')}`);
            setReviewPanel({ isOpen: false, log: null });
            setRemarks('');
            setScores({ progress: 3, quality: 3, punctuality: 3 });
            fetchAllLogbooks();
        } catch (error) {
            showToast('error', 'Failed to submit review.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBulkApprove = async () => {
        if (!token || selectedLogs.length === 0) return;
        try {
            setIsSubmitting(true);
            await api.bulkApproveLogbooks(token, selectedLogs);
            showToast('success', `Bulk approved ${selectedLogs.length} logbooks`);
            setSelectedLogs([]);
            fetchAllLogbooks();
        } catch (error) {
            showToast('error', 'Failed to bulk approve.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const pendingLogs = logbooks.filter(l => l.guide_status === 'PENDING');
    const reviewedLogs = logbooks.filter(l => l.guide_status !== 'PENDING');

    return (
        <AppShell currentPage="/guide/reviews">
            {toast && (
                <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-sm font-semibold animate-slide-up ${
                    toast.type === 'success'
                        ? 'bg-emerald-900/90 border-emerald-500/30 text-emerald-300'
                        : 'bg-red-900/90 border-red-500/30 text-red-300'
                }`}>
                    {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertOctagon size={16} />}
                    {toast.msg}
                    <button onClick={() => setToast(null)} className="ml-2 opacity-60 hover:opacity-100"><X size={13} /></button>
                </div>
            )}

            <div className="mb-8 flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
                            <CheckSquare size={18} className="text-white" />
                        </div>
                        <h1 className="text-2xl font-black text-white">Logbook Reviews</h1>
                    </div>
                    <p className="text-white/40 text-sm ml-11">Review weekly submissions from your assigned groups</p>
                </div>
                <button
                    onClick={fetchAllLogbooks}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.05] border border-white/[0.1] text-white/70 text-sm font-bold rounded-xl hover:bg-white/10 hover:text-white transition-all"
                >
                    {isLoading ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />} 
                    Refresh
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative">
                {/* Pending Queue */}
                <div className="rounded-3xl bg-white/[0.04] border border-white/[0.08] overflow-hidden flex flex-col h-[700px]">
                    <div className="p-6 border-b border-white/[0.06] flex items-center justify-between bg-white/[0.02]">
                        <h2 className="text-sm font-bold text-white flex items-center gap-2">
                            <Clock size={16} className="text-amber-400" />
                            Pending Reviews
                        </h2>
                        <div className="flex items-center gap-3">
                            {selectedLogs.length > 0 && (
                                <button
                                    onClick={handleBulkApprove}
                                    disabled={isSubmitting}
                                    className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-lg hover:bg-emerald-500/30 transition-all border border-emerald-500/30"
                                >
                                    Approve Selected ({selectedLogs.length})
                                </button>
                            )}
                            <span className="px-3 py-1 text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg">
                                {pendingLogs.length}
                            </span>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {pendingLogs.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center">
                                <CheckCircle2 size={48} className="text-white/10 mb-4" />
                                <p className="text-sm text-white/40 font-semibold">All caught up! No pending logbooks.</p>
                            </div>
                        ) : (
                            pendingLogs.map((log) => {
                                const isSelected = selectedLogs.includes(log.log_id);
                                return (
                                    <div key={log.log_id} className="group rounded-2xl border border-white/[0.08] overflow-hidden transition-all bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/[0.15]">
                                        <div className="flex items-center w-full">
                                            <div className="pl-5 py-5 flex items-center">
                                                <input 
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={(e) => {
                                                        if (e.target.checked) setSelectedLogs(prev => [...prev, log.log_id]);
                                                        else setSelectedLogs(prev => prev.filter(id => id !== log.log_id));
                                                    }}
                                                    className="w-4 h-4 rounded border-white/20 bg-black/40 text-blue-500 focus:ring-0 cursor-pointer"
                                                />
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setReviewPanel({ isOpen: true, log });
                                                    setRemarks('');
                                                    setScores({ progress: 3, quality: 3, punctuality: 3 });
                                                }}
                                                className="flex-1 flex items-center justify-between p-5 text-left"
                                            >
                                                <div>
                                                    <p className="text-sm font-bold text-white mb-1.5 group-hover:text-purple-300 transition-colors">{log.group_name}</p>
                                                    <p className="text-xs text-amber-400/90 font-semibold">Week {log.week_number} <span className="text-white/20 mx-2">•</span> <span className="text-white/40">{new Date(log.created_at).toLocaleDateString()}</span></p>
                                                </div>
                                                <div className="p-2 rounded-xl bg-white/5 text-white/50 group-hover:bg-purple-500/20 group-hover:text-purple-300 transition-all">
                                                    <MessageSquare size={16} />
                                                </div>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* History / Reviewed Logs */}
                <div className="rounded-3xl bg-white/[0.04] border border-white/[0.08] overflow-hidden flex flex-col h-[700px] opacity-90">
                    <div className="p-6 border-b border-white/[0.06] flex items-center justify-between">
                        <h2 className="text-sm font-bold text-white flex items-center gap-2">
                            <CheckSquare size={16} className="text-emerald-400" />
                            Review History
                        </h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {reviewedLogs.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center">
                                <p className="text-sm text-white/30 font-semibold">No reviewed logbooks yet.</p>
                            </div>
                        ) : (
                            reviewedLogs.map(log => (
                                <div key={log.log_id} className="p-5 rounded-2xl border border-white/[0.05] bg-white/[0.01]">
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-sm font-bold text-white/90">{log.group_name} <span className="text-xs text-white/40 font-normal ml-2">Week {log.week_number}</span></p>
                                        <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border ${
                                            log.guide_status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                        }`}>
                                            {log.guide_status.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <p className="text-xs text-white/60 line-clamp-2 mb-3 leading-relaxed">{log.work_summary}</p>
                                    {log.guide_remarks && (
                                        <div className="bg-black/20 border border-white/[0.04] p-3 rounded-xl">
                                            <p className="text-xs text-white/50 italic leading-relaxed">{log.guide_remarks}</p>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>

            {/* Glassmorphic Review Panel (Modal) */}
            {reviewPanel.isOpen && reviewPanel.log && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    {/* Backdrop */}
                    <div 
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setReviewPanel({ isOpen: false, log: null })}
                    />
                    
                    {/* Panel */}
                    <div className="relative w-full max-w-lg h-full bg-slate-900 border-l border-white/10 shadow-2xl flex flex-col animate-slide-up transform transition-transform duration-300">
                        {/* Header */}
                        <div className="p-6 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-black text-white">{reviewPanel.log.group_name}</h2>
                                <p className="text-xs font-semibold text-amber-400 mt-1">Week {reviewPanel.log.week_number} Submission</p>
                            </div>
                            <button 
                                onClick={() => setReviewPanel({ isOpen: false, log: null })}
                                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            
                            {/* Summary */}
                            <div>
                                <h3 className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-3">Work Summary</h3>
                                <div className="p-5 rounded-2xl bg-black/40 border border-white/5">
                                    <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{reviewPanel.log.work_summary}</p>
                                </div>
                                {reviewPanel.log.evidence_url && (
                                    <a 
                                        href={reviewPanel.log.evidence_url} 
                                        target="_blank" 
                                        rel="noreferrer" 
                                        className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/10 text-blue-400 text-xs font-bold hover:bg-blue-500/20 transition-colors border border-blue-500/20"
                                    >
                                        <Link2 size={14} /> View Attached Evidence
                                    </a>
                                )}
                            </div>

                            {/* Scoring */}
                            <div>
                                <h3 className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <SlidersHorizontal size={12} /> Evaluation Scores
                                </h3>
                                <div className="space-y-5 p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                                    {[
                                        { key: 'progress', label: 'Progress Tracking' },
                                        { key: 'quality', label: 'Work Quality' },
                                        { key: 'punctuality', label: 'Punctuality & Discipline' }
                                    ].map((metric) => (
                                        <div key={metric.key}>
                                            <div className="flex justify-between text-xs font-semibold mb-2">
                                                <span className="text-white/70">{metric.label}</span>
                                                <span className="text-purple-400">{scores[metric.key as keyof typeof scores]} / 5</span>
                                            </div>
                                            <input 
                                                type="range" 
                                                min="1" max="5" step="1"
                                                value={scores[metric.key as keyof typeof scores]}
                                                onChange={(e) => setScores(prev => ({ ...prev, [metric.key]: parseInt(e.target.value) }))}
                                                className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-purple-500"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Remarks */}
                            <div>
                                <h3 className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <MessageSquare size={12} /> Detailed Remarks
                                </h3>
                                <textarea
                                    value={remarks}
                                    onChange={e => setRemarks(e.target.value)}
                                    placeholder="Add constructive feedback..."
                                    className="w-full p-4 rounded-2xl bg-black/40 border border-white/10 text-white placeholder:text-white/20 text-sm focus:outline-none focus:border-purple-500/50 transition-colors resize-none h-32"
                                />
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="p-6 border-t border-white/10 bg-white/[0.02] flex gap-3">
                            <button 
                                onClick={() => handleReview('NEEDS_REVISION')}
                                disabled={isSubmitting}
                                className="flex-1 py-3 text-sm font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-xl hover:bg-orange-500/20 transition-all disabled:opacity-50"
                            >
                                Needs Revision
                            </button>
                            <button 
                                onClick={() => handleReview('APPROVED')}
                                disabled={isSubmitting}
                                className="flex-1 py-3 text-sm font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl hover:bg-emerald-500/20 transition-all disabled:opacity-50 flex justify-center items-center gap-2"
                            >
                                <CheckCircle2 size={16} /> Approve
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppShell>
    );
};
