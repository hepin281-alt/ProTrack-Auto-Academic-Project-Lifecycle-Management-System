import React, { useState, useCallback } from 'react';
import { AppShell } from '../../layouts/AppShell';
import { api } from '../../lib/apiClient';
import { useAuthStore } from '../../store/authStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Target, Users, Loader2, CheckCircle2, X, AlertCircle,
    Zap, RefreshCw, ChevronDown, ChevronUp, History,
    Star, BarChart2, Sparkles, Shield, TriangleAlert
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PendingGroup {
    group_id: string;
    group_name: string;
    member_count: string | number;
    created_at: string;
    domain_tags: string[];
    preferred_guide_id: string | null;
}

interface ScoredGuide {
    faculty_id: string;
    full_name: string;
    email: string;
    expertise_tags: string[];
    current_workload: number;
    max_workload: number;
    avg_rating: number;
    score: number;
    score_breakdown: {
        expertise_match: number;
        workload_score: number;
        preference_score: number;
        performance_score: number;
    };
}

interface AuditEntry {
    audit_id: string;
    action: string;
    notes: string | null;
    score_breakdown: any;
    created_at: string;
    group_name: string;
    guide_name: string | null;
    guide_email: string | null;
    performed_by_name: string | null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScoreBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
    const pct = Math.round((value / max) * 100);
    return (
        <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-semibold">
                <span className="text-white/50">{label}</span>
                <span className="text-white/70">{value.toFixed(1)} / {max}</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}

function ActionBadge({ action }: { action: string }) {
    const map: Record<string, string> = {
        AUTO_ASSIGNED: 'bg-blue-500/20 text-blue-300',
        MANUAL_OVERRIDE: 'bg-amber-500/20 text-amber-300',
        UNASSIGNED: 'bg-red-500/20 text-red-300',
        BATCH: 'bg-purple-500/20 text-purple-300',
    };
    return (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${map[action] || 'bg-white/10 text-white/50'}`}>
            {action.replace('_', ' ')}
        </span>
    );
}

function Toast({ toast, onClose }: { toast: { type: 'success' | 'error'; msg: string } | null; onClose: () => void }) {
    if (!toast) return null;
    return (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-sm font-semibold animate-in slide-in-from-top-4 duration-300 ${
            toast.type === 'success'
                ? 'bg-emerald-900/95 border-emerald-500/30 text-emerald-300'
                : 'bg-red-900/95 border-red-500/30 text-red-300'
        }`}>
            {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {toast.msg}
            <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100"><X size={13} /></button>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type ActiveTab = 'allocate' | 'audit' | 'ratings';

export const CoordinatorAllocations: React.FC = () => {
    const { token } = useAuthStore();
    const qc = useQueryClient();

    const [selectedGroup, setSelectedGroup] = useState<PendingGroup | null>(null);
    const [expandedGuideId, setExpandedGuideId] = useState<string | null>(null);
    const [overrideNotes, setOverrideNotes] = useState('');
    const [isOverride, setIsOverride] = useState(false);
    const [activeTab, setActiveTab] = useState<ActiveTab>('allocate');
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
    const [ratingGuideId, setRatingGuideId] = useState('');
    const [ratingValue, setRatingValue] = useState(5);
    const [ratingComments, setRatingComments] = useState('');
    const [batchResults, setBatchResults] = useState<any[] | null>(null);

    const showToast = useCallback((type: 'success' | 'error', msg: string) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 4000);
    }, []);

    // ── Queries ──────────────────────────────────────────────────────────────

    const { data: pendingData, isLoading: loadingPending } = useQuery({
        queryKey: ['allocation', 'pending'],
        queryFn: () => api.getPendingAllocation(token!),
        enabled: !!token,
        refetchInterval: 30000,
    });

    const { data: rankedData, isLoading: loadingRanked } = useQuery({
        queryKey: ['allocation', 'rank', selectedGroup?.group_id],
        queryFn: () => api.getRankedGuides(token!, selectedGroup!.group_id),
        enabled: !!token && !!selectedGroup,
    });

    const { data: auditData, isLoading: loadingAudit } = useQuery({
        queryKey: ['allocation', 'audit'],
        queryFn: () => api.getAllocationAudit(token!),
        enabled: !!token && activeTab === 'audit',
    });

    const { data: ratingsData } = useQuery({
        queryKey: ['allocation', 'ratings'],
        queryFn: () => api.getGuideRatings(token!),
        enabled: !!token && activeTab === 'ratings',
    });

    // ── Mutations ────────────────────────────────────────────────────────────

    const assignMutation = useMutation({
        mutationFn: ({ guideId }: { guideId: string }) =>
            api.assignGuide(token!, selectedGroup!.group_id, guideId, overrideNotes || undefined, isOverride),
        onSuccess: (_, vars) => {
            qc.invalidateQueries({ queryKey: ['allocation'] });
            qc.invalidateQueries({ queryKey: ['groups'] });
            showToast('success', `Guide assigned to ${selectedGroup?.group_name}`);
            setSelectedGroup(null);
            setOverrideNotes('');
            setIsOverride(false);
        },
        onError: (err: any) => showToast('error', err.message || 'Assignment failed'),
    });

    const batchMutation = useMutation({
        mutationFn: () => api.batchAllocate(token!),
        onSuccess: (data) => {
            qc.invalidateQueries({ queryKey: ['allocation'] });
            qc.invalidateQueries({ queryKey: ['groups'] });
            setBatchResults(data.results);
            showToast('success', data.message);
        },
        onError: (err: any) => showToast('error', err.message || 'Batch allocation failed'),
    });

    const unassignMutation = useMutation({
        mutationFn: (groupId: string) => api.unassignGuide(token!, groupId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['allocation'] });
            qc.invalidateQueries({ queryKey: ['groups'] });
            showToast('success', 'Guide unassigned');
        },
        onError: (err: any) => showToast('error', err.message || 'Unassign failed'),
    });

    const ratingMutation = useMutation({
        mutationFn: () => api.submitGuideRating(token!, ratingGuideId, ratingValue, ratingComments),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['allocation', 'ratings'] });
            showToast('success', 'Rating saved');
            setRatingGuideId(''); setRatingComments('');
        },
        onError: (err: any) => showToast('error', err.message || 'Rating failed'),
    });

    // ── Derived ──────────────────────────────────────────────────────────────

    const pendingGroups: PendingGroup[] = pendingData?.groups || [];
    const rankedGuides: ScoredGuide[] = rankedData?.ranked || [];
    const auditLogs: AuditEntry[] = auditData?.logs || [];
    const ratings: any[] = ratingsData?.ratings || [];

    const tabs: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
        { id: 'allocate', label: 'Allocate', icon: <Target size={14} /> },
        { id: 'audit', label: 'Audit Log', icon: <History size={14} /> },
        { id: 'ratings', label: 'Guide Ratings', icon: <Star size={14} /> },
    ];

    return (
        <AppShell currentPage="/coordinator/allocations">
            <Toast toast={toast} onClose={() => setToast(null)} />

            {/* Header */}
            <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-red-500">
                            <Target size={18} className="text-white" />
                        </div>
                        <h1 className="text-2xl font-black text-white">Guide Allocations</h1>
                    </div>
                    <p className="text-white/40 text-sm ml-11">
                        AI-powered guide assignment with expertise matching and workload balancing
                    </p>
                </div>

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => batchMutation.mutate()}
                    disabled={batchMutation.isPending || pendingGroups.length === 0}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-purple-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed relative overflow-hidden"
                >
                    <div className="absolute inset-0 bg-white/20 hover:bg-transparent transition-colors duration-300 pointer-events-none" />
                    {batchMutation.isPending
                        ? <Loader2 size={14} className="animate-spin" />
                        : <Sparkles size={14} />
                    }
                    Run Auto-Allocate Algorithm ({pendingGroups.length})
                </motion.button>
            </div>

            {/* Batch Results Summary */}
            {batchResults && (
                <div className="mb-6 p-4 rounded-2xl bg-purple-900/30 border border-purple-500/20">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-purple-300 flex items-center gap-2">
                            <BarChart2 size={14} /> Batch Results
                        </h3>
                        <button onClick={() => setBatchResults(null)} className="text-white/30 hover:text-white">
                            <X size={14} />
                        </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {['ASSIGNED', 'NO_GUIDE_AVAILABLE'].map(s => (
                            <div key={s} className="p-3 rounded-xl bg-white/5 text-center">
                                <p className="text-2xl font-black text-white">
                                    {batchResults.filter(r => r.status === s).length}
                                </p>
                                <p className="text-[10px] text-white/40 uppercase font-semibold">{s.replace('_', ' ')}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 mb-6 p-1 bg-white/[0.03] rounded-xl border border-white/[0.06] w-fit">
                {tabs.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id)}
                        className={cn(
                            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
                            activeTab === t.id
                                ? 'bg-white/10 text-white shadow'
                                : 'text-white/40 hover:text-white/70'
                        )}
                    >
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            {/* ── ALLOCATE TAB ── */}
            {activeTab === 'allocate' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Pending Groups */}
                    <div className="flex flex-col rounded-2xl bg-white/[0.04] border border-white/[0.08] overflow-hidden" style={{ maxHeight: 'calc(100vh - 18rem)' }}>
                        <div className="p-4 border-b border-white/[0.06] bg-white/[0.02] flex justify-between items-center">
                            <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest">
                                Pending Groups
                            </h3>
                            <span className="bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                {pendingGroups.length} WAITING
                            </span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {loadingPending && (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 size={24} className="animate-spin text-white/30" />
                                </div>
                            )}
                            {!loadingPending && pendingGroups.length === 0 && (
                                <div className="text-center py-12 text-white/30">
                                    <CheckCircle2 size={32} className="mx-auto mb-3 opacity-30" />
                                    <p className="text-sm">All groups are allocated!</p>
                                </div>
                            )}
                            {pendingGroups.map(group => (
                                <motion.div
                                    layout
                                    key={group.group_id}
                                    onDragOver={(e: React.DragEvent) => {
                                        e.preventDefault();
                                        if (selectedGroup?.group_id === group.group_id) {
                                            e.currentTarget.classList.add('bg-orange-500/20');
                                        }
                                    }}
                                    onDragLeave={(e: React.DragEvent) => {
                                        e.currentTarget.classList.remove('bg-orange-500/20');
                                    }}
                                    onDrop={(e: React.DragEvent) => {
                                        e.preventDefault();
                                        e.currentTarget.classList.remove('bg-orange-500/20');
                                        const guideId = e.dataTransfer.getData('guideId');
                                        if (guideId && selectedGroup?.group_id === group.group_id) {
                                            assignMutation.mutate({ guideId });
                                        }
                                    }}
                                >
                                    <button
                                        onClick={() => { setSelectedGroup(group); setExpandedGuideId(null); }}
                                        className={cn(
                                            'w-full text-left p-4 rounded-xl border transition-all',
                                            selectedGroup?.group_id === group.group_id
                                                ? 'bg-orange-500/10 border-orange-500/40 shadow-lg shadow-orange-500/10 ring-2 ring-orange-500/20 ring-offset-2 ring-offset-[#09090b]'
                                                : 'bg-white/[0.02] border-white/[0.06] hover:border-white/20'
                                        )}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className={cn(
                                                'text-sm font-bold',
                                                selectedGroup?.group_id === group.group_id ? 'text-orange-300' : 'text-white'
                                            )}>
                                                {group.group_name}
                                            </h4>
                                            <span className="flex items-center gap-1 text-[10px] text-white/40">
                                                <Users size={10} /> {group.member_count}
                                            </span>
                                        </div>
                                        {selectedGroup?.group_id === group.group_id && (
                                            <div className="text-[10px] font-semibold text-orange-400 mb-2 px-2 py-1 bg-orange-500/10 rounded-md inline-block">
                                                Drop guide here to assign
                                            </div>
                                        )}
                                        {group.domain_tags?.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {group.domain_tags.map(tag => (
                                                    <span key={tag} className="px-1.5 py-0.5 bg-orange-500/10 border border-orange-500/20 rounded text-[9px] text-orange-300/80">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        {!group.domain_tags?.length && (
                                            <p className="text-[10px] text-white/25 mt-1 italic">No proposal submitted yet</p>
                                        )}
                                    </button>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Ranked Guides Panel */}
                    <div className="flex flex-col rounded-2xl bg-white/[0.04] border border-white/[0.08] overflow-hidden" style={{ maxHeight: 'calc(100vh - 18rem)' }}>
                        <div className="p-4 border-b border-white/[0.06] bg-white/[0.02] flex justify-between items-center">
                            <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest flex items-center gap-2">
                                <Zap size={12} className="text-indigo-400" />
                                {selectedGroup ? `AI Rankings for "${selectedGroup.group_name}"` : 'Select a group'}
                            </h3>
                            {rankedGuides.length > 0 && (
                                <div className="flex items-center gap-2">
                                    {selectedGroup && rankedGuides.length > 0 && (
                                        <button
                                            onClick={() => assignMutation.mutate({ guideId: rankedGuides[0].faculty_id })}
                                            disabled={assignMutation.isPending}
                                            className="px-3 py-1 bg-indigo-500/20 text-indigo-300 text-[10px] font-bold rounded-lg hover:bg-indigo-500/30 transition-all flex items-center gap-1"
                                        >
                                            <Zap size={10} /> Auto-Pick Top
                                        </button>
                                    )}
                                    <span className="bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                        {rankedGuides.length} RANKED
                                    </span>
                                </div>
                            )}
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {!selectedGroup && (
                                <div className="text-center py-12 text-white/20">
                                    <Target size={32} className="mx-auto mb-3" />
                                    <p className="text-sm">Select a pending group to see AI-ranked guide recommendations</p>
                                </div>
                            )}
                            {selectedGroup && loadingRanked && (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 size={24} className="animate-spin text-indigo-400" />
                                </div>
                            )}
                            {selectedGroup && !loadingRanked && rankedGuides.length === 0 && (
                                <div className="text-center py-12 text-red-300/50">
                                    <AlertCircle size={32} className="mx-auto mb-3" />
                                    <p className="text-sm">No available guides with open slots</p>
                                </div>
                            )}
                            {rankedGuides.map((guide, idx) => {
                                const isExpanded = expandedGuideId === guide.faculty_id;
                                const isTop = idx === 0;
                                return (
                                    <motion.div
                                        layout
                                        draggable
                                        onDragStart={(e: any) => {
                                            e.dataTransfer.setData('guideId', guide.faculty_id);
                                            e.currentTarget.style.opacity = '0.5';
                                        }}
                                        onDragEnd={(e: any) => {
                                            e.currentTarget.style.opacity = '1';
                                        }}
                                        key={guide.faculty_id}
                                        className={cn(
                                            'rounded-xl border transition-all cursor-grab active:cursor-grabbing',
                                            isTop ? 'border-indigo-500/40 bg-indigo-500/5 hover:border-indigo-500/60' : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.15]'
                                        )}
                                    >
                                        {/* Guide Header */}
                                        <div className="p-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        {isTop && <Sparkles size={12} className="text-indigo-400 shrink-0" />}
                                                        <h4 className="text-sm font-bold text-white truncate">{guide.full_name || guide.email}</h4>
                                                    </div>
                                                    <p className="text-[10px] text-white/40">{guide.email}</p>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <div className={cn(
                                                        'text-center px-3 py-1.5 rounded-lg',
                                                        guide.score >= 70 ? 'bg-emerald-500/15 text-emerald-300' :
                                                        guide.score >= 40 ? 'bg-amber-500/15 text-amber-300' :
                                                        'bg-red-500/15 text-red-300'
                                                    )}>
                                                        <p className="text-xl font-black">{guide.score.toFixed(0)}</p>
                                                        <p className="text-[9px] font-semibold opacity-70">/ 100</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Tags */}
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {guide.expertise_tags?.slice(0, 5).map(tag => (
                                                    <span key={tag} className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[9px] text-white/50">
                                                        {tag}
                                                    </span>
                                                ))}
                                                <span className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[9px] text-white/40">
                                                    {guide.current_workload}/{guide.max_workload} groups
                                                </span>
                                            </div>

                                            {/* Actions Row */}
                                            <div className="flex items-center gap-2 mt-3">
                                                <button
                                                    onClick={() => assignMutation.mutate({ guideId: guide.faculty_id })}
                                                    disabled={assignMutation.isPending}
                                                    className="flex-1 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold rounded-lg transition-all disabled:opacity-50"
                                                >
                                                    {assignMutation.isPending ? <Loader2 size={12} className="animate-spin mx-auto" /> : 'Assign'}
                                                </button>
                                                <button
                                                    onClick={() => setExpandedGuideId(isExpanded ? null : guide.faculty_id)}
                                                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all"
                                                >
                                                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Expanded Score Breakdown */}
                                        {isExpanded && (
                                            <div className="px-4 pb-4 pt-0 border-t border-white/[0.06] space-y-2">
                                                <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-3 pt-3">Score Breakdown</p>
                                                <ScoreBar label="Expertise Match (40 pts)" value={guide.score_breakdown.expertise_match} max={40} color="bg-indigo-500" />
                                                <ScoreBar label="Workload Score (30 pts)" value={guide.score_breakdown.workload_score} max={30} color="bg-emerald-500" />
                                                <ScoreBar label="Student Preference (20 pts)" value={guide.score_breakdown.preference_score} max={20} color="bg-amber-500" />
                                                <ScoreBar label="Past Performance (10 pts)" value={guide.score_breakdown.performance_score} max={10} color="bg-rose-500" />

                                                {/* Override toggle */}
                                                <div className="pt-3 space-y-2">
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={isOverride}
                                                            onChange={e => setIsOverride(e.target.checked)}
                                                            className="accent-amber-500"
                                                        />
                                                        <span className="text-[10px] text-amber-400/80 font-semibold flex items-center gap-1">
                                                            <Shield size={10} /> Allow override (even if at capacity)
                                                        </span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        placeholder="Override reason (optional)..."
                                                        value={overrideNotes}
                                                        onChange={e => setOverrideNotes(e.target.value)}
                                                        className="w-full px-3 py-2 text-xs bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/20 focus:outline-none focus:border-white/30"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* ── AUDIT LOG TAB ── */}
            {activeTab === 'audit' && (
                <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] overflow-hidden">
                    <div className="p-4 border-b border-white/[0.06] bg-white/[0.02] flex justify-between items-center">
                        <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest flex items-center gap-2">
                            <History size={12} /> Allocation Audit Trail
                        </h3>
                        <button onClick={() => qc.invalidateQueries({ queryKey: ['allocation', 'audit'] })}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all">
                            <RefreshCw size={12} />
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        {loadingAudit ? (
                            <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-white/30" /></div>
                        ) : auditLogs.length === 0 ? (
                            <div className="text-center py-12 text-white/30 text-sm">No allocation events recorded yet.</div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/[0.06]">
                                        {['Timestamp', 'Action', 'Group', 'Guide', 'Score', 'By', 'Notes'].map(h => (
                                            <th key={h} className="text-left px-4 py-3 text-[10px] font-bold text-white/30 uppercase tracking-wider">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {auditLogs.map(log => (
                                        <tr key={log.audit_id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                                            <td className="px-4 py-3 text-[11px] text-white/40 whitespace-nowrap">
                                                {new Date(log.created_at).toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3"><ActionBadge action={log.action} /></td>
                                            <td className="px-4 py-3 text-xs font-semibold text-white">{log.group_name}</td>
                                            <td className="px-4 py-3 text-xs text-white/60">{log.guide_name || '—'}</td>
                                            <td className="px-4 py-3">
                                                {log.score_breakdown?.final_score != null
                                                    ? <span className="text-xs font-bold text-indigo-300">{Number(log.score_breakdown.final_score).toFixed(1)}</span>
                                                    : <span className="text-white/20">—</span>
                                                }
                                            </td>
                                            <td className="px-4 py-3 text-[11px] text-white/40">{log.performed_by_name || '—'}</td>
                                            <td className="px-4 py-3 text-[11px] text-white/40 max-w-[200px] truncate">{log.notes || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {/* ── RATINGS TAB ── */}
            {activeTab === 'ratings' && (
                <div className="space-y-6">
                    {/* Submit Rating */}
                    <div className="p-6 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
                        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Star size={14} className="text-amber-400" /> Submit Guide Rating</h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <input
                                placeholder="Guide User ID"
                                value={ratingGuideId}
                                onChange={e => setRatingGuideId(e.target.value)}
                                className="px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-white/30"
                            />
                            <div className="flex items-center gap-2">
                                {[1, 2, 3, 4, 5].map(n => (
                                    <button key={n} onClick={() => setRatingValue(n)}
                                        className={cn('w-8 h-8 rounded-lg text-sm font-bold transition-all', ratingValue >= n ? 'bg-amber-500 text-white' : 'bg-white/5 text-white/30')}>
                                        {n}
                                    </button>
                                ))}
                            </div>
                            <input
                                placeholder="Comments (optional)"
                                value={ratingComments}
                                onChange={e => setRatingComments(e.target.value)}
                                className="px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-white/30"
                            />
                            <button
                                onClick={() => ratingMutation.mutate()}
                                disabled={!ratingGuideId || ratingMutation.isPending}
                                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-40"
                            >
                                {ratingMutation.isPending ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Submit Rating'}
                            </button>
                        </div>
                    </div>

                    {/* Ratings Table */}
                    <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] overflow-hidden">
                        <div className="p-4 border-b border-white/[0.06]">
                            <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest">Rating History</h3>
                        </div>
                        {ratings.length === 0 ? (
                            <div className="text-center py-12 text-white/30 text-sm">No ratings submitted yet.</div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/[0.06]">
                                        {['Guide', 'Email', 'Rating', 'Comments', 'Year', 'Date'].map(h => (
                                            <th key={h} className="text-left px-4 py-3 text-[10px] font-bold text-white/30 uppercase tracking-wider">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {ratings.map((r: any) => (
                                        <tr key={r.rating_id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                                            <td className="px-4 py-3 text-xs font-semibold text-white">{r.guide_name}</td>
                                            <td className="px-4 py-3 text-[11px] text-white/50">{r.guide_email}</td>
                                            <td className="px-4 py-3">
                                                <span className="flex items-center gap-1 text-amber-400 font-bold text-sm">
                                                    <Star size={12} fill="currentColor" /> {Number(r.rating).toFixed(1)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-[11px] text-white/40 max-w-[200px] truncate">{r.comments || '—'}</td>
                                            <td className="px-4 py-3 text-[11px] text-white/40">{r.academic_year}</td>
                                            <td className="px-4 py-3 text-[11px] text-white/30">{new Date(r.created_at).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}
        </AppShell>
    );
};
