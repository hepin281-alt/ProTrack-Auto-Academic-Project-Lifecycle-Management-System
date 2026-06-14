import React, { useState, useEffect } from 'react';
import { AppShell } from '../../layouts/AppShell';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/apiClient';
import { Calendar, Plus, Clock, MapPin, CheckCircle2, Flag, Trash2 } from 'lucide-react';

interface Group {
    group_id: string;
    group_name: string;
}

interface Schedule {
    schedule_id: string;
    group_id: string;
    group_name: string;
    phase: string;
    presentation_time: string;
    venue: string;
}

interface Milestone {
    milestone_id: string;
    batch_year: number;
    milestone_key: string;
    milestone_name: string;
    due_date: string;
    is_completed: boolean;
    created_at: string;
}

const STANDARD_MILESTONES = [
    { key: 'GROUP_FORMATION', name: 'Group Formation' },
    { key: 'TOPIC_SUBMISSION', name: 'Topic Submission' },
    { key: 'SYNOPSIS_SUBMISSION', name: 'Synopsis Submission' },
    { key: 'REVIEW_1', name: 'Review 1 Presentation' },
    { key: 'REVIEW_2', name: 'Review 2 Presentation' },
    { key: 'REVIEW_3', name: 'Review 3 Presentation' },
    { key: 'FINAL_REPORT', name: 'Final Report Submission' },
    { key: 'FINAL_VIVA', name: 'Final Viva Examination' },
];

