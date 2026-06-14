import React, { useState, useEffect } from 'react';
import { AppShell } from '../../layouts/AppShell';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/apiClient';
import { X, ChevronRight, Users, BookOpen, CheckCircle2, Clock, Zap, BarChart2, AlertCircle } from 'lucide-react';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

interface Group {
    group_id: string;
    group_name: string;
    status: string;
    member_count: number;
}

interface Logbook {
    log_id: string;
    week_number: number;
    work_summary: string;
    guide_status: string;
}

interface ReviewPanelState {
    isOpen: boolean;
    logbook: Logbook | null;
    groupId: string | null;
    remarks: string;
}

const DUMMY_GROUPS: Group[] = [
    { group_id: 'g1', group_name: 'AI Research Team',   status: 'ACTIVE',             member_count: 4 },
    { group_id: 'g2', group_name: 'Web Dev Squad',       status: 'ACTIVE',             member_count: 3 },
    { group_id: 'g3', group_name: 'IoT Systems Group',   status: 'WAITING_ALLOCATION', member_count: 4 },
];

const DUMMY_PENDING: Logbook[] = [
    { log_id: 'lb1', week_number: 8, work_summary: 'Integrated face recognition model with 92% accuracy. Fixed memory leak in video stream.', guide_status: 'PENDING' },
    { log_id: 'lb2', week_number: 7, work_summary: 'Implemented WebSocket server for real-time collaboration. Tested with 5 concurrent users.', guide_status: 'PENDING' },
    { log_id: 'lb3', week_number: 6, work_summary: 'Designed REST API with Express. Added JWT auth middleware and rate limiting.', guide_status: 'PENDING' },
];

const DUMMY_ACTIVITY_DATA = [
    { week: 'W1', completed: 2, pending: 5 },
    { week: 'W2', completed: 5, pending: 8 },
    { week: 'W3', completed: 9, pending: 6 },
    { week: 'W4', completed: 15, pending: 4 },
    { week: 'W5', completed: 22, pending: 3 },
    { week: 'W6', completed: 28, pending: 2 },
];

