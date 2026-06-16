import React, { useState, useEffect } from 'react';
import { AppShell } from '../layouts/AppShell';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/apiClient';
import {
 FileText, Plus, X, CheckCircle2, Clock, AlertCircle, Edit2, Trash2, Loader2, Star
} from 'lucide-react';

interface Group {
 group_id: string;
 group_name: string;
 status: string;
}

interface Proposal {
 proposal_id: string;
 group_id: string;
 title: string;
 abstract?: string;
 objectives?: string;
 domain_tags: string[];
 technology_stack: string[];
 priority: number;
 status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED';
 approval_stage: string;
 rejection_reason?: string;
 is_approved: boolean;
 created_at: string;
 updated_at: string;
}

const TopicWorkflow: React.FC = () => {
 const { token } = useAuthStore();
 const [groups, setGroups] = useState<Group[]>([]);
 const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
 const [proposals, setProposals] = useState<Proposal[]>([]);
 const [isLoading, setIsLoading] = useState(false);
 const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

 // Modal states
 const [showAddModal, setShowAddModal] = useState(false);
 const [editingProposal, setEditingProposal] = useState<Proposal | null>(null);
 
 // Form states
 const [selectedPriority, setSelectedPriority] = useState<number>(1);
 const [title, setTitle] = useState('');
 const [abstract, setAbstract] = useState('');
 const [objectives, setObjectives] = useState('');
 const [tags, setTags] = useState('');
 const [techStack, setTechStack] = useState('');

 const showToast = (type: 'success' | 'error', msg: string) => {
 setToast({ type, msg });
 setTimeout(() => setToast(null), 3500);
 };

 const fetchGroups = async () => {
 if (!token) return;
 try {
 setIsLoading(true);
 const data = await api.getGroups(token);
 const list = Array.isArray(data) ? data : [];
 setGroups(list);
 if (list.length > 0 && !selectedGroup) {
 setSelectedGroup(list[0]);
 }
 } catch (err) {
 console.error(err);
 showToast('error', 'Failed to fetch groups');
 } finally {
 setIsLoading(false);
 }
 };

 const fetchProposals = async (groupId: string) => {
 if (!token) return;
 try {
 setIsLoading(true);
 const data = await api.getGroupTopics(token, groupId);
 const pList = Array.isArray(data) ? data : (data?.proposals || []);
 setProposals(pList);
 } catch (err) {
 console.error(err);
 showToast('error', 'Failed to fetch proposals');
 } finally {
 setIsLoading(false);
 }
 };

 useEffect(() => {
 fetchGroups();
 }, []);

 useEffect(() => {
 if (selectedGroup) {
 fetchProposals(selectedGroup.group_id);
 }
 }, [selectedGroup]);

 const getAvailablePriorities = (): number[] => {
 const usedPriorities = proposals.map(p => p.priority);
 return [1, 2, 3].filter(p => !usedPriorities.includes(p));
 };

 const handleOpenAddModal = () => {
 const available = getAvailablePriorities();
 if (available.length === 0) {
 showToast('error', 'All 3 topic priorities are already submitted');
 return;
 }
 setSelectedPriority(available[0]);
 setTitle('');
 setAbstract('');
 setObjectives('');
 setTags('');
 setTechStack('');
 setEditingProposal(null);
 setShowAddModal(true);
 };

 const handleOpenEditModal = (proposal: Proposal) => {
 setEditingProposal(proposal);
 setSelectedPriority(proposal.priority);
 setTitle(proposal.title);
 setAbstract(proposal.abstract || '');
 setObjectives(proposal.objectives || '');
 setTags((proposal.domain_tags || []).join(', '));
 setTechStack((proposal.technology_stack || []).join(', '));
 setShowAddModal(true);
 };

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!selectedGroup || !title.trim()) return;

 try {
 setIsLoading(true);
 const tagArray = tags.split(',').map(t => t.trim()).filter(Boolean);
 const stackArray = techStack.split(',').map(t => t.trim()).filter(Boolean);

 const topicData = {
 priority: selectedPriority,
 title: title.trim(),
 abstract: abstract.trim(),
 objectives: objectives.trim(),
 domain_tags: tagArray,
 technology_stack: stackArray
 };

 await api.submitTopics(token!, selectedGroup.group_id, [topicData]);
 showToast('success', editingProposal ? 'Topic updated successfully!' : 'Topic submitted successfully!');

 setShowAddModal(false);
 fetchProposals(selectedGroup.group_id);
 } catch (err) {
 showToast('error', err instanceof Error ? err.message : 'Failed to submit topic');
 } finally {
 setIsLoading(false);
 }
 };

 const handleDelete = async (proposalId: string) => {
 if (!window.confirm('Are you sure you want to delete this topic proposal?')) return;
 if (!token || !selectedGroup) return;

 try {
 setIsLoading(true);
 await api.deleteProposal(token, proposalId);
 showToast('success', 'Topic deleted successfully!');
 fetchProposals(selectedGroup.group_id);
 } catch (err) {
 showToast('error', err instanceof Error ? err.message : 'Failed to delete topic');
 } finally {
 setIsLoading(false);
 }
 };

 const getStatusBadge = (proposal: Proposal) => {
 const badges = {
 PENDING: {
 bg: 'bg-amber-500/10',
 text: 'text-amber-400',
 border: 'border-amber-500/20',
 icon: <Clock size={12} />,
 label: 'Pending Review'
 },
 APPROVED: {
 bg: 'bg-emerald-500/10',
 text: 'text-emerald-400',
 border: 'border-emerald-500/20',
 icon: <CheckCircle2 size={12} />,
 label: 'Approved'
 },
 REJECTED: {
 bg: 'bg-red-500/10',
 text: 'text-red-400',
 border: 'border-red-500/20',
 icon: <X size={12} />,
 label: 'Rejected'
 },
 REVISION_REQUESTED: {
 bg: 'bg-blue-500/10',
 text: 'text-blue-400',
 border: 'border-blue-500/20',
 icon: <AlertCircle size={12} />,
 label: 'Revision Requested'
 }
 };

 const badge = badges[proposal.status];
 return (
 <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${badge.bg} ${badge.text} ${badge.border}`}>
 {badge.icon}
 {badge.label}
 </span>
 );
 };

 const getPriorityLabel = (priority: number) => {
 const labels = {
 1: 'Priority 1 — Most Preferred',
 2: 'Priority 2 — Alternate',
 3: 'Priority 3 — Fallback'
 };
 return labels[priority as keyof typeof labels] || `Priority ${priority}`;
 };

 const canEdit = (proposal: Proposal) => {
 return proposal.status === 'PENDING' || proposal.status === 'REVISION_REQUESTED';
 };

 return (
 <AppShell currentPage="/student/topics">
 {/* Toast */}
 {toast && (
 <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-sm font-semibold animate-slide-up ${
 toast.type === 'success'
 ? 'bg-emerald-900/90 border-emerald-500/30 text-emerald-300'
 : 'bg-red-900/90 border-red-500/30 text-red-300'
 }`}>
 {toast.type === 'success' ? <CheckCircle2 size={16} /> : <X size={16} />}
 {toast.msg}
 <button onClick={() => setToast(null)} className="ml-2 opacity-60 hover:opacity-100">
 <X size={13} />
 </button>
 </div>
 )}

 {/* Header */}
 <div className="mb-8">
 <div className="flex items-center justify-between mb-6">
 <div>
 <div className="flex items-center gap-3 mb-1">
 <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
 <FileText size={18} className="text-white" />
 </div>
 <h1 className="text-2xl font-black text-white">Topic Submission</h1>
 </div>
 <p className="text-white/50 text-sm ml-11">
 Submit up to 3 prioritized project topics for review
 </p>
 </div>
 {selectedGroup && proposals.length < 3 && (
 <button
 onClick={handleOpenAddModal}
 className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-600 text-white text-sm font-bold rounded-xl hover:shadow-lg hover:shadow-purple-500/25 hover:-translate-y-0.5 transition-all"
 >
 <Plus size={16} /> Add Topic
 </button>
 )}
 </div>

 {/* Group Selector */}
 {groups.length > 1 && (
 <div className="flex gap-2 overflow-x-auto pb-2">
 {groups.map(group => (
 <button
 key={group.group_id}
 onClick={() => setSelectedGroup(group)}
 className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
 selectedGroup?.group_id === group.group_id
 ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-200 border border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
 : 'bg-white/5 text-white/50 border border-white/[0.08] hover:bg-white/[0.04] /10 hover:border-white/[0.08]'
 }`}
 >
 {group.group_name}
 </button>
 ))}
 </div>
 )}
 </div>

 {/* Content */}
 {!selectedGroup ? (
 <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-16 text-center">
 <FileText size={48} className="text-white/50 mx-auto mb-4" />
 <p className="text-white/50 text-sm">
 You are not part of any group yet. Create or join a group to submit topics.
 </p>
 </div>
 ) : (
 <div className="space-y-5">
 {/* Info Banner */}
 <div className="rounded-2xl bg-blue-500/10 border border-blue-500/20 p-5">
 <div className="flex items-start gap-3">
 <AlertCircle size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
 <div className="text-sm text-blue-200">
 <p className="font-bold mb-1">SPPU Guidelines</p>
 <p className="text-blue-300/80">
 Submit up to 3 project topics in order of preference. Priority 1 is your most preferred topic.
 Once a topic is approved, the other submissions will be automatically rejected.
 </p>
 </div>
 </div>
 </div>

 {/* Proposals Grid */}
 {isLoading && proposals.length === 0 ? (
 <div className="flex items-center justify-center py-16">
 <Loader2 size={32} className="animate-spin text-white/50" />
 </div>
 ) : proposals.length === 0 ? (
 <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-16 text-center">
 <FileText size={48} className="text-white/50 mx-auto mb-4" />
 <p className="text-white/50 text-sm mb-4">No topics submitted yet</p>
 <button
 onClick={handleOpenAddModal}
 className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-500 to-pink-600 text-white text-sm font-bold rounded-xl hover:shadow-lg transition-all"
 >
 <Plus size={16} /> Submit Your First Topic
 </button>
 </div>
 ) : (
 <div className="grid grid-cols-1 gap-5">
 {[1, 2, 3].map(priority => {
 const proposal = proposals.find(p => p.priority === priority);
 
 if (!proposal) {
 return (
 <div key={priority} className="rounded-2xl bg-white/[0.04] border-2 border-dashed border-white/[0.08] p-6 text-center">
 <div className="flex items-center justify-center gap-2 mb-2">
 <Star size={16} className="text-white/50" />
 <p className="text-sm font-bold text-white/50">
 {getPriorityLabel(priority)}
 </p>
 </div>
 <p className="text-xs text-white/50 mb-3">Not submitted yet</p>
 {proposals.length < 3 && (
 <button
 onClick={() => {
 setSelectedPriority(priority);
 handleOpenAddModal();
 }}
 className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-purple-400 hover:text-purple-300 border border-purple-500/30 hover:border-purple-500/50 rounded-lg transition-all"
 >
 <Plus size={14} /> Add Topic
 </button>
 )}
 </div>
 );
 }

 return (
 <div key={proposal.proposal_id} className="group rounded-2xl bg-white/[0.04] border border-white/[0.08][0.06] hover:border-purple-500/30 hover:bg-white/[0.04] hover:shadow-[0_8px_30px_rgba(168,85,247,0.05)] transition-all overflow-hidden relative">
 {/* Subtle top gradient bar */}
 <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500/0 via-purple-500/20 to-pink-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
 <div className="p-6">
 {/* Header */}
 <div className="flex items-start justify-between gap-4 mb-4">
 <div className="flex items-center gap-2 flex-1">
 <Star size={16} className="text-purple-400" />
 <span className="text-xs font-bold text-white/50 uppercase tracking-wider">
 {getPriorityLabel(proposal.priority)}
 </span>
 </div>
 <div className="flex items-center gap-2">
 {getStatusBadge(proposal)}
 {canEdit(proposal) && (
 <div className="flex gap-1">
 <button
 onClick={() => handleOpenEditModal(proposal)}
 className="p-1.5 text-white/50 hover:text-white hover:bg-white/[0.04] /10 rounded-lg transition-all"
 title="Edit"
 >
 <Edit2 size={14} />
 </button>
 <button
 onClick={() => handleDelete(proposal.proposal_id)}
 className="p-1.5 text-white/50 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
 title="Delete"
 >
 <Trash2 size={14} />
 </button>
 </div>
 )}
 </div>
 </div>

 {/* Title */}
 <h3 className="text-lg font-bold text-white mb-3">
 {proposal.title}
 </h3>

 {/* Tags */}
 {proposal.domain_tags && proposal.domain_tags.length > 0 && (
 <div className="flex flex-wrap gap-1.5 mb-3">
 {proposal.domain_tags.map(tag => (
 <span
 key={tag}
 className="px-2.5 py-1 text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-md"
 >
 {tag}
 </span>
 ))}
 </div>
 )}

 {/* Tech Stack */}
 {proposal.technology_stack && proposal.technology_stack.length > 0 && (
 <div className="flex flex-wrap gap-1.5 mb-3">
 {proposal.technology_stack.map(tag => (
 <span
 key={tag}
 className="px-2.5 py-1 text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-md"
 >
 {tag}
 </span>
 ))}
 </div>
 )}

 {/* Abstract & Objectives */}
 <div className="space-y-2 mb-4">
 {proposal.abstract && (
 <div>
 <span className="text-[10px] font-bold text-white/50 uppercase">Abstract:</span>
 <p className="text-xs text-white/50 mt-1 line-clamp-3">{proposal.abstract}</p>
 </div>
 )}
 {proposal.objectives && (
 <div>
 <span className="text-[10px] font-bold text-white/50 uppercase">Objectives:</span>
 <p className="text-xs text-white/50 mt-1 line-clamp-2">{proposal.objectives}</p>
 </div>
 )}
 </div>

 {/* Rejection/Revision Reason */}
 {(proposal.status === 'REJECTED' || proposal.status === 'REVISION_REQUESTED') && proposal.rejection_reason && (
 <div className={`mt-4 p-3 rounded-xl border ${
 proposal.status === 'REJECTED'
 ? 'bg-red-500/5 border-red-500/20'
 : 'bg-blue-500/5 border-blue-500/20'
 }`}>
 <p className={`text-xs font-bold mb-1 ${
 proposal.status === 'REJECTED' ? 'text-red-400' : 'text-blue-400'
 }`}>
 {proposal.status === 'REJECTED' ? 'Rejection Reason:' : 'Revision Comments:'}
 </p>
 <p className="text-xs text-white/50">{proposal.rejection_reason}</p>
 </div>
 )}

 {/* Metadata */}
 <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/[0.08]">
 <span className="text-[10px] text-white/50">
 Submitted: {new Date(proposal.created_at).toLocaleDateString()}
 </span>
 {proposal.updated_at !== proposal.created_at && (
 <span className="text-[10px] text-white/50">
 Updated: {new Date(proposal.updated_at).toLocaleDateString()}
 </span>
 )}
 </div>
 </div>
 </div>
 );
 })}
 </div>
 )}
 </div>
 )}

 {/* Add/Edit Modal */}
 {showAddModal && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
 <div className="absolute inset-0 bg-white/5 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
 <div className="relative w-full max-w-2xl bg-white/[0.02] dark:bg-slate-900/95 backdrop-blur-xl border border-white/[0.08] rounded-3xl p-7 shadow-2xl">
 <h3 className="text-lg font-bold text-white mb-6">
 {editingProposal ? 'Edit Topic' : 'Submit New Topic'}
 </h3>
 <form onSubmit={handleSubmit} className="space-y-5">
 {/* Priority Selector */}
 <div>
 <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-3">
 Topic Priority
 </label>
 <div className="grid grid-cols-3 gap-3">
 {[1, 2, 3].map(p => {
 const isUsed = proposals.some(pr => pr.priority === p && pr.proposal_id !== editingProposal?.proposal_id);
 return (
 <button
 key={p}
 type="button"
 disabled={isUsed}
 onClick={() => setSelectedPriority(p)}
 className={`p-3 rounded-xl text-sm font-bold transition-all ${
 selectedPriority === p
 ? 'bg-purple-600 text-white border-2 border-purple-400'
 : isUsed
 ? 'bg-white/5 text-white/50 border border-white/[0.08] cursor-not-allowed'
 : 'bg-white/5 text-white/50 border border-white/[0.08] hover:bg-white/[0.04] /10'
 }`}
 >
 <div className="flex items-center justify-center gap-1.5 mb-1">
 <Star size={14} className={selectedPriority === p ?"text-white" :"text-purple-400 opacity-70"} />
 Priority {p}
 </div>
 <div className="text-[10px] opacity-60 font-semibold tracking-wide">
 {p === 1 ? 'Most Preferred' : p === 2 ? 'Alternate' : 'Fallback'}
 </div>
 {isUsed && <div className="text-[9px] mt-1 text-red-400 font-bold uppercase tracking-wider">Already Used</div>}
 </button>
 );
 })}
 </div>
 </div>

 {/* Title */}
 <div>
 <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">
 Project Title *
 </label>
 <input
 type="text"
 value={title}
 onChange={e => setTitle(e.target.value)}
 placeholder="e.g., AI-Powered Student Attendance System"
 className="w-full px-4 py-3 bg-white/5 border border-white/[0.08] text-white placeholder:text-white/25 rounded-xl text-sm focus:outline-none focus:border-purple-500/50 transition-all"
 required
 autoFocus={!editingProposal}
 />
 </div>

 {/* Abstract */}
 <div>
 <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">
 Abstract
 </label>
 <textarea
 value={abstract}
 onChange={e => setAbstract(e.target.value)}
 placeholder="Brief description of the project..."
 rows={3}
 className="w-full px-4 py-3 bg-white/5 border border-white/[0.08] text-white placeholder:text-white/25 rounded-xl text-sm focus:outline-none focus:border-purple-500/50 transition-all resize-none"
 />
 </div>

 {/* Objectives */}
 <div>
 <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">
 Objectives
 </label>
 <textarea
 value={objectives}
 onChange={e => setObjectives(e.target.value)}
 placeholder="Main goals of the project..."
 rows={2}
 className="w-full px-4 py-3 bg-white/5 border border-white/[0.08] text-white placeholder:text-white/25 rounded-xl text-sm focus:outline-none focus:border-purple-500/50 transition-all resize-none"
 />
 </div>

 {/* Tech Stack */}
 <div>
 <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">
 Technology Stack (comma-separated)
 </label>
 <input
 type="text"
 value={techStack}
 onChange={e => setTechStack(e.target.value)}
 placeholder="e.g., React, Node.js, PostgreSQL"
 className="w-full px-4 py-3 bg-white/5 border border-white/[0.08] text-white placeholder:text-white/25 rounded-xl text-sm focus:outline-none focus:border-purple-500/50 transition-all"
 />
 </div>

 {/* Domain Tags */}
 <div>
 <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">
 Domain Tags (comma-separated)
 </label>
 <input
 type="text"
 value={tags}
 onChange={e => setTags(e.target.value)}
 placeholder="e.g., AI, Machine Learning, Web Development"
 className="w-full px-4 py-3 bg-white/5 border border-white/[0.08] text-white placeholder:text-white/25 rounded-xl text-sm focus:outline-none focus:border-purple-500/50 transition-all"
 />
 <p className="text-[10px] text-white/50 mt-1.5">
 Help coordinators categorize your project with relevant technology domains
 </p>
 </div>

 {/* Actions */}
 <div className="flex gap-3 pt-2">
 <button
 type="button"
 onClick={() => setShowAddModal(false)}
 className="flex-1 py-2.5 text-sm text-white/50 border border-white/[0.08] rounded-xl hover:bg-white/5 font-semibold transition-all"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={isLoading || !title.trim()}
 className="flex-1 py-2.5 text-sm bg-gradient-to-r from-purple-500 to-pink-600 text-white font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-40"
 >
 {isLoading ? 'Submitting…' : editingProposal ? 'Update Topic' : 'Submit Topic'}
 </button>
 </div>
 </form>
 </div>
 </div>
 )}
 </AppShell>
 );
};

export default TopicWorkflow;
