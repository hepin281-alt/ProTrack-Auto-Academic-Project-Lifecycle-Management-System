import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../../layouts/AppShell';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/apiClient';
import { Trophy, CheckCircle2, Clock, FileText, TrendingUp, Calendar, Users, Zap, ChevronRight } from 'lucide-react';

interface ReviewStats {
 total: number;
 pending: number;
 completed: number;
}

interface ReviewPhase {
 id: string;
 label: string;
 description: string;
 status: 'upcoming' | 'current' | 'completed';
}

export const CommitteeDashboard: React.FC = () => {
 const { token } = useAuthStore();
 const navigate = useNavigate();
 const [stats, setStats] = useState<ReviewStats>({ total: 0, pending: 0, completed: 0 });
 const [isLoading, setIsLoading] = useState(false);
 const [upcomingSchedules, setUpcomingSchedules] = useState<any[]>([]);

 const fetchData = async () => {
 if (!token) return;
 try {
 setIsLoading(true);
 // Fetch evaluations to calculate stats
 const evaluations = await api.getEvaluations(token);
 const evalList = Array.isArray(evaluations) ? evaluations : [];
 
 setStats({
 total: evalList.length,
 pending: evalList.filter((e: any) => !e.is_locked).length,
 completed: evalList.filter((e: any) => e.is_locked).length,
 });

 // Fetch schedules
 const schedules = await api.getSchedules(token);
 setUpcomingSchedules(Array.isArray(schedules) ? schedules.slice(0, 4) : []);
 } catch (err) {
 console.error('Failed to load committee dashboard data', err);
 } finally {
 setIsLoading(false);
 }
 };

 useEffect(() => {
 fetchData();
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, []);

 const reviewPhases: ReviewPhase[] = [
 { id: 'phase1', label: 'Review Phase 1', description: 'Proposal & Design', status: 'completed' },
 { id: 'phase2', label: 'Review Phase 2', description: 'Implementation', status: 'current' },
 { id: 'phase3', label: 'Review Phase 3', description: 'Testing & Demo', status: 'upcoming' },
 { id: 'final', label: 'Final Review', description: 'Final Evaluation', status: 'upcoming' },
 ];

 const statCards = [
 {
 label: 'Total Reviews',
 value: isLoading ? '...' : stats.total,
 sub: 'All evaluations',
 icon: Trophy,
 gradient: 'from-amber-500 to-yellow-500',
 glow: 'shadow-amber-500/20',
 },
 {
 label: 'Pending Reviews',
 value: isLoading ? '...' : stats.pending,
 sub: 'Awaiting evaluation',
 icon: Clock,
 gradient: 'from-orange-500 to-red-500',
 glow: 'shadow-orange-500/20',
 },
 {
 label: 'Completed Reviews',
 value: isLoading ? '...' : stats.completed,
 sub: 'Locked evaluations',
 icon: CheckCircle2,
 gradient: 'from-emerald-500 to-teal-500',
 glow: 'shadow-emerald-500/20',
 },
 ];

 return (
 <AppShell currentPage="/committee/dashboard">
 {/* Dashboard Header */}
 <div className="mb-8">
 <div className="flex items-center gap-3 mb-2">
 <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600">
 <Trophy size={18} className="text-white" />
 </div>
 <h1 className="text-2xl font-black text-white">Committee Dashboard</h1>
 </div>
 <p className="text-white/50 text-sm ml-11">Project evaluation and assessment center</p>
 </div>

 {/* Statistics Grid */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
 {statCards.map((card) => {
 const Icon = card.icon;
 return (
 <div
 key={card.label}
 className={`relative overflow-hidden rounded-2xl p-5 bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.08][0.15] hover:bg-white/[0.04] transition-all group shadow-xl ${card.glow}`}
 >
 <div className={`absolute top-0 right-0 w-24 h-24 rounded-full bg-gradient-to-br ${card.gradient} opacity-10 -mr-8 -mt-8 group-hover:opacity-20 transition-opacity`} />
 <div className="flex items-start justify-between mb-3">
 <p className="text-xs font-semibold text-white/50 uppercase tracking-widest">{card.label}</p>
 <div className={`p-2 rounded-xl bg-gradient-to-br ${card.gradient} shadow-lg`}>
 <Icon size={14} className="text-white" />
 </div>
 </div>
 <p className="text-3xl font-black text-white mb-1">{card.value}</p>
 <p className="text-xs text-white/50">{card.sub}</p>
 </div>
 );
 })}
 </div>

 <div className="grid grid-cols-1 gap-6 mb-8">

 {/* Upcoming Schedules */}
 <div className="rounded-2xl p-5 bg-white/[0.04] border border-white/[0.08]">
 <h2 className="text-sm font-bold text-white mb-5 flex items-center gap-2">
 <Calendar size={15} className="text-blue-400" />
 Upcoming Presentations
 </h2>
 {isLoading ? (
 <div className="flex items-center gap-3 py-6 text-white/50">
 <div className="w-4 h-4 border-2 border-white/[0.08] border-t-blue-400 rounded-full animate-spin" />
 <span className="text-sm">Loading schedules…</span>
 </div>
 ) : upcomingSchedules.length === 0 ? (
 <div className="text-center py-10">
 <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/[0.08] flex items-center justify-center mx-auto mb-3">
 <Calendar size={20} className="text-white/50" />
 </div>
 <p className="text-sm text-white/50">No upcoming presentations</p>
 </div>
 ) : (
 <div className="space-y-3">
 {upcomingSchedules.map((schedule) => {
 const dateObj = new Date(schedule.presentation_time);
 return (
 <div
 key={schedule.schedule_id}
 className="p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08][0.06] hover:bg-white/[0.04] transition-all"
 >
 <div className="flex items-start justify-between gap-3">
 <div className="flex items-start gap-3 flex-1 min-w-0">
 <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg flex-shrink-0 mt-0.5">
 <Users size={12} className="text-white" />
 </div>
 <div className="min-w-0">
 <p className="text-sm font-semibold text-white truncate">
 {schedule.phase?.replace('_', ' ') || 'Presentation'}
 </p>
 <p className="text-xs text-white/50 mt-0.5">
 Venue: {schedule.venue || 'TBD'}
 </p>
 </div>
 </div>
 <div className="text-right flex-shrink-0">
 <p className="text-xs font-bold text-blue-300">
 {dateObj.toLocaleDateString()}
 </p>
 <p className="text-xs text-blue-400/60 mt-0.5">
 {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
 </p>
 </div>
 </div>
 </div>
 );
 })}
 </div>
 )}
 </div>
 </div>

 {/* Review Phases Timeline */}
 <div className="rounded-2xl p-5 bg-white/[0.04] border border-white/[0.08]">
 <h2 className="text-sm font-bold text-white mb-5 flex items-center gap-2">
 <span className="w-1.5 h-4 rounded-full bg-gradient-to-b from-amber-400 to-yellow-500 inline-block" />
 Review Phases
 </h2>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
 {reviewPhases.map((phase) => (
 <div
 key={phase.id}
 className={`p-4 rounded-xl border transition-all ${
 phase.status === 'completed'
 ? 'bg-emerald-500/10 border-emerald-500/30'
 : phase.status === 'current'
 ? 'bg-blue-500/10 border-blue-500/30 ring-2 ring-blue-400/20'
 : 'bg-white/[0.04] border-white/[0.08]'
 }`}
 >
 <div className="flex items-start justify-between mb-3">
 <div
 className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
 phase.status === 'completed'
 ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white '
 : phase.status === 'current'
 ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white '
 : 'bg-white/[0.04] /10 text-white/50 border border-white/[0.08]'
 }`}
 >
 {phase.status === 'completed' ? '✓' : phase.id.replace('phase', '')}
 </div>
 </div>
 <h3
 className={`text-sm font-bold mb-1 ${
 phase.status === 'completed'
 ? 'text-emerald-400'
 : phase.status === 'current'
 ? 'text-blue-300'
 : 'text-white/50'
 }`}
 >
 {phase.label}
 </h3>
 <p className="text-xs text-white/50">{phase.description}</p>
 </div>
 ))}
 </div>
 </div>
 </AppShell>
 );
};
