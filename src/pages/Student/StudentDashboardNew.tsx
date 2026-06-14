import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../../layouts/AppShell';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/apiClient';
import { AlertCircle, Plus, CheckCircle, TrendingUp, Users, BookOpen, Zap, Hash, GraduationCap, Copy, CheckCheck, PenTool, GitBranch, GitCommit, CheckSquare, Clock, ArrowRight } from 'lucide-react';

interface Group {
    group_id: string;
    group_name: string;
    status: string;
    member_count: number;
    guide_email?: string | null;
}

interface Phase {
    label: string;
    status: 'current' | 'completed' | 'pending' | 'upcoming';
    dueDate: string;
}

export const StudentDashboardNew: React.FC = () => {
    const { token, user } = useAuthStore();
    const navigate = useNavigate();
    const [groups, setGroups] = useState<Group[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);
    const [scratchpad, setScratchpad] = useState('');
    const [isSavingNote, setIsSavingNote] = useState(false);
    const [timelines, setTimelines] = useState<Record<string, string>>({
        'phase1': 'Jan 31',
        'phase2': 'Mar 31',
        'phase3': 'May 31',
        'phase4': 'Jun 30',
    });
    
    // New state for extended group info
    const [activeGroupDetails, setActiveGroupDetails] = useState<any>(null);
    const [recentLogbooks, setRecentLogbooks] = useState<any[]>([]);
    const [schedules, setSchedules] = useState<any[]>([]);
    const [tasks, setTasks] = useState<any[]>([]);

    const fetchGroups = async () => {
        if (!token) return;
        try {
            setIsLoading(true);
            const data = await api.getGroups(token);
            const list = Array.isArray(data) ? data : [];
            setGroups(list);

            // Fetch details for active group if exists
            const active = list.find((g: Group) => g.status === 'ACTIVE' || g.status === 'WAITING_ALLOCATION');
            if (active) {
                try {
                    const [details, logbooks, scheds, groupTasks] = await Promise.all([
                        api.getGroupById(token, active.group_id).catch(() => null),
                        api.getLogbooks(token, active.group_id).catch(() => []),
                        api.getSchedules(token).catch(() => []),
                        api.getTasks(token, active.group_id).catch(() => [])
                    ]);
                    
                    if (details) setActiveGroupDetails(details);
                    setRecentLogbooks(Array.isArray(logbooks) ? logbooks : []);
                    setSchedules(Array.isArray(scheds) ? scheds : []);
                    setTasks(Array.isArray(groupTasks) ? groupTasks : []);
                } catch (err) {
                    console.error('Failed to load active group details', err);
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load groups');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchNote = async () => {
        try {
            if (!token) return;
            const [fetchedNote, fetchedSettings] = await Promise.all([
                api.getNote(token).catch(() => ({ content: '' })),
                api.getSettings(token).catch(() => ({}))
            ]);
            if (fetchedNote && fetchedNote.content) {
                setScratchpad(fetchedNote.content);
            }
            if (fetchedSettings.project_timelines) {
                const batchYear = (user as any)?.batch_year;
                const batchTimelines = batchYear ? fetchedSettings.project_timelines[batchYear.toString()] : null;
                setTimelines(batchTimelines || {
                    'phase1': 'Jan 31',
                    'phase2': 'Mar 31',
                    'phase3': 'May 31',
                    'phase4': 'Jun 30',
                });
            }
        } catch (err) {
            console.error('Failed to load note/settings', err);
        }
    };

    const handleSaveNote = async () => {
        try {
            if (!token) return;
            setIsSavingNote(true);
            await api.saveNote(token, scratchpad);
        } catch (err) {
            console.error('Failed to save note', err);
        } finally {
            setIsSavingNote(false);
        }
    };

    useEffect(() => {
        fetchGroups();
        if (token) {
            fetchNote();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const phases: Phase[] = [
        { label: 'Phase 1: Planning', status: 'completed', dueDate: (timelines || {})?.phase1 || 'Jan 31' },
        { label: 'Phase 2: Development', status: 'current', dueDate: (timelines || {})?.phase2 || 'Mar 31' },
        { label: 'Phase 3: Testing', status: 'upcoming', dueDate: (timelines || {})?.phase3 || 'May 31' },
        { label: 'Final Submission', status: 'upcoming', dueDate: (timelines || {})?.phase4 || 'Jun 30' },
    ];

    const activeGroup = groups.find(g => g.status === 'ACTIVE');

    const statCards = [
        {
            label: 'Current Phase',
            value: 'Phase 2',
            sub: 'Development',
            icon: TrendingUp,
            gradient: 'from-blue-500 to-cyan-500',
            glow: 'shadow-blue-500/20',
        },
        {
            label: 'Proposals',
            value: activeGroupDetails?.proposals?.length || 0,
            sub: (activeGroupDetails?.proposals || []).some((p: any) => p.is_approved) ? 'Approved' : 'Pending',
            icon: BookOpen,
            gradient: 'from-orange-500 to-amber-500',
            glow: 'shadow-orange-500/20',
        },
        {
            label: 'Guide Status',
            value: activeGroup ? 'Assigned' : 'Pending',
            sub: activeGroup?.guide_email || 'Not Assigned',
            icon: CheckCircle,
            gradient: 'from-emerald-500 to-teal-500',
            glow: 'shadow-emerald-500/20',
        },
    ];

    const isOverdue = React.useMemo(() => {
        if (!activeGroup || activeGroup.status !== 'ACTIVE') return false;
        if (recentLogbooks.length === 0) return true;
        const latest = new Date(recentLogbooks[0].created_at);
        const diffDays = (new Date().getTime() - latest.getTime()) / (1000 * 3600 * 24);
        return diffDays > 7;
    }, [activeGroup, recentLogbooks]);

    const completedPhasesCount = phases.filter(p => p.status === 'completed').length;
    const progressPercentage = (completedPhasesCount / phases.length) * 100;

    return (
        <AppShell currentPage="/student/dashboard">
            {/* Page header */}
            <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1.5">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/20">
                            <Zap size={18} className="text-white" />
                        </div>
                        <h1 className="text-2xl font-black text-white tracking-tight">
                            {(() => {
                                const hour = new Date().getHours();
                                if (hour < 12) return 'Good Morning,';
                                if (hour < 18) return 'Good Afternoon,';
                                return 'Good Evening,';
                            })()}{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
                                {user?.name?.split(' ')[0] || 'Student'}!
                            </span>
                        </h1>
                    </div>
                    <p className="text-white/50 text-sm ml-12">Track your project progress and upcoming deadlines.</p>
                </div>
                
                {/* Quick Actions */}
                <div className="flex items-center gap-3 md:ml-0 ml-12">
                    <button 
                        onClick={() => navigate('/student/logbook')}
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-semibold text-white transition-all"
                    >
                        <PenTool size={15} className="text-blue-400" />
                        Logbook
                    </button>
                    <button 
                        onClick={() => navigate('/student/tasks')}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 rounded-xl text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:-translate-y-0.5"
                    >
                        <CheckSquare size={15} />
                        My Tasks
                    </button>
                </div>
            </div>

            {isOverdue && (
                <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-start gap-4 animate-in slide-in-from-top-2">
                    <div className="p-2 bg-red-500/20 rounded-xl mt-0.5">
                        <AlertCircle className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                        <h3 className="text-red-400 font-bold text-sm">Action Required: Overdue Logbook</h3>
                        <p className="text-red-300/80 text-xs mt-1">Your group has not submitted a logbook for the current week. Please navigate to the Logbooks section and submit your progress immediately to avoid penalties.</p>
                    </div>
                </div>
            )}

            {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-300">
                    <AlertCircle size={18} />
                    <span className="text-sm">{error}</span>
                </div>
            )}

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {statCards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <div
                            key={card.label}
                            className={`relative overflow-hidden rounded-2xl p-5 bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.06] transition-all group shadow-xl ${card.glow}`}
                        >
                            <div className={`absolute top-0 right-0 w-24 h-24 rounded-full bg-gradient-to-br ${card.gradient} opacity-10 -mr-8 -mt-8 group-hover:opacity-20 transition-opacity`} />
                            <div className="flex items-start justify-between mb-3">
                                <p className="text-xs font-semibold text-white/40 uppercase tracking-widest">{card.label}</p>
                                <div className={`p-2 rounded-xl bg-gradient-to-br ${card.gradient} shadow-lg`}>
                                    <Icon size={14} className="text-white" />
                                </div>
                            </div>
                            <p className="text-3xl font-black text-white mb-1">{card.value}</p>
                            <p className="text-xs text-white/40">{card.sub}</p>
                        </div>
                    );
                })}
            </div>

            {/* Student Identity Card */}
            <div className="mb-8 rounded-2xl bg-gradient-to-r from-blue-500/10 to-purple-600/10 border border-blue-500/20 p-5">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
                            <GraduationCap size={18} className="text-white" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-0.5">Student Identity</p>
                            <p className="text-sm font-semibold text-white">{user?.email}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-6 flex-wrap">
                        {/* PRN */}
                        <div className="flex items-center gap-2">
                            <Hash size={13} className="text-blue-400" />
                            <div>
                                <p className="text-[10px] text-white/35 uppercase tracking-widest">PRN Number</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-sm font-black text-white font-mono">
                                        {(user as any)?.prn_no ?? '—'}
                                    </span>
                                    {(user as any)?.prn_no && (
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText((user as any).prn_no);
                                                setCopied(true);
                                                setTimeout(() => setCopied(false), 2000);
                                            }}
                                            className="p-1 text-white/30 hover:text-blue-400 rounded transition-colors"
                                            title="Copy PRN"
                                        >
                                            {copied ? <CheckCheck size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                        {/* Roll No */}
                        <div>
                            <p className="text-[10px] text-white/35 uppercase tracking-widest">Roll No</p>
                            <p className="text-sm font-bold text-white font-mono mt-0.5">{(user as any)?.roll_no ?? '—'}</p>
                        </div>
                        {/* Batch */}
                        <div>
                            <p className="text-[10px] text-white/35 uppercase tracking-widest">Batch Year</p>
                            <p className="text-sm font-bold text-white mt-0.5">{(user as any)?.batch_year ?? '—'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Milestone Progress Bar */}
            <div className="mb-8 rounded-2xl bg-white/[0.04] border border-white/[0.08] p-5">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                        <TrendingUp size={15} className="text-emerald-400" />
                        Overall Project Progress
                    </h2>
                    <span className="text-sm font-black text-emerald-400">{progressPercentage.toFixed(0)}%</span>
                </div>
                <div className="w-full h-3 bg-black/40 rounded-full overflow-hidden border border-white/5">
                    <div 
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-1000 ease-out" 
                        style={{ width: `${progressPercentage}%` }} 
                    />
                </div>
                <div className="flex justify-between mt-3 text-xs font-semibold text-white/40">
                    {phases.map((phase, idx) => (
                        <div key={idx} className={`text-center ${phase.status === 'completed' ? 'text-emerald-400/80' : phase.status === 'current' ? 'text-blue-300' : ''}`}>
                            {phase.label}
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column (Timeline & Scratchpad) */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Phase Timeline */}
                    <div className="rounded-2xl p-5 bg-white/[0.04] border border-white/[0.08]">
                        <h2 className="text-sm font-bold text-white mb-5 flex items-center gap-2">
                            <span className="w-1.5 h-4 rounded-full bg-gradient-to-b from-blue-400 to-purple-500 inline-block" />
                            Project Timeline
                        </h2>
                        <div className="space-y-1">
                            {phases.map((phase, idx) => (
                                <div key={idx} className="flex gap-4">
                                    <div className="flex flex-col items-center">
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${
                                            phase.status === 'completed'
                                                ? 'bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/20'
                                                : phase.status === 'current'
                                                ? 'bg-gradient-to-br from-blue-500 to-purple-500 ring-2 ring-blue-400/40 ring-offset-2 ring-offset-transparent shadow-lg shadow-blue-500/20'
                                                : 'bg-white/5 border border-white/10 text-white/40'
                                        }`}>
                                            {phase.status === 'completed' ? '✓' : idx + 1}
                                        </div>
                                        {idx < phases.length - 1 && (
                                            <div className={`w-px h-8 mt-1 ${
                                                phase.status === 'completed' ? 'bg-emerald-500/40' : 'bg-white/5'
                                            }`} />
                                        )}
                                    </div>
                                    <div className="flex-1 pb-4">
                                        <p className={`text-sm font-bold ${
                                            phase.status === 'completed'
                                                ? 'text-emerald-400'
                                                : phase.status === 'current'
                                                ? 'text-white'
                                                : 'text-white/40'
                                        }`}>{phase.label}</p>
                                        <p className="text-[11px] font-medium text-white/30 mt-1 uppercase tracking-wider flex items-center gap-1.5">
                                            <Clock size={10} />
                                            Due {phase.dueDate}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Personal Scratchpad */}
                    <div className="rounded-2xl p-5 bg-gradient-to-b from-indigo-500/[0.03] to-purple-500/[0.03] border border-indigo-500/[0.1] flex flex-col h-[280px]">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-sm font-bold text-white flex items-center gap-2">
                                <PenTool size={15} className="text-indigo-400" />
                                Scratchpad
                            </h2>
                            <button 
                                onClick={handleSaveNote}
                                disabled={isSavingNote}
                                className="text-[11px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 px-3 py-1.5 rounded-lg transition-colors"
                            >
                                {isSavingNote ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                        <textarea
                            value={scratchpad}
                            onChange={(e) => setScratchpad(e.target.value)}
                            placeholder="Jot down quick thoughts, ideas, or to-dos for your project..."
                            className="flex-1 w-full bg-black/40 border border-white/5 rounded-xl p-4 text-white focus:outline-none focus:border-indigo-500/50 resize-none text-sm placeholder:text-white/20"
                        />
                    </div>
                </div>

                {/* Right Column (Tasks, Groups, Activity) */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Kanban Tasks Overview */}
                    {activeGroup && (
                        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
                            <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
                                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                                    <CheckSquare size={16} className="text-blue-400" />
                                    Active Sprint Tasks
                                </h2>
                                <button 
                                    onClick={() => navigate('/student/tasks')}
                                    className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                                >
                                    View Board <ArrowRight size={14} />
                                </button>
                            </div>
                            <div className="p-5">
                                {tasks.length === 0 ? (
                                    <div className="text-center py-6">
                                        <p className="text-sm text-white/40">No tasks created yet.</p>
                                        <button 
                                            onClick={() => navigate('/student/tasks')}
                                            className="text-xs text-blue-400 font-semibold mt-2"
                                        >
                                            Create your first task →
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 text-center">
                                            <p className="text-2xl font-black text-white">{tasks.filter(t => t.status === 'TO_DO').length}</p>
                                            <p className="text-[10px] uppercase tracking-wider text-white/40 font-bold mt-1">To Do</p>
                                        </div>
                                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-center">
                                            <p className="text-2xl font-black text-blue-400">{tasks.filter(t => t.status === 'IN_PROGRESS').length}</p>
                                            <p className="text-[10px] uppercase tracking-wider text-blue-400/60 font-bold mt-1">In Progress</p>
                                        </div>
                                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
                                            <p className="text-2xl font-black text-emerald-400">{tasks.filter(t => t.status === 'DONE').length}</p>
                                            <p className="text-[10px] uppercase tracking-wider text-emerald-400/60 font-bold mt-1">Completed</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Groups */}
                    <div className="rounded-2xl p-5 bg-white/[0.04] border border-white/[0.08]">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-sm font-bold text-white flex items-center gap-2">
                                <Users size={15} className="text-purple-400" />
                                Your Teams
                            </h2>
                            <button 
                                onClick={() => navigate('/student/groups', { state: { openCreateModal: true } })}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold rounded-xl transition-all hover:-translate-y-0.5 active:translate-y-0"
                            >
                                <Plus size={13} />
                                New Group
                            </button>
                        </div>

                        {isLoading ? (
                            <div className="flex items-center gap-3 py-6 text-white/40">
                                <div className="w-4 h-4 border-2 border-white/20 border-t-purple-400 rounded-full animate-spin" />
                                <span className="text-sm">Loading groups...</span>
                            </div>
                        ) : groups.length === 0 ? (
                            <div className="text-center py-10">
                                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3">
                                    <Users size={20} className="text-white/20" />
                                </div>
                                <p className="text-sm text-white/40 mb-2">No groups yet</p>
                                <button 
                                    onClick={() => navigate('/student/groups', { state: { openCreateModal: true } })}
                                    className="text-xs text-purple-400 hover:text-purple-300 font-semibold transition-colors"
                                >
                                    Create your first group →
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {groups.map((group) => (
                                    <div
                                        key={group.group_id}
                                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border transition-all cursor-pointer group-hover relative overflow-hidden ${
                                            group.status === 'ACTIVE' 
                                                ? 'bg-gradient-to-r from-blue-500/10 to-purple-600/10 border-blue-500/20'
                                                : 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04]'
                                        }`}
                                    >
                                        {group.status === 'ACTIVE' && (
                                            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-400 to-purple-500" />
                                        )}
                                        <div className="pl-2">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-bold text-white">{group.group_name}</p>
                                                {group.status === 'ACTIVE' && (
                                                    <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[9px] font-black uppercase tracking-widest border border-blue-500/30">
                                                        Active Team
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs font-medium text-white/40 mt-1 flex items-center gap-2">
                                                <Users size={12} />
                                                {group.member_count}/4 members
                                                {group.guide_email && (
                                                    <>
                                                        <span className="w-1 h-1 rounded-full bg-white/20" />
                                                        Guide: {group.guide_email}
                                                    </>
                                                )}
                                            </p>
                                        </div>
                                        <div className="pl-2 sm:pl-0">
                                            <span className={`inline-block px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                                                group.status === 'ACTIVE'
                                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                    : group.status === 'WAITING_ALLOCATION'
                                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                    : 'bg-white/5 text-white/40 border-white/10'
                                            }`}>
                                                {group.status.replace('_', ' ')}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Recent Activity Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="rounded-2xl p-5 bg-white/[0.04] border border-white/[0.08]">
                            <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                                <BookOpen size={15} className="text-emerald-400" />
                                Recent Logbooks
                            </h2>
                            <div className="space-y-3">
                                {recentLogbooks.length === 0 && (
                                    <p className="text-xs text-white/30 text-center py-4">No recent logbooks.</p>
                                )}
                                {recentLogbooks.slice(0, 3).map((log) => (
                                    <div key={log.log_id} className="flex flex-col gap-2 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-bold text-white/90">
                                                Week {log.week_number}
                                            </p>
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${
                                                log.guide_status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                log.guide_status === 'REJECTED' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                                                'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                            }`}>
                                                {log.guide_status}
                                            </span>
                                        </div>
                                        {log.guide_remarks && (
                                            <p className="text-xs font-medium text-white/40 bg-black/40 p-2 rounded-lg border border-white/5">
                                                "{log.guide_remarks}"
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {schedules.length > 0 && (
                            <div className="rounded-2xl p-5 bg-gradient-to-br from-blue-900/20 to-indigo-900/20 border border-blue-500/20 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                                <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-4 relative z-10">
                                    <Zap size={15} className="text-yellow-400" />
                                    Next Presentation
                                </h2>
                                <div className="space-y-3 relative z-10">
                                    {schedules.slice(0, 1).map((sched: any) => {
                                        const dateObj = new Date(sched.presentation_time);
                                        return (
                                            <div key={sched.schedule_id} className="p-4 rounded-xl bg-white/5 border border-white/10">
                                                <p className="text-sm font-bold text-white mb-2">{sched.phase.replace('_', ' ')}</p>
                                                <div className="flex items-center gap-3 text-xs font-medium text-white/60 mb-2">
                                                    <Clock size={12} className="text-blue-400" />
                                                    {dateObj.toLocaleDateString()} at {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                                <div className="flex items-center gap-3 text-xs font-medium text-white/60">
                                                    <BookOpen size={12} className="text-purple-400" />
                                                    Venue: {sched.venue}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </AppShell>
    );
};
