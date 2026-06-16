import React, { useState } from 'react';
import { AppShell } from '../../layouts/AppShell';
import { api } from '../../lib/apiClient';
import { useAuthStore } from '../../store/authStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TopicReviewShell, ProposalCard, StageBadge, PriorityBadge } from '../shared/TopicApprovalComponents';
import type { Proposal } from '../shared/TopicApprovalComponents';
import { BarChart2, Search, Loader2, CheckCircle2, Filter, AlertCircle, Upload } from 'lucide-react';
import { cn } from '../../lib/utils';

// ── Coordinator has 2 tabs: Review (own queue) + Overview (all groups) ────────

export const CoordinatorTopicApproval: React.FC = () => {
 const { token } = useAuthStore();
 const [activeTab, setActiveTab] = useState<'review' | 'overview' | 'compare'>('review');
 const [expandedId, setExpandedId] = useState<string | null>(null);
 const [stageFilter, setStageFilter] = useState('');
 const [compareQuery, setCompareQuery] = useState('');
 const [compareSent, setCompareSent] = useState(false);

 // Overview — all proposals
 const { data: allTopicsData, isLoading: loadingAll, isError: errorAll } = useQuery({
 queryKey: ['topics', 'all', stageFilter],
 queryFn: () => api.getAllTopics(token!, stageFilter ? { stage: stageFilter } : undefined),
 enabled: !!token && activeTab === 'overview',
 });

 // Compare — similarity search
 const { data: compareData, isLoading: loadingCompare, refetch: runCompare } = useQuery({
 queryKey: ['topics', 'compare', compareQuery],
 queryFn: () => api.compareTopics(token!, compareQuery),
 enabled: false,
 });

 const allProposals: Proposal[] = allTopicsData?.proposals || [];
 const compareResults = compareData?.results || [];

 const stageOptions = [
 { value: '', label: 'All Stages' },
 { value: 'PENDING', label: 'Pending' },
 { value: 'APPROVED', label: 'Approved' },
 { value: 'COORDINATOR_REJECTED', label: 'Rejected' },
 ];

 return (
 <AppShell currentPage="/coordinator/topics">
 {/* Header */}
 <div className="mb-6">
 <div className="flex items-center gap-3 mb-1">
 <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-red-500">
 <BarChart2 size={18} className="text-white" />
 </div>
 <h1 className="text-2xl font-black text-white">Topic Approvals — Coordinator</h1>
 </div>
 <p className="text-white/50 text-sm ml-11">Review and finalize student project proposals</p>
 </div>

 {/* Tabs */}
 <div className="flex gap-1 mb-6 p-1 bg-white/[0.04] rounded-xl border border-white/[0.08][0.06] w-fit">
 {[
 { id: 'review', label: 'My Queue' },
 { id: 'overview', label: 'All Topics' },
 { id: 'compare', label: 'Compare / Plagiarism' },
 ].map(t => (
 <button
 key={t.id}
 onClick={() => setActiveTab(t.id as any)}
 className={cn(
 'px-4 py-2 rounded-lg text-sm font-semibold transition-all',
 activeTab === t.id ? 'bg-white/[0.04] /10 text-white shadow' : 'text-white/50 hover:text-white/50'
 )}
 >
 {t.label}
 </button>
 ))}
 </div>

 {/* Review Tab — reuse shared shell */}
 {activeTab === 'review' && (
 <TopicReviewShell
 wrapInShell={false}
 showHeader={false}
 currentPage="/coordinator/topics"
 title=""
 subtitle=""
 iconColor="hidden"
 stage="COORDINATOR"
 emptyMsg="No topics awaiting your final approval."
 />
 )}

 {/* Overview Tab */}
 {activeTab === 'overview' && (
 <div className="space-y-5">
 {/* Filter */}
 <div className="flex items-center gap-3">
 <Filter size={14} className="text-white/50" />
 <select
 value={stageFilter}
 onChange={e => setStageFilter(e.target.value)}
 className="px-3 py-2 text-sm bg-white/[0.04] border border-white/[0.08][0.1] rounded-xl text-white focus:outline-none focus:border-white/[0.08] focus:bg-white/[0.04] transition-all"
 >
 {stageOptions.map(o => (
 <option key={o.value} value={o.value} className="bg-white/[0.02] dark:bg-slate-900">{o.label}</option>
 ))}
 </select>
 <span className="text-xs text-white/50">{allProposals.length} proposals</span>
 </div>

 {loadingAll ? (
 <div className="flex justify-center py-12"><Loader2 size={32} className="animate-spin text-white/50" /></div>
 ) : errorAll ? (
 <div className="flex flex-col items-center py-12 text-red-400/60">
 <AlertCircle size={32} className="mb-3" />
 <p className="text-sm">Failed to load topics. Check your connection and try again.</p>
 </div>
 ) : allProposals.length === 0 ? (
 <div className="text-center py-12 text-white/50">
 <CheckCircle2 size={36} className="mx-auto mb-3 opacity-30" />
 <p className="text-sm">No proposals found for this filter.</p>
 </div>
 ) : (
 allProposals.map(p => (
 <ProposalCard
 key={p.proposal_id}
 proposal={p}
 expanded={expandedId === p.proposal_id}
 onToggle={() => setExpandedId(expandedId === p.proposal_id ? null : p.proposal_id)}
 />
 ))
 )}
 </div>
 )}

 {/* Compare Tab */}
 {activeTab === 'compare' && (
 <div className="space-y-5">
 <div className="p-6 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
 <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
 <Search size={14} /> Topic Similarity Search
 </h3>
 <p className="text-xs text-white/50 mb-4">
 Search for similar topics across all groups to identify potential duplicates or overlap.
 </p>
 <div className="flex gap-3">
 <input
 type="text"
 placeholder="Enter a topic title to compare..."
 value={compareQuery}
 onChange={e => setCompareQuery(e.target.value)}
 onKeyDown={e => { if (e.key === 'Enter') { setCompareSent(true); runCompare(); } }}
 className="flex-1 px-4 py-2.5 text-sm bg-white/5 border border-white/[0.08] rounded-xl text-white placeholder-white/25 focus:outline-none focus:border-white/[0.08]"
 />
 <button
 onClick={() => { setCompareSent(true); runCompare(); }}
 disabled={!compareQuery.trim() || loadingCompare}
 className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl disabled:opacity-40 transition-all"
 >
 {loadingCompare ? <Loader2 size={14} className="animate-spin" /> : 'Search'}
 </button>
 </div>
 </div>

 {/* Initial empty state */}
 {!compareSent && (
 <div className="text-center py-8 text-white/50 border border-dashed border-white/[0.08][0.1] rounded-2xl">
 <Search size={32} className="mx-auto mb-3 opacity-30" />
 <p className="text-sm">Enter a topic title above to find similar projects</p>
 </div>
 )}

 {compareSent && compareResults.length > 0 && (
 <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] overflow-hidden">
 <div className="p-4 border-b border-white/[0.08][0.06]">
 <p className="text-xs font-bold text-white/50 uppercase tracking-widest">
 {compareResults.length} Similar Topics Found
 </p>
 </div>
 <div className="divide-y divide-white/[0.04]">
 {compareResults.map((r: any) => (
 <div key={r.proposal_id} className="p-4 hover:bg-white/[0.04]">
 <div className="flex items-start justify-between gap-4">
 <div>
 <div className="flex items-center gap-2 mb-1">
 <PriorityBadge priority={r.priority} />
 <StageBadge stage={r.approval_stage} />
 {r.title_similarity != null && (
 <span className={cn('text-[10px] font-bold',
 r.title_similarity > 0.7 ? 'text-red-400' :
 r.title_similarity > 0.4 ? 'text-amber-400' : 'text-emerald-400')}>
 {(r.title_similarity * 100).toFixed(0)}% similar
 </span>
 )}
 </div>
 <p className="text-sm font-semibold text-white">{r.title}</p>
 <p className="text-xs text-white/50">{r.group_name}</p>
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}
 {compareSent && compareResults.length === 0 && !loadingCompare && (
 <p className="text-center text-sm text-white/50 py-8">No similar topics found.</p>
 )}
 </div>
 )}
 </AppShell>
 );
};
