import React, { useState } from 'react';
import { AppShell } from '../../layouts/AppShell';
import { api } from '../../lib/apiClient';
import { useAuthStore } from '../../store/authStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
 FileText, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp,
 AlertCircle, Loader2, Tag, Search, History, Shield, Zap
} from 'lucide-react';
import { cn } from '../../lib/utils';

// ── Shared Types ─────────────────────────────────────────────────────────────

interface ApprovalEntry {
 stage: string;
 decision: string;
 comments: string | null;
 rejection_reason: string | null;
 decided_by_name: string | null;
 decided_by_email: string | null;
 created_at: string;
}

export interface Proposal {
 proposal_id: string;
 group_id: string;
 group_name: string;
 title: string;
 abstract: string | null;
 objectives: string | null;
 domain_tags: string[];
 technology_stack: string[];
 priority: number;
 approval_stage: string;
 plagiarism_score: number | null;
 created_at: string;
 updated_at: string;
 history: ApprovalEntry[];
}

// ── Shared Sub-components ────────────────────────────────────────────────────

const STAGE_COLORS: Record<string, string> = {
 PENDING: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
 GUIDE_APPROVED: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
 GUIDE_REJECTED: 'bg-red-500/15 text-red-300 border-red-500/30',
 COMMITTEE_APPROVED: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
 COMMITTEE_REJECTED: 'bg-red-500/15 text-red-300 border-red-500/30',
 COORDINATOR_REJECTED: 'bg-red-500/15 text-red-300 border-red-500/30',
 APPROVED: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
 REJECTED: 'bg-red-500/15 text-red-300 border-red-500/30',
};

