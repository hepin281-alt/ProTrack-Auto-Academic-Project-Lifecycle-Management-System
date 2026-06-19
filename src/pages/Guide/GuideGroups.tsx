import React, { useState, useEffect } from 'react';
import { AppShell } from '../../layouts/AppShell';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/apiClient';
import { useAuthStore } from '../../store/authStore';
import { Users, FileText, CheckCircle2, XCircle, Loader2, Target, X, ShieldAlert, Kanban } from 'lucide-react';
import { GroupChat } from '../../components/GroupChat';
import { GroupResources } from '../../components/GroupResources';
import { GuideMeetings } from '../../components/GuideMeetings';

import { GuidePeerEvals } from '../../components/GuidePeerEvals';
import { GuideAnnouncementsModal } from '../../components/GuideAnnouncementsModal';
import { Megaphone } from 'lucide-react';

interface Group {
 group_id: string;
 group_name: string;
 status: string;
 member_count: string | number;
 created_at: string;
}

interface Member {
 student_id: string;
 email: string;
 prn_no: string;
 roll_no: string;
 is_leader?: boolean;
}

// Removed Proposal interface as topics are handled in TopicWorkflow

export const GuideGroups: React.FC = () => {
 const { token } = useAuthStore();
 const navigate = useNavigate();
 const [groups, setGroups] = useState<Group[]>([]);
 const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
 const [members, setMembers] = useState<Member[]>([]);
 const [tasks, setTasks] = useState<any[]>([]);
 const [activeTab, setActiveTab] = useState<'DETAILS' | 'CHAT' | 'TASKS' | 'RESOURCES' | 'MEETINGS' | 'PEER_EVALS'>('DETAILS');
 
 const [isLoadingGroups, setIsLoadingGroups] = useState(false);
 const [isLoadingDetails, setIsLoadingDetails] = useState(false);
 const [isActioning, setIsActioning] = useState(false);
 const [isAnnouncing, setIsAnnouncing] = useState(false);
 const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

 const showToast = (type: 'success' | 'error', msg: string) => {
 setToast({ type, msg });
 setTimeout(() => setToast(null), 3500);
 };

 useEffect(() => {
 const fetchGroups = async () => {
 if (!token) return;
 setIsLoadingGroups(true);
 try {
 const list = await api.getGroups(token);
 setGroups(list);
 if (list.length > 0) {
 loadGroupDetails(list[0]);
 }
 } catch (err: any) {
 console.error(err);
 showToast('error', err.message || 'Failed to load groups');
 } finally {
 setIsLoadingGroups(false);
 }
 };
 fetchGroups();
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [token]);

 const loadGroupDetails = async (group: Group) => {
 if (!token) return;
 setSelectedGroup(group);
 setIsLoadingDetails(true);
 try {
 const [mList, tList] = await Promise.all([
 api.getMembers(token, group.group_id).catch((err) => { console.error('getMembers failed:', err); return []; }),
 api.getTasks(token, group.group_id).catch((err) => { console.error('getTasks failed:', err); return []; })
 ]);
 setMembers(Array.isArray(mList) ? mList : []);
 setTasks(Array.isArray(tList) ? tList : []);
 } catch (err: any) {
 console.error(err);
 showToast('error', err.message || 'Failed to load details');
 } finally {
 setIsLoadingDetails(false);
 }
 };

 // Removed redundant proposal handlers

 return (
 <AppShell currentPage="/guide/groups">
 {toast && (
 <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-sm font-semibold animate-slide-up ${
 toast.type === 'success'
 ? 'bg-emerald-900/90 border-emerald-500/30 text-emerald-300'
 : 'bg-red-900/90 border-red-500/30 text-red-300'
 }`}>
 {toast.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
 {toast.msg}
 <button onClick={() => setToast(null)} className="ml-2 opacity-60 hover:opacity-100"><X size={13} /></button>
 </div>
 )}

 <div className="mb-8 flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
 <Users size={18} className="text-white" />
 </div>
 <div>
 <h1 className="text-2xl font-black text-white">My Groups</h1>
 <p className="text-white/50 text-sm">Review groups and manage progress</p>
 </div>
 </div>
 
 <button
 onClick={() => setIsAnnouncing(true)}
 className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl shadow-lg shadow-purple-500/20 font-bold transition-all hover:scale-105 active:scale-95"
 >
 <Megaphone size={18} />
 <span>Broadcast Announcement</span>
 </button>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 
 {/* Left Panel: Group List */}
 <div className="col-span-1 rounded-2xl bg-white/[0.04] border border-white/[0.08] overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
 <div className="p-4 border-b border-white/[0.08][0.06] bg-white/[0.04] flex items-center justify-between">
 <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest">
 Assigned Groups ({groups.length})
 </h3>
 {isLoadingGroups && <Loader2 size={14} className="animate-spin text-white/50" />}
 </div>
 <div className="flex-1 overflow-y-auto p-4 space-y-2">
 {groups.length === 0 && !isLoadingGroups && (
 <div className="text-center py-8 text-white/50 text-sm font-semibold">
 No groups assigned yet.
 </div>
 )}
 {groups.map(g => (
 <button
 key={g.group_id}
 onClick={() => loadGroupDetails(g)}
 className={`w-full text-left p-4 rounded-xl border transition-all ${
 selectedGroup?.group_id === g.group_id
 ? 'bg-purple-500/10 border-purple-500/50 shadow-lg shadow-purple-500/10'
 : 'bg-white/[0.04] border-white/[0.08][0.06] hover:border-white/[0.08]'
 }`}
 >
 <h4 className={`text-sm font-bold mb-1 ${selectedGroup?.group_id === g.group_id ? 'text-purple-300' : 'text-white '}`}>
 {g.group_name}
 </h4>
 <div className="text-[10px] text-white/50 font-semibold flex justify-between uppercase tracking-wider">
 <span>{g.member_count} Members</span>
 <span>{g.status}</span>
 </div>
 </button>
 ))}
 </div>
 </div>

 {/* Right Panel: Details */}
 <div className="col-span-2 rounded-2xl bg-white/[0.04] border border-white/[0.08] overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
 {!selectedGroup ? (
 <div className="flex-1 flex flex-col items-center justify-center text-white/50">
 <Target size={48} className="mb-4 opacity-50" />
 <p className="font-semibold">Select a group to view details</p>
 </div>
 ) : isLoadingDetails ? (
 <div className="flex-1 flex items-center justify-center">
 <Loader2 size={24} className="animate-spin text-purple-500" />
 </div>
 ) : (
 <div className="flex-1 overflow-y-auto p-6">
 {/* Tabs */}
 <div className="flex gap-4 border-b border-white/[0.08] pb-2 mb-6">
 <button
 onClick={() => setActiveTab('DETAILS')}
 className={`text-sm font-bold pb-2 border-b-2 transition-colors ${activeTab === 'DETAILS' ? 'border-purple-500 text-purple-400' : 'border-transparent text-white/50 hover:text-white/50'}`}
 >
 Group Details
 </button>
 <button
 onClick={() => setActiveTab('CHAT')}
 className={`text-sm font-bold pb-2 border-b-2 transition-colors ${activeTab === 'CHAT' ? 'border-purple-500 text-purple-400' : 'border-transparent text-white/50 hover:text-white/50'}`}
 >
 Discussion
 </button>
 <button
 onClick={() => setActiveTab('TASKS')}
 className={`text-sm font-bold pb-2 border-b-2 transition-colors ${activeTab === 'TASKS' ? 'border-purple-500 text-purple-400' : 'border-transparent text-white/50 hover:text-white/50'}`}
 >
 Tasks
 </button>
 <button
 onClick={() => setActiveTab('RESOURCES')}
 className={`text-sm font-bold pb-2 border-b-2 transition-colors ${activeTab === 'RESOURCES' ? 'border-purple-500 text-purple-400' : 'border-transparent text-white/50 hover:text-white/50'}`}
 >
 Resources
 </button>
 <button
 onClick={() => setActiveTab('MEETINGS')}
 className={`text-sm font-bold pb-2 border-b-2 transition-colors ${activeTab === 'MEETINGS' ? 'border-purple-500 text-purple-400' : 'border-transparent text-white/50 hover:text-white/50'}`}
 >
 Meetings
 </button>
 <button
 onClick={() => setActiveTab('PEER_EVALS')}
 className={`text-sm font-bold pb-2 border-b-2 transition-colors ${activeTab === 'PEER_EVALS' ? 'border-purple-500 text-purple-400' : 'border-transparent text-white/50 hover:text-white/50'}`}
 >
 Peer Evals
 </button>
 </div>

 {activeTab === 'DETAILS' ? (
 <>
 <div className="mb-8">
 <h2 className="text-2xl font-black text-white mb-2">{selectedGroup.group_name}</h2>
 <p className="text-sm font-bold text-white/50 uppercase tracking-widest">Team Members ({members.length})</p>
 </div>
 
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
 {members.map(m => (
 <div key={m.student_id} className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.08][0.05] flex flex-col">
 <div className="flex items-center justify-between mb-1">
 <span className="text-sm font-bold text-white">{m.email.split('@')[0]}</span>
 {m.is_leader && <span className="bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">Leader</span>}
 </div>
 <span className="text-xs text-white/50">{m.prn_no} • {m.roll_no}</span>
 </div>
 ))}
 </div>

 </>
 ) : activeTab === 'CHAT' ? (
 <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-1 h-[600px]">
 <GroupChat groupId={selectedGroup.group_id} />
 </div>
 ) : activeTab === 'RESOURCES' ? (
 <GroupResources groupId={selectedGroup.group_id} />
 ) : activeTab === 'MEETINGS' ? (
 <GuideMeetings groupId={selectedGroup.group_id} members={members} />
 ) : activeTab === 'PEER_EVALS' ? (
 <GuidePeerEvals groupId={selectedGroup.group_id} />
 ) : activeTab === 'TASKS' ? (
 <div className="flex flex-col h-full min-h-[500px]">
 {tasks.length > 0 && (
 <div className="mb-6 bg-white/[0.04] border border-white/[0.08][0.05] p-5 rounded-2xl flex flex-col gap-3">
 <div className="flex items-center justify-between text-sm">
 <span className="font-bold text-white flex items-center gap-2">
 <Target size={16} className="text-purple-400" />
 Project Progress
 </span>
 <span className="text-white/50 font-semibold">
 {tasks.filter(t => t.status === 'DONE').length} of {tasks.length} tasks completed
 </span>
 </div>
 <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden">
 <div 
 className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-1000 ease-out"
 style={{ width: `${Math.round((tasks.filter(t => t.status === 'DONE').length / tasks.length) * 100)}%` }}
 />
 </div>
 </div>
 )}
 
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
 {[
 { id: 'TODO', label: 'To Do', color: 'border-blue-500/30 bg-blue-500/5', header: 'bg-blue-500/10 text-blue-300' },
 { id: 'IN_PROGRESS', label: 'In Progress', color: 'border-amber-500/30 bg-amber-500/5', header: 'bg-amber-500/10 text-amber-300' },
 { id: 'DONE', label: 'Done', color: 'border-emerald-500/30 bg-emerald-500/5', header: 'bg-emerald-500/10 text-emerald-300' }
 ].map(col => {
 const colTasks = tasks.filter(t => t.status === col.id);
 return (
 <div key={col.id} className={`flex flex-col rounded-2xl border ${col.color} overflow-hidden`}>
 <div className={`px-4 py-3 border-b border-white/[0.08] flex items-center justify-between ${col.header}`}>
 <h3 className="text-sm font-bold uppercase tracking-wider">{col.label}</h3>
 <span className="px-2 py-0.5 rounded-full bg-white/5 text-xs font-bold">{colTasks.length}</span>
 </div>
 <div className="p-3 flex-1 overflow-y-auto space-y-3 h-[400px]">
 {colTasks.map(task => (
 <div key={task.task_id} className="p-4 bg-white/5 border border-white/[0.08] rounded-xl relative opacity-80 cursor-default">
 <p className="text-sm font-semibold text-white mb-4 leading-relaxed">{task.title}</p>
 <div className="flex items-center justify-between mt-auto border-t border-white/[0.08] pt-3">
 <div className="flex items-center gap-2">
 {task.assignee_name || task.assigned_to ? (
 <div className="flex items-center gap-2" title={task.assignee_name || 'Assigned'}>
 <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-sm">
 <span className="text-[10px] font-bold text-white uppercase">
 {(task.assignee_name || 'U').charAt(0)}
 </span>
 </div>
 <span className="text-[10px] font-semibold text-white/50 max-w-[80px] truncate">
 {task.assignee_name ? task.assignee_name.split(' ')[0] : 'Assigned'}
 </span>
 </div>
 ) : (
 <span className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">Unassigned</span>
 )}
 </div>
 </div>
 </div>
 ))}
 {colTasks.length === 0 && (
 <div className="text-center py-10 text-white/50 text-sm font-semibold tracking-wider">
 Empty
 </div>
 )}
 </div>
 </div>
 )
 })}
 </div>
 </div>
 ) : null}
 </div>
 )}
 </div>

 </div>
 
 <style>{`
 @keyframes slide-up { from{opacity:0;transform:translateY(-12px)} to{opacity:1;transform:translateY(0)} }
 .animate-slide-up{animation:slide-up 0.3s ease-out}
 `}</style>
 
 <GuideAnnouncementsModal
 isOpen={isAnnouncing}
 onClose={() => setIsAnnouncing(false)}
 onSuccess={() => {
 setIsAnnouncing(false);
 showToast('success', 'Announcement broadcasted successfully!');
 }}
 />
 </AppShell>
 );
};