export const GuideDashboardNew: React.FC = () => {
    const { token } = useAuthStore();
    const [groups, setGroups] = useState<Group[]>(DUMMY_GROUPS);
    const [pendingLogbooks, setPendingLogbooks] = useState<Logbook[]>(DUMMY_PENDING);
    const [, setIsLoading] = useState(false);
    const [reviewPanel, setReviewPanel] = useState<ReviewPanelState>({
        isOpen: false,
        logbook: null,
        groupId: null,
        remarks: '',
    });
    const [analytics, setAnalytics] = useState<any[]>([]);

    const fetchData = async () => {
        if (!token) return;
        try {
            setIsLoading(true);
            const data = await api.getGroups(token);
            const groupList = Array.isArray(data) ? data : [];
            setGroups(groupList);

            // Fetch pending logbooks for each group
            let allPending: Logbook[] = [];
            for (const g of groupList) {
                try {
                    const logs = await api.getLogbooks(token, g.group_id, 'PENDING');
                    if (Array.isArray(logs)) {
                        allPending = [...allPending, ...logs.map((l: any) => ({ ...l, group_name: g.group_name }))];
                    }
                } catch (e) {
                    console.error('Failed to fetch logbooks for group', g.group_id);
                }
            }
            setPendingLogbooks(allPending);

            // Fetch Analytics
            try {
                const analyticsData = await api.getGuideAnalytics(token);
                setAnalytics(Array.isArray(analyticsData) ? analyticsData : []);
            } catch (e) {
                console.error('Failed to fetch analytics', e);
            }
        } catch (_err) {
            // keep dummy data on API failure
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleReviewClick = (logbook: Logbook, groupId: string) => {
        setReviewPanel({ isOpen: true, logbook, groupId, remarks: '' });
    };

    const handleReviewSubmit = async (status: 'APPROVED' | 'NEEDS_REVISION') => {
        if (!token || !reviewPanel.groupId || !reviewPanel.logbook) return;
        try {
            await api.approveLogbook(token, reviewPanel.logbook.log_id, status, reviewPanel.remarks);
            setPendingLogbooks(prev => prev.filter(l => l.log_id !== reviewPanel.logbook?.log_id));
            setReviewPanel({ isOpen: false, logbook: null, groupId: null, remarks: '' });
        } catch (_err) {
            console.error(`Failed to mark logbook as ${status}`);
        }
    };

    const gradients = [
        'from-blue-500 to-cyan-500',
        'from-purple-500 to-pink-500',
        'from-emerald-500 to-teal-500',
        'from-orange-500 to-amber-500',
    ];

    return (
        <AppShell currentPage="/guide/dashboard">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600">
                        <Zap size={18} className="text-white" />
                    </div>
                    <h1 className="text-2xl font-black text-white">Guide Dashboard</h1>
                </div>
                <p className="text-white/40 text-sm ml-11">
                    Assigned to <span className="text-white/70 font-semibold">{groups.length}</span> / 4 groups
                </p>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4 mb-8">
                {[
                    { label: 'Active Groups', value: groups.filter(g => g.status === 'ACTIVE').length, icon: Users, color: 'from-purple-500 to-pink-500' },
                    { label: 'Pending Reviews', value: pendingLogbooks.length, icon: Clock, color: 'from-amber-500 to-orange-500' },
                    { label: 'Approved Today', value: 0, icon: CheckCircle2, color: 'from-emerald-500 to-teal-500' },
                ].map(s => {
                    const Icon = s.icon;
                    return (
                        <div key={s.label} className="relative overflow-hidden rounded-2xl p-5 bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.14] transition-all group">
                            <div className={`absolute top-0 right-0 w-20 h-20 rounded-full bg-gradient-to-br ${s.color} opacity-10 -mr-6 -mt-6 group-hover:opacity-20 transition-opacity`} />
                            <div className={`inline-flex p-2 rounded-xl bg-gradient-to-br ${s.color} mb-3 shadow-lg`}>
                                <Icon size={14} className="text-white" />
                            </div>
                            <p className="text-2xl font-black text-white">{s.value}</p>
                            <p className="text-xs text-white/40 mt-1">{s.label}</p>
                        </div>
                    );
                })}
            </div>

            {/* Needs Attention Feed (Prioritized) */}
            <div className="mb-8 rounded-2xl bg-white/[0.04] border border-orange-500/[0.15] overflow-hidden shadow-[0_0_15px_rgba(249,115,22,0.05)]">
                <div className="p-5 border-b border-white/[0.06] bg-orange-500/[0.02]">
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                        <AlertCircle size={15} className="text-orange-400" />
                        Needs Attention
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/[0.06]">
                                {['Group', 'Item Type', 'Details', 'Submitted', 'Action'].map(h => (
                                    <th key={h} className="text-left py-3 px-5 text-[10px] font-bold text-white/30 uppercase tracking-widest">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {pendingLogbooks.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-12 text-white/25 text-sm">
                                        You're all caught up! 🎉
                                    </td>
                                </tr>
                            ) : (
                                pendingLogbooks.map((logbook) => (
                                    <tr key={logbook.log_id} className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors">
                                        <td className="py-4 px-5 text-sm text-white/80 font-medium">{(logbook as any).group_name || 'Group'}</td>
                                        <td className="py-4 px-5 text-sm">
                                            <span className="flex items-center gap-1.5 text-xs text-purple-300 bg-purple-500/10 px-2 py-1 rounded-md w-max">
                                                <BookOpen size={12} /> Logbook W{logbook.week_number}
                                            </span>
                                        </td>
                                        <td className="py-4 px-5 text-xs text-white/50 max-w-[200px] truncate">{logbook.work_summary}</td>
                                        <td className="py-4 px-5 text-sm text-white/40">2 hours ago</td>
                                        <td className="py-4 px-5">
                                            <button
                                                onClick={() => handleReviewClick(logbook, 'group-1')}
                                                className="flex items-center gap-1 text-xs font-bold text-orange-400 hover:text-orange-300 transition-colors bg-orange-500/10 hover:bg-orange-500/20 px-3 py-1.5 rounded-lg"
                                            >
                                                Review Now <ChevronRight size={13} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Group Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {groups.map((group, i) => (
                    <div
                        key={group.group_id}
                        className="rounded-2xl p-5 bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.07] transition-all group cursor-pointer"
                    >
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradients[i % gradients.length]} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                            <Users size={16} className="text-white" />
                        </div>
                        <h3 className="font-bold text-white text-sm mb-1 truncate">{group.group_name}</h3>
                        <p className="text-xs text-white/40 mb-4">{group.member_count} members</p>

                        {/* Progress Bar */}
                        <div className="mb-3">
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Logbooks</span>
                                <span className="text-[10px] font-bold text-white/60">8/12</span>
                            </div>
                            <div className="w-full bg-white/5 rounded-full h-1.5">
                                <div className={`bg-gradient-to-r ${gradients[i % gradients.length]} h-1.5 rounded-full`} style={{ width: '67%' }} />
                            </div>
                        </div>

                        <span className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${
                            group.status === 'ACTIVE'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                            {group.status}
                        </span>
                    </div>
                ))}

                {/* Empty Slots */}
                {Array.from({ length: Math.max(0, 4 - groups.length) }).map((_, idx) => (
                    <div
                        key={`empty-${idx}`}
                        className="rounded-2xl p-5 border-2 border-dashed border-white/[0.08] flex items-center justify-center min-h-[160px]"
                    >
                        <p className="text-xs text-white/20 text-center">Slot available</p>
                    </div>
                ))}
            </div>

            {/* Analytics Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Logbooks Approved Bar Chart */}
                {analytics.length > 0 && (
                    <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] overflow-hidden">
                        <div className="p-5 border-b border-white/[0.06]">
                            <h2 className="text-sm font-bold text-white flex items-center gap-2">
                                <BarChart2 size={15} className="text-blue-400" />
                                Approvals by Group
                            </h2>
                        </div>
                        <div className="p-5 h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analytics} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    <XAxis dataKey="group_name" stroke="rgba(255,255,255,0.5)" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis stroke="rgba(255,255,255,0.5)" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                                    <RechartsTooltip 
                                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                        contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                    />
                                    <Bar dataKey="approved_logbooks" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Approved Logbooks" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {/* Task Activity Area Chart */}
                <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] overflow-hidden">
                    <div className="p-5 border-b border-white/[0.06]">
                        <h2 className="text-sm font-bold text-white flex items-center gap-2">
                            <Zap size={15} className="text-emerald-400" />
                            Global Task Activity Burnup
                        </h2>
                    </div>
                    <div className="p-5 h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={DUMMY_ACTIVITY_DATA} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="week" stroke="rgba(255,255,255,0.5)" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="rgba(255,255,255,0.5)" fontSize={10} tickLine={false} axisLine={false} />
                                <RechartsTooltip 
                                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                />
                                <Area type="monotone" dataKey="completed" stroke="#10b981" fillOpacity={1} fill="url(#colorCompleted)" name="Completed Tasks" />
                                <Area type="monotone" dataKey="pending" stroke="#f59e0b" fillOpacity={1} fill="url(#colorPending)" name="Pending Tasks" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>



            {/* Review Slide Panel */}
            {reviewPanel.isOpen && reviewPanel.logbook && (
                <div className="fixed inset-0 z-50">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setReviewPanel({ isOpen: false, logbook: null, groupId: null, remarks: '' })}
                    />
                    <div className="absolute right-0 top-0 bottom-0 w-full max-w-lg bg-slate-900/95 backdrop-blur-xl border-l border-white/10 shadow-2xl flex flex-col">
                        <div className="flex items-center justify-between p-6 border-b border-white/[0.08]">
                            <h2 className="text-lg font-bold text-white">Review: Week {reviewPanel.logbook.week_number}</h2>
                            <button
                                onClick={() => setReviewPanel({ isOpen: false, logbook: null, groupId: null, remarks: '' })}
                                className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-5">
                            <div>
                                <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3">Work Summary</h3>
                                <div className="p-4 bg-white/[0.04] rounded-xl border border-white/[0.08]">
                                    <p className="text-sm text-white/80">{reviewPanel.logbook.work_summary}</p>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-3">Your Remarks</label>
                                <textarea
                                    value={reviewPanel.remarks}
                                    onChange={(e) => setReviewPanel({ ...reviewPanel, remarks: e.target.value })}
                                    placeholder="Provide constructive feedback..."
                                    rows={5}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white placeholder:text-white/25 rounded-xl text-sm focus:outline-none focus:border-white/25 transition-all resize-none"
                                />
                            </div>
                        </div>
                        <div className="p-6 border-t border-white/[0.08] flex gap-3">
                            <button
                                onClick={() => setReviewPanel({ isOpen: false, logbook: null, groupId: null, remarks: '' })}
                                className="flex-1 px-4 py-2.5 text-sm text-white/60 border border-white/10 rounded-xl hover:bg-white/5 font-semibold transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleReviewSubmit('APPROVED')}
                                className="flex-1 px-4 py-2.5 text-sm bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-500/25 font-bold transition-all"
                            >
                                ✓ Approve
                            </button>
                            <button
                                onClick={() => handleReviewSubmit('NEEDS_REVISION')}
                                className="flex-1 px-4 py-2.5 text-sm bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl hover:shadow-lg hover:shadow-amber-500/25 font-bold transition-all"
                            >
                                ↻ Revise
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppShell>
    );
};