export const CoordinatorSchedules: React.FC = () => {
    const { token } = useAuthStore();
    const [activeTab, setActiveTab] = useState<'schedules' | 'timelines' | 'milestones'>('schedules');
    const [groups, setGroups] = useState<Group[]>([]);
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [milestones, setMilestones] = useState<Milestone[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    // Timelines state
    const [globalTimelines, setGlobalTimelines] = useState<Record<string, Record<string, string>>>({});
    const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
    const [isSavingTimelines, setIsSavingTimelines] = useState(false);
    
    // Milestones state
    const [selectedBatchYear, setSelectedBatchYear] = useState<number>(new Date().getFullYear());
    const [editingMilestone, setEditingMilestone] = useState<string | null>(null);
    const [milestoneData, setMilestoneData] = useState<Record<string, { date: string; time: string }>>({});
    
    const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
    const [selectedPhase, setSelectedPhase] = useState('REVIEW_1');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [interval, setIntervalTime] = useState('15');
    const [venue, setVenue] = useState('');
    const [toast, setToast] = useState<string | null>(null);

    const phases = [
        { id: 'REVIEW_1', label: 'Review 1' },
        { id: 'REVIEW_2', label: 'Review 2' },
        { id: 'REVIEW_3', label: 'Review 3' },
        { id: 'FINAL', label: 'Final Presentation' },
    ];

    const fetchAllData = async () => {
        if (!token) return;
        try {
            setIsLoading(true);
            const [fetchedGroups, fetchedSchedules, fetchedSettings, fetchedMilestones] = await Promise.all([
                api.getGroups(token, 'ACTIVE'),
                api.getSchedules(token),
                api.getSettings(token).catch(() => ({})),
                api.getMilestones(token, selectedBatchYear).catch(() => ({ milestones: [] }))
            ]);
            setGroups(fetchedGroups);
            setSchedules(fetchedSchedules);
            if (fetchedSettings.project_timelines) {
                setGlobalTimelines(fetchedSettings.project_timelines);
            }
            setMilestones(fetchedMilestones.milestones || []);
        } catch (error) {
            console.error("Failed to fetch scheduling data");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, [token, selectedBatchYear]);

    const handleSmartSchedule = async () => {
        if (!token) return;
        try {
            setIsLoading(true);
            const data = await api.getSmartSlots(token);
            if (data.slots && data.slots.length > 0) {
                const nextSlot = new Date(data.slots[0]);
                const yyyy = nextSlot.getFullYear();
                const mm = String(nextSlot.getMonth() + 1).padStart(2, '0');
                const dd = String(nextSlot.getDate()).padStart(2, '0');
                setDate(`${yyyy}-${mm}-${dd}`);
                
                const hh = String(nextSlot.getHours()).padStart(2, '0');
                const min = String(nextSlot.getMinutes()).padStart(2, '0');
                setTime(`${hh}:${min}`);
                
                setToast('Found an open slot!');
                setTimeout(() => setToast(null), 3000);
            } else {
                setToast('No open slots found.');
                setTimeout(() => setToast(null), 3000);
            }
        } catch (error) {
            console.error('Failed to get smart slots', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateSchedule = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || selectedGroups.length === 0 || !date || !time || !venue) return;

        const presentationTime = new Date(`${date}T${time}`).toISOString();

        try {
            await api.createSchedule(token, selectedGroups, selectedPhase, presentationTime, venue, parseInt(interval, 10));
            setToast('Schedule successfully saved!');
            setTimeout(() => setToast(null), 3000);
            
            // Reset form
            setSelectedGroups([]);
            setDate('');
            setTime('');
            setVenue('');
            setIntervalTime('15');
            
            fetchAllData();
        } catch (error) {
            console.error("Failed to save schedule");
        }
    };

    const handleSaveTimelines = async () => {
        if (!token) return;
        try {
            setIsSavingTimelines(true);
            await api.updateSettings(token, 'project_timelines', globalTimelines);
            setToast('Project timelines updated globally!');
            setTimeout(() => setToast(null), 3000);
        } catch (err) {
            console.error('Failed to update timelines');
        } finally {
            setIsSavingTimelines(false);
        }
    };

    return (
        <AppShell currentPage="/coordinator/schedules">
            {toast && (
                <div className="fixed top-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-2xl shadow-xl border bg-emerald-900/90 border-emerald-500/30 text-emerald-300 text-sm font-semibold">
                    <CheckCircle2 size={16} />
                    {toast}
                </div>
            )}

            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500">
                        <Calendar size={18} className="text-white" />
                    </div>
                    <h1 className="text-2xl font-black text-white">Milestone Scheduling</h1>
                </div>
                <p className="text-white/40 text-sm ml-11">Assign presentation slots and manage overarching project deadlines</p>
            </div>

            {/* Global Timelines Section */}
            <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-6 mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                        <Clock size={16} className="text-emerald-400" />
                        Global Project Deadlines
                        <select 
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            className="ml-3 px-2 py-1 bg-white/5 border border-white/10 text-white rounded text-xs focus:outline-none"
                        >
                            {[2024, 2025, 2026, 2027].map(y => (
                                <option key={y} value={y.toString()} className="bg-slate-800">Batch {y}</option>
                            ))}
                        </select>
                    </h2>
                    <button 
                        onClick={handleSaveTimelines}
                        disabled={isSavingTimelines}
                        className="px-4 py-2 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-lg hover:bg-emerald-500/30 transition-all disabled:opacity-50"
                    >
                        {isSavingTimelines ? 'Saving...' : 'Save Deadlines'}
                    </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { id: 'phase1', label: 'Phase 1: Planning' },
                        { id: 'phase2', label: 'Phase 2: Development' },
                        { id: 'phase3', label: 'Phase 3: Testing' },
                        { id: 'phase4', label: 'Final Submission' },
                    ].map(phase => {
                        const currentTimelines = globalTimelines[selectedYear] || {};
                        return (
                            <div key={phase.id}>
                                <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">{phase.label}</label>
                                <input 
                                    type="text"
                                    value={currentTimelines[phase.id] || ''}
                                    onChange={(e) => setGlobalTimelines({
                                        ...globalTimelines,
                                        [selectedYear]: {
                                            ...currentTimelines,
                                            [phase.id]: e.target.value
                                        }
                                    })}
                                    placeholder="e.g. Mar 31"
                                    className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg text-sm focus:outline-none focus:border-emerald-500/50"
                                />
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form */}
                <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-6 h-fit">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-sm font-bold text-white flex items-center gap-2">
                            <Plus size={16} className="text-blue-400" />
                            Create New Slot
                        </h2>
                        <button 
                            type="button"
                            onClick={handleSmartSchedule}
                            disabled={isLoading}
                            className="px-3 py-1.5 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-lg hover:bg-emerald-500/30 transition-all flex items-center gap-1.5"
                        >
                            <Calendar size={12} />
                            Smart Pick
                        </button>
                    </div>
                    
                    <form onSubmit={handleCreateSchedule} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">Review Phase</label>
                            <select 
                                value={selectedPhase}
                                onChange={e => setSelectedPhase(e.target.value)}
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg text-sm focus:outline-none focus:border-blue-500/50"
                            >
                                {phases.map(p => <option key={p.id} value={p.id} className="bg-slate-800">{p.label}</option>)}
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">Select Groups</label>
                            <div className="max-h-48 overflow-y-auto bg-white/5 border border-white/10 rounded-lg p-2 space-y-1">
                                {groups.map(g => (
                                    <label key={g.group_id} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-md cursor-pointer transition-colors">
                                        <input 
                                            type="checkbox"
                                            checked={selectedGroups.includes(g.group_id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedGroups(prev => [...prev, g.group_id]);
                                                } else {
                                                    setSelectedGroups(prev => prev.filter(id => id !== g.group_id));
                                                }
                                            }}
                                            className="w-4 h-4 rounded bg-white/10 border border-white/20 text-emerald-500 focus:ring-emerald-500/50"
                                        />
                                        <span className="text-sm font-medium text-white">{g.group_name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">Date</label>
                                <input 
                                    type="date" 
                                    required
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                    className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg text-sm focus:outline-none focus:border-blue-500/50"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">Time</label>
                                <input 
                                    type="time" 
                                    required
                                    value={time}
                                    onChange={e => setTime(e.target.value)}
                                    className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg text-sm focus:outline-none focus:border-blue-500/50"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">Venue</label>
                                <input 
                                    type="text" 
                                    required
                                    placeholder="e.g. Lab 402, Main Auditorium"
                                    value={venue}
                                    onChange={e => setVenue(e.target.value)}
                                    className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white placeholder:text-white/20 rounded-lg text-sm focus:outline-none focus:border-blue-500/50"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">Time per Group</label>
                                <select 
                                    value={interval}
                                    onChange={e => setIntervalTime(e.target.value)}
                                    className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg text-sm focus:outline-none focus:border-blue-500/50"
                                >
                                    <option value="10" className="bg-slate-800">10 Minutes</option>
                                    <option value="15" className="bg-slate-800">15 Minutes</option>
                                    <option value="20" className="bg-slate-800">20 Minutes</option>
                                    <option value="30" className="bg-slate-800">30 Minutes</option>
                                    <option value="45" className="bg-slate-800">45 Minutes</option>
                                    <option value="60" className="bg-slate-800">1 Hour</option>
                                </select>
                            </div>
                        </div>

                        <button 
                            type="submit"
                            className="w-full mt-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl text-sm hover:shadow-lg hover:shadow-blue-500/25 transition-all"
                        >
                            Save Schedule
                        </button>
                    </form>
                </div>

                {/* Schedule List */}
                <div className="lg:col-span-2 rounded-2xl bg-white/[0.04] border border-white/[0.08] overflow-hidden">
                    <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
                        <h2 className="text-sm font-bold text-white flex items-center gap-2">
                            <Clock size={16} className="text-blue-400" />
                            Master Calendar
                        </h2>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-white/[0.02] border-b border-white/[0.06]">
                                    <th className="p-4 text-xs font-bold text-white/40 uppercase tracking-widest">Phase</th>
                                    <th className="p-4 text-xs font-bold text-white/40 uppercase tracking-widest">Group</th>
                                    <th className="p-4 text-xs font-bold text-white/40 uppercase tracking-widest">Date & Time</th>
                                    <th className="p-4 text-xs font-bold text-white/40 uppercase tracking-widest">Venue</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr><td colSpan={4} className="p-8 text-center text-white/30 text-sm">Loading schedules...</td></tr>
                                ) : schedules.length === 0 ? (
                                    <tr><td colSpan={4} className="p-8 text-center text-white/30 text-sm">No schedules created yet.</td></tr>
                                ) : (
                                    schedules.map(schedule => {
                                        const dateObj = new Date(schedule.presentation_time);
                                        return (
                                            <tr key={schedule.schedule_id} className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02]">
                                                <td className="p-4">
                                                    <span className="px-2 py-1 text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg">
                                                        {schedule.phase.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-sm font-semibold text-white/80">{schedule.group_name}</td>
                                                <td className="p-4">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-sm text-white/90">{dateObj.toLocaleDateString()}</span>
                                                        <span className="text-xs text-white/40">{dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-sm text-white/70 flex items-center gap-1.5 mt-2">
                                                    <MapPin size={12} className="text-white/30" />
                                                    {schedule.venue}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AppShell>
    );
};
