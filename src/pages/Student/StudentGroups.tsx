import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppShell } from '../../layouts/AppShell';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/apiClient';
import {
    Users, Plus, UserPlus, FileText,
    CheckCircle2, Clock, X, ChevronRight, Loader2, UserMinus
} from 'lucide-react';
import { GroupChat } from '../../components/GroupChat';

interface Group {
    group_id: string;
    group_name: string;
    status: string;
    member_count: number;
}

interface Member {
    student_id: string;
    email: string;
    full_name?: string;
    prn_no: string;
    roll_no: string;
    is_leader: boolean;
}

// Removed Proposal interface as topics are handled in TopicWorkflow

export const StudentGroups: React.FC = () => {
    const { token, user } = useAuthStore();
    const location = useLocation();
    const navigate = useNavigate();
    const [groups, setGroups] = useState<Group[]>([]);
    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
    const [members, setMembers] = useState<Member[]>([]);
    const [availableStudents, setAvailableStudents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [selectedPrns, setSelectedPrns] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState<'DETAILS' | 'CHAT'>('DETAILS');
    const [newGroupName, setNewGroupName] = useState('');

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
            if (list.length > 0) {
                setGroups(list);
                // Preserve the currently selected group if it still exists in the list
                const updatedSelectedGroup = selectedGroup 
                    ? list.find(g => g.group_id === selectedGroup.group_id) 
                    : undefined;

                if (updatedSelectedGroup) {
                    setSelectedGroup(updatedSelectedGroup);
                } else {
                    loadGroupDetail(list[0]);
                }
            } else {
                setGroups([]);
                setSelectedGroup(null);
            }
        } catch (err) {
            console.error(err);
            showToast('error', 'Failed to fetch groups');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { 
        fetchGroups(); 
        if (location.state?.openCreateModal) {
            setShowCreateModal(true);
            // clear state so it doesn't reopen on reload
            window.history.replaceState({}, document.title);
        }
    }, [location.state]); // eslint-disable-line

    useEffect(() => {
        if (showAddMemberModal && token) {
            setSelectedPrns([]);
            api.getAvailableStudents(token)
                .then(data => setAvailableStudents(Array.isArray(data) ? data : []))
                .catch(err => console.error('Failed to fetch available students:', err));
        }
    }, [showAddMemberModal, token]);

    const loadGroupDetail = async (group: Group) => {
        setSelectedGroup(group);
        try {
            if (token) {
                const membersData = await api.getMembers(token, group.group_id);
                const mList = Array.isArray(membersData) ? membersData : [];
                setMembers(mList);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleCreateGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newGroupName.trim()) return;
        try {
            setIsLoading(true);
            if (token) {
                await api.createGroup(token, newGroupName.trim());
            }
            fetchGroups(); // Re-fetch from DB so we get the real IDs
            showToast('success', `Group "${newGroupName.trim()}" created!`);
            setShowCreateModal(false);
            setNewGroupName('');
        } catch (err) {
            showToast('error', err instanceof Error ? err.message : 'Failed to create group');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddMember = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const validSelectedPrns = selectedPrns.filter(prn => {
            const student = availableStudents.find(s => s.prn_no === prn);
            return student && student.group_id == null;
        });

        if (!selectedGroup || !token || validSelectedPrns.length === 0) {
            if (selectedPrns.length > 0) {
                showToast('error', 'Selected students are no longer available.');
                setSelectedPrns([]);
            }
            return;
        }

        try {
            setIsLoading(true);
            for (const prn of validSelectedPrns) {
                await api.addMember(token, selectedGroup.group_id, prn);
            }
            const mData = await api.getMembers(token, selectedGroup.group_id);
            setMembers(Array.isArray(mData) ? mData : []);
            fetchGroups();
            showToast('success', 'Members added successfully!');
            setShowAddMemberModal(false);
            setSelectedPrns([]);
        } catch (err) {
            showToast('error', err instanceof Error ? err.message : 'Failed to add members');
        } finally {
            setIsLoading(false);
        }
    };

    const togglePrn = (prn: string) => {
        setSelectedPrns(prev => 
            prev.includes(prn) ? prev.filter(p => p !== prn) : [...prev, prn]
        );
    };

    const handleRemoveMember = async (studentId: string) => {
        if (!selectedGroup || !token) return;
        if (!window.confirm('Are you sure you want to remove this member?')) return;
        try {
            setIsLoading(true);
            await api.removeMember(token, selectedGroup.group_id, studentId);
            const mData = await api.getMembers(token, selectedGroup.group_id);
            setMembers(Array.isArray(mData) ? mData : []);
            fetchGroups();
            showToast('success', 'Member removed successfully!');
        } catch (err) {
            showToast('error', err instanceof Error ? err.message : 'Failed to remove member');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLockGroup = async () => {
        if (!selectedGroup || !token) return;
        if (!window.confirm('Are you sure? You MUST have submitted 3 project topics (Priority 1, 2, and 3) before finalizing. This will lock your group members and send your topics for Coordinator Approval.')) return;
        try {
            setIsLoading(true);
            await api.updateGroupStatus(token, selectedGroup.group_id, 'WAITING_TOPIC_APPROVAL');
            showToast('success', 'Group finalized and submitted for Topic Approval!');
            fetchGroups(); // Re-fetch everything to update UI
        } catch (err) {
            showToast('error', err instanceof Error ? err.message : 'Failed to finalize group');
        } finally {
            setIsLoading(false);
        }
    };

    const statusColor = (status: string) => {
        if (status === 'ACTIVE') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
        if (status === 'WAITING_ALLOCATION') return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
        if (status === 'WAITING_TOPIC_APPROVAL') return 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20';
        return 'bg-white/5 text-white/40 border-white/10';
    };

    const currentUserMember = members.find(m => m.student_id === user?.user_id);
    const isLeader = currentUserMember?.is_leader;

    return (
        <AppShell currentPage="/student/groups">
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
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30">
                            <Users size={20} className="text-blue-400" />
                        </div>
                        <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">My Groups</h1>
                    </div>
                    <p className="text-white/40 text-sm ml-[52px]">Manage your project groups and team members</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-bold rounded-xl hover:shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5 transition-all"
                >
                    <Plus size={16} /> Create Group
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Group List */}
                <div className="lg:col-span-1">
                    <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] overflow-hidden">
                        <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
                            <p className="text-xs font-bold text-white/40 uppercase tracking-widest">Groups ({groups.length})</p>
                            {isLoading && <Loader2 size={13} className="animate-spin text-white/30" />}
                        </div>
                        {groups.length === 0 && !isLoading && (
                            <div className="p-8 text-center text-white/30 text-xs font-semibold">
                                You are not part of any group yet.<br/>Create one to get started!
                            </div>
                        )}
                        {groups.map(group => (
                            <button
                                key={group.group_id}
                                onClick={() => loadGroupDetail(group)}
                                className={`w-full text-left p-4 border-b border-white/[0.04] transition-all flex items-center justify-between group relative overflow-hidden ${
                                    selectedGroup?.group_id === group.group_id
                                        ? 'bg-white/[0.06]'
                                        : 'hover:bg-white/[0.02]'
                                }`}
                            >
                                {selectedGroup?.group_id === group.group_id && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-purple-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                                )}
                                <div>
                                    <p className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors">{group.group_name}</p>
                                    <p className="text-xs text-white/35 mt-0.5">{group.member_count}/4 members</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase border ${statusColor(group.status)}`}>
                                        {group.status === 'WAITING_ALLOCATION' ? 'Pending' : group.status}
                                    </span>
                                    <ChevronRight size={14} className="text-white/20 group-hover:text-white/50 transition-colors" />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Group Detail */}
                <div className="lg:col-span-2">
                    {!selectedGroup ? (
                        <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-16 text-center h-full flex flex-col items-center justify-center">
                            <Users size={36} className="text-white/10 mb-3" />
                            <p className="text-sm text-white/30">Select a group to view details</p>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {/* Tabs */}
                            <div className="flex gap-4 border-b border-white/10 pb-2 mb-4">
                                <button
                                    onClick={() => setActiveTab('DETAILS')}
                                    className={`text-sm font-bold pb-2 border-b-2 transition-colors ${activeTab === 'DETAILS' ? 'border-blue-500 text-blue-400' : 'border-transparent text-white/40 hover:text-white/70'}`}
                                >
                                    Group Details
                                </button>
                                <button
                                    onClick={() => setActiveTab('CHAT')}
                                    className={`text-sm font-bold pb-2 border-b-2 transition-colors ${activeTab === 'CHAT' ? 'border-blue-500 text-blue-400' : 'border-transparent text-white/40 hover:text-white/70'}`}
                                >
                                    Discussion
                                </button>
                            </div>

                            {activeTab === 'DETAILS' ? (
                                <>
                                    {/* Group header */}
                                    <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-5">
                                <div className="flex items-start justify-between mb-5">
                                    <div>
                                        <h2 className="text-lg font-bold text-white">{selectedGroup.group_name}</h2>
                                        <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border mt-1.5 ${statusColor(selectedGroup.status)}`}>
                                            {selectedGroup.status.replace(/_/g, ' ')}
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        {selectedGroup.status === 'FORMING' && (
                                            <button
                                                onClick={handleLockGroup}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white/60 hover:text-white border border-white/10 hover:border-white/20 rounded-xl transition-all"
                                            >
                                                Lock & Submit
                                            </button>
                                        )}
                                        {selectedGroup.status === 'FORMING' && isLeader && (
                                            <button
                                                onClick={() => setShowAddMemberModal(true)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white/60 hover:text-white border border-white/10 hover:border-white/20 rounded-xl transition-all"
                                            >
                                                <UserPlus size={13} /> Add Member
                                            </button>
                                        )}
                                        <button
                                            onClick={() => navigate('/student/topics')}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all"
                                        >
                                            <FileText size={13} /> Manage Topics
                                        </button>
                                    </div>
                                </div>

                                {/* Members */}
                                <div>
                                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-3">Team Members</p>
                                    {members.length === 0 ? (
                                        <p className="text-xs text-white/30">No members. Add members by their PRN.</p>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-2">
                                            {members.map(m => (
                                                <div key={m.student_id} className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all hover:-translate-y-0.5 hover:shadow-lg">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                                                            {m.email?.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-semibold text-white truncate flex items-center gap-1.5">
                                                                {m.full_name || m.email?.split('@')[0]}
                                                                {m.is_leader && <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30 uppercase">Leader</span>}
                                                            </p>
                                                            <p className="text-[10px] text-white/35">{m.prn_no}</p>
                                                        </div>
                                                    </div>
                                                    {isLeader && m.student_id !== user?.user_id && selectedGroup.status === 'FORMING' && (
                                                        <button 
                                                            onClick={() => handleRemoveMember(m.student_id)}
                                                            className="p-1.5 text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
                                                            title="Remove Member"
                                                        >
                                                            <UserMinus size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            </>
                            ) : (
                                <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-1 h-[600px]">
                                    <GroupChat groupId={selectedGroup.group_id} />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Create Group Modal ── */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
                    <div className="relative w-full max-w-md bg-slate-900/95 backdrop-blur-xl border border-white/15 rounded-3xl p-7 shadow-2xl">
                        <h3 className="text-lg font-bold text-white mb-6">Create New Group</h3>
                        <form onSubmit={handleCreateGroup} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Group Name</label>
                                <input
                                    type="text"
                                    value={newGroupName}
                                    onChange={e => setNewGroupName(e.target.value)}
                                    placeholder="e.g. Cloud Computing Team"
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white placeholder:text-white/25 rounded-xl text-sm focus:outline-none focus:border-white/30 transition-all"
                                    autoFocus
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowCreateModal(false)}
                                    className="flex-1 py-2.5 text-sm text-white/50 border border-white/10 rounded-xl hover:bg-white/5 font-semibold transition-all">Cancel</button>
                                <button type="submit" disabled={isLoading}
                                    className="flex-1 py-2.5 text-sm bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-40">
                                    {isLoading ? 'Creating…' : 'Create Group'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Add Member Modal ── */}
            {showAddMemberModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddMemberModal(false)} />
                    <div className="relative w-full max-w-md bg-slate-900/95 backdrop-blur-xl border border-white/15 rounded-3xl p-7 shadow-2xl">
                        <h3 className="text-lg font-bold text-white mb-6">Add Team Member</h3>
                        <form onSubmit={handleAddMember} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-3">Select Students</label>
                                <div className="max-h-56 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                    {availableStudents.map(student => {
                                        const isTaken = student.group_id != null;
                                        const isSelected = selectedPrns.includes(student.prn_no);
                                        return (
                                            <label 
                                                key={student.prn_no} 
                                                className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                                                    isTaken ? 'bg-white/5 border-white/5 opacity-50 cursor-not-allowed' : 
                                                    isSelected ? 'bg-blue-500/10 border-blue-500/30' : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/[0.07]'
                                                }`}
                                            >
                                                <div className="flex-shrink-0">
                                                    <input 
                                                        type="checkbox" 
                                                        disabled={isTaken}
                                                        checked={isSelected}
                                                        onChange={() => !isTaken && togglePrn(student.prn_no)}
                                                        className="w-4 h-4 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-0 focus:ring-offset-0 cursor-pointer disabled:cursor-not-allowed"
                                                    />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-semibold text-white truncate">
                                                        {student.full_name || student.email?.split('@')[0]}
                                                    </p>
                                                    <p className="text-[10px] text-white/40">PRN: {student.prn_no}</p>
                                                </div>
                                                {isTaken && (
                                                    <span className="text-[10px] font-medium text-amber-400/80 bg-amber-400/10 px-2 py-0.5 rounded">
                                                        Taken
                                                    </span>
                                                )}
                                            </label>
                                        );
                                    })}
                                    {availableStudents.length === 0 && (
                                        <p className="text-[10px] text-amber-400/80 mt-2 text-center py-2">No students found in your batch.</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4 border-t border-white/10 mt-4">
                                <button type="button" onClick={() => setShowAddMemberModal(false)}
                                    className="flex-1 px-4 py-2.5 text-sm font-bold text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all">
                                    Cancel
                                </button>
                                <button type="submit" disabled={isLoading || selectedPrns.length === 0}
                                    className="flex-1 px-4 py-2.5 text-sm font-bold bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                                    {isLoading ? 'Adding...' : `Add Selected (${selectedPrns.length})`}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* End of modals */}

            <style>{`
                @keyframes slide-up { from{opacity:0;transform:translateY(-12px)} to{opacity:1;transform:translateY(0)} }
                .animate-slide-up{animation:slide-up 0.3s ease-out}
            `}</style>
        </AppShell>
    );
};