const PRIORITY_LABELS: Record<number, { label: string; color: string }> = {
 1: { label: 'Priority 1', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
 2: { label: 'Priority 2', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
 3: { label: 'Priority 3', color: 'bg-teal-500/20 text-teal-300 border-teal-500/30' },
};

export function StageBadge({ stage }: { stage: string }) {
 const label = stage.replace('_', ' ').replace('COORDINATOR', 'COORD.');
 return (
 <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-md border', STAGE_COLORS[stage] || 'bg-white/[0.04] /10 text-white/50 border-white/[0.08]')}>
 {label}
 </span>
 );
}

export function PriorityBadge({ priority }: { priority: number }) {
 const p = PRIORITY_LABELS[priority];
 if (!p) return null;
 return (
 <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-md border', p.color)}>
 {p.label}
 </span>
 );
}

export function ApprovalTimeline({ history }: { history: ApprovalEntry[] }) {
 if (!history || history.length === 0) {
 return <p className="text-xs text-white/50 italic">No decisions recorded yet.</p>;
 }
 return (
 <div className="space-y-3">
 {history.map((entry, i) => (
 <div key={i} className="flex gap-3">
 <div className="flex flex-col items-center">
 <div className={cn('w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0',
 entry.decision === 'APPROVED' ? 'bg-emerald-500/20' : 'bg-red-500/20')}>
 {entry.decision === 'APPROVED'
 ? <CheckCircle2 size={12} className="text-emerald-400" />
 : <XCircle size={12} className="text-red-400" />}
 </div>
 {i < history.length - 1 && <div className="flex-1 w-px bg-white/[0.04] /10 mt-1" />}
 </div>
 <div className="pb-4 min-w-0 flex-1">
 <div className="flex items-center gap-2 flex-wrap mb-1">
 <span className={cn('text-[10px] font-bold uppercase', entry.decision === 'APPROVED' ? 'text-emerald-400' : 'text-red-400')}>
 {entry.stage} {entry.decision}
 </span>
 <span className="text-[10px] text-white/50">
 by {entry.decided_by_name || 'Unknown'} • {new Date(entry.created_at).toLocaleDateString()}
 </span>
 </div>
 {entry.comments && (
 <p className="text-xs text-white/50 bg-white/5 px-3 py-2 rounded-lg">{entry.comments}</p>
 )}
 {entry.rejection_reason && (
 <p className="text-xs text-red-400/80 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg mt-1">
 <span className="font-bold">Reason: </span>{entry.rejection_reason}
 </p>
 )}
 </div>
 </div>
 ))}
 </div>
 );
}

export function ProposalCard({
 proposal,
 expanded,
 onToggle,
 reviewAction
}: {
 proposal: Proposal;
 expanded: boolean;
 onToggle: () => void;
 reviewAction?: React.ReactNode;
}) {
 const plagiarismColor =
 proposal.plagiarism_score == null ? '' :
 proposal.plagiarism_score < 15 ? 'text-emerald-400' :
 proposal.plagiarism_score < 30 ? 'text-amber-400' : 'text-red-400';

 return (
 <div className={cn(
 'rounded-2xl border transition-all duration-200',
 expanded ? 'border-white/[0.08] bg-white/[0.04]' : 'border-white/[0.08] bg-white/[0.04] hover:border-white/[0.08]'
 )}>
 {/* Header row */}
 <button onClick={onToggle} className="w-full text-left p-5">
 <div className="flex items-start justify-between gap-4">
 <div className="flex-1 min-w-0">
 <div className="flex flex-wrap items-center gap-2 mb-2">
 <PriorityBadge priority={proposal.priority} />
 <StageBadge stage={proposal.approval_stage} />
 {proposal.plagiarism_score != null && (
 <span className={cn('text-[10px] font-bold', plagiarismColor)}>
 Plagiarism: {proposal.plagiarism_score}%
 </span>
 )}
 </div>
 <h4 className="text-sm font-bold text-white mb-1">{proposal.title}</h4>
 <p className="text-xs text-white/50">{proposal.group_name}</p>
 </div>
 <div className="flex items-center gap-3 shrink-0">
 <span className="text-[10px] text-white/50">
 {new Date(proposal.updated_at).toLocaleDateString()}
 </span>
 {expanded ? <ChevronUp size={16} className="text-white/50" /> : <ChevronDown size={16} className="text-white/50" />}
 </div>
 </div>

 {/* Tags */}
 {proposal.domain_tags?.length > 0 && (
 <div className="flex flex-wrap gap-1 mt-2">
 {proposal.domain_tags.map(tag => (
 <span key={tag} className="px-1.5 py-0.5 bg-white/5 border border-white/[0.08] rounded text-[9px] text-white/50">
 {tag}
 </span>
 ))}
 </div>
 )}
 </button>

 {/* Expanded body */}
 {expanded && (
 <div className="px-5 pb-5 border-t border-white/[0.08][0.06] pt-5 space-y-5">
 {proposal.abstract && (
 <div>
 <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2">Abstract</p>
 <p className="text-sm text-white/50 leading-relaxed">{proposal.abstract}</p>
 </div>
 )}
 {proposal.objectives && (
 <div>
 <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2">Objectives</p>
 <p className="text-sm text-white/50 leading-relaxed">{proposal.objectives}</p>
 </div>
 )}
 {proposal.technology_stack?.length > 0 && (
 <div>
 <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2">Technology Stack</p>
 <div className="flex flex-wrap gap-1.5">
 {proposal.technology_stack.map(t => (
 <span key={t} className="px-2 py-0.5 bg-indigo-500/15 border border-indigo-500/25 rounded-md text-[10px] text-indigo-300 font-semibold">
 {t}
 </span>
 ))}
 </div>
 </div>
 )}

 {/* Timeline */}
 <div>
 <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-3 flex items-center gap-1.5">
 <History size={10} /> Approval History
 </p>
 <ApprovalTimeline history={proposal.history} />
 </div>

 {/* Review action slot */}
 {reviewAction}
 </div>
 )}
 </div>
 );
}

// ── Review Form ──────────────────────────────────────────────────────────────

export function ReviewForm({ proposal, onReview, isPending }: {
 proposal: Proposal;
 onReview: (data: { proposal_id: string; decision: 'APPROVED' | 'REJECTED'; comments?: string; rejection_reason?: string; run_plagiarism?: boolean }) => void;
 isPending: boolean;
}) {
 const [comments, setComments] = useState('');
 const [rejectionReason, setRejectionReason] = useState('');
 const [runPlagiarism, setRunPlagiarism] = useState(false);

 return (
 <div className="bg-white/5 rounded-xl border border-white/[0.08] p-4 space-y-3">
 <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Your Decision</p>

 <textarea
 placeholder="Comments (optional)..."
 value={comments}
 onChange={e => setComments(e.target.value)}
 className="w-full px-3 py-2 text-xs bg-white/5 border border-white/[0.08] rounded-lg text-white placeholder-white/25 focus:outline-none focus:border-white/[0.08] resize-none h-20"
 />
 <input
 type="text"
 placeholder="Rejection reason (required if rejecting)..."
 value={rejectionReason}
 onChange={e => setRejectionReason(e.target.value)}
 className="w-full px-3 py-2 text-xs bg-white/5 border border-white/[0.08] rounded-lg text-white placeholder-white/25 focus:outline-none focus:border-white/[0.08]"
 />
 <label className="flex items-center gap-2 cursor-pointer">
 <input type="checkbox" checked={runPlagiarism} onChange={e => setRunPlagiarism(e.target.checked)} className="accent-indigo-500" />
 <span className="text-[10px] text-indigo-400/80 font-semibold flex items-center gap-1">
 <Zap size={10} /> Run plagiarism check before decision
 </span>
 </label>

 <div className="flex gap-2 pt-1">
 <button
 onClick={() => onReview({ proposal_id: proposal.proposal_id, decision: 'REJECTED', comments, rejection_reason: rejectionReason, run_plagiarism: runPlagiarism })}
 disabled={isPending || !rejectionReason.trim()}
 className="flex-1 py-2 text-xs bg-red-500/20 text-red-300 border border-red-500/30 rounded-lg font-bold hover:bg-red-500/30 transition-all disabled:opacity-40"
 >
 <XCircle size={12} className="inline mr-1" /> Reject
 </button>
 <button
 onClick={() => onReview({ proposal_id: proposal.proposal_id, decision: 'APPROVED', comments, run_plagiarism: runPlagiarism })}
 disabled={isPending}
 className="flex-1 py-2 text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg font-bold hover:bg-emerald-500/30 transition-all disabled:opacity-40"
 >
 <CheckCircle2 size={12} className="inline mr-1" /> Approve
 </button>
 </div>
 </div>
 );
}

// ── Generic Review Shell — used by Guide, Committee, Coordinator ─────────────

export function TopicReviewShell({
 currentPage,
 title,
 subtitle,
 iconColor,
 stage,
 emptyMsg,
 wrapInShell = true,
 showHeader = true,
}: {
 currentPage: string;
 title: string;
 subtitle: string;
 iconColor: string;
 stage: 'GUIDE' | 'COMMITTEE' | 'COORDINATOR';
 emptyMsg: string;
 wrapInShell?: boolean;
 showHeader?: boolean;
}) {
 const { token } = useAuthStore();
 const qc = useQueryClient();
 const [expandedId, setExpandedId] = useState<string | null>(null);
 const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
 const [searchQuery, setSearchQuery] = useState('');

 const showToast = (type: 'success' | 'error', msg: string) => {
 setToast({ type, msg });
 setTimeout(() => setToast(null), 4000);
 };

 const { data, isLoading } = useQuery({
 queryKey: ['topics', 'pending', stage],
 queryFn: () => api.getPendingTopics(token!, stage),
 enabled: !!token,
 refetchInterval: 30000,
 });

 const reviewMutation = useMutation({
 mutationFn: (reviewData: any) => api.reviewTopic(token!, reviewData),
 onSuccess: (res) => {
 qc.invalidateQueries({ queryKey: ['topics'] });
 showToast('success', res.message || 'Decision recorded');
 setExpandedId(null);
 },
 onError: (err: any) => showToast('error', err.message || 'Review failed'),
 });

 const proposals: Proposal[] = data?.proposals || [];
 const filtered = searchQuery
 ? proposals.filter(p =>
 p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
 p.group_name.toLowerCase().includes(searchQuery.toLowerCase())
 )
 : proposals;

 const content = (
 <>
 {/* Toast */}
 {toast && (
 <div className={cn(
 'fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-sm font-semibold',
 toast.type === 'success' ? 'bg-emerald-900/95 border-emerald-500/30 text-emerald-300' : 'bg-red-900/95 border-red-500/30 text-red-300'
 )}>
 {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
 {toast.msg}
 <button onClick={() => setToast(null)} className="ml-2 opacity-60 hover:opacity-100">×</button>
 </div>
 )}

 {/* Header */}
 {showHeader && (
 <div className="mb-8">
 <div className="flex items-center gap-3 mb-1">
 <div className={cn('p-2 rounded-xl', iconColor)}>
 <FileText size={18} className="text-white" />
 </div>
 <h1 className="text-2xl font-black text-white">{title}</h1>
 </div>
 <p className="text-white/50 text-sm ml-11">{subtitle}</p>
 </div>
 )}

 {/* Workflow Pipeline */}
 <div className="flex items-center gap-2 mb-6 p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08][0.06]">
 {[
 { label: 'Student Submits', active: false, done: true },
 { label: `${stage === 'GUIDE' ? 'Guide' : stage === 'COMMITTEE' ? 'Committee' : 'Coordinator'} Review`, active: true, done: false },
 { label: 'Approved', active: false, done: false },
 ].map((step, i, arr) => (
 <React.Fragment key={step.label}>
 <div className={cn('flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg',
 step.active ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
 step.done ? 'text-emerald-400' : 'text-white/50')}>
 {step.done && <CheckCircle2 size={10} />}
 {step.label}
 </div>
 {i < arr.length - 1 && <div className="flex-1 h-px bg-white/[0.04] /10" />}
 </React.Fragment>
 ))}
 </div>

 {/* Search */}
 <div className="relative mb-5">
 <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/50" />
 <input
 placeholder="Search by title or group name..."
 value={searchQuery}
 onChange={e => setSearchQuery(e.target.value)}
 className="w-full pl-9 pr-4 py-2.5 text-sm bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-white/25 focus:outline-none focus:border-white/[0.08] transition-all"
 />
 </div>

 {/* Stats */}
 <div className="grid grid-cols-3 gap-3 mb-6">
 {[
 { label: 'Pending Review', value: proposals.length, color: 'text-amber-400' },
 { label: 'Priority 1 Topics', value: proposals.filter(p => p.priority === 1).length, color: 'text-purple-400' },
 { label: 'Priority 2/3 (Cascade)', value: proposals.filter(p => p.priority > 1).length, color: 'text-blue-400' },
 ].map(stat => (
 <div key={stat.label} className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.08][0.06]">
 <p className={cn('text-3xl font-black', stat.color)}>{stat.value}</p>
 <p className="text-[10px] text-white/50 font-semibold uppercase tracking-wide mt-1">{stat.label}</p>
 </div>
 ))}
 </div>

 {/* Proposal List */}
 {isLoading ? (
 <div className="flex items-center justify-center py-16">
 <Loader2 size={32} className="animate-spin text-white/50" />
 </div>
 ) : filtered.length === 0 ? (
 <div className="text-center py-16 text-white/50">
 <CheckCircle2 size={40} className="mx-auto mb-4 opacity-30" />
 <p className="text-sm font-semibold">{emptyMsg}</p>
 </div>
 ) : (
 <div className="space-y-4">
 {filtered.map(proposal => (
 <ProposalCard
 key={proposal.proposal_id}
 proposal={proposal}
 expanded={expandedId === proposal.proposal_id}
 onToggle={() => setExpandedId(expandedId === proposal.proposal_id ? null : proposal.proposal_id)}
 reviewAction={
 <ReviewForm
 proposal={proposal}
 onReview={data => reviewMutation.mutate(data)}
 isPending={reviewMutation.isPending}
 />
 }
 />
 ))}
 </div>
 )}
 </>
 );

 return wrapInShell ? <AppShell currentPage={currentPage}>{content}</AppShell> : content;
}
