import React, { useState, useEffect } from 'react';
import { AppShell } from '../../layouts/AppShell';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/apiClient';
import { Users, BookOpen, AlertOctagon, TrendingUp, Sparkles, Activity, Zap, Download, Filter, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'framer-motion';
import * as XLSX from 'xlsx';

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b'];

interface ComplianceRecord {
 group_id: string;
 group_name: string;
 guide_email: string;
 weeks_active: number;
 logbooks_submitted: number;
 compliance_rate: number;
 consecutive_missed: number;
 status: 'on_track' | 'warning' | 'at_risk';
}

interface ComplianceSummary {
 total_groups: number;
 average_compliance: number;
 at_risk_count: number;
 warning_count: number;
 on_track_count: number;
}

export const CoordinatorDashboardNew: React.FC = () => {
 const { token } = useAuthStore();
 const [stats, setStats] = useState({ totalGroups: 0, unassigned: 0, active: 0, totalStudents: 0 });
 const [isLoading, setIsLoading] = useState(false);
 const [groups, setGroups] = useState<any[]>([]);
 const [complianceData, setComplianceData] = useState<ComplianceRecord[]>([]);
 const [complianceSummary, setComplianceSummary] = useState<ComplianceSummary | null>(null);
 const [filterStatus, setFilterStatus] = useState<string>('all');

 useEffect(() => {
 const fetchData = async () => {
 if (!token) return;
 try {
 setIsLoading(true);
 const [groupsData, complianceResponse, systemStats] = await Promise.all([
 api.getGroups(token),
 api.getLogbookCompliance(token).catch(() => null),
 api.getSystemStats(token).catch(() => null)
 ]);
 
 const groupList = Array.isArray(groupsData) ? groupsData : [];
 setGroups(groupList);
 
 setStats({
 totalGroups: systemStats?.total_groups || groupList.length,
 unassigned: systemStats?.unassigned_groups || groupList.filter(g => g.status === 'WAITING_ALLOCATION').length,
 active: systemStats?.active_groups || groupList.filter(g => g.status === 'ACTIVE').length,
 totalStudents: systemStats?.total_students || 0
 });

 if (complianceResponse) {
 setComplianceData(complianceResponse.compliance || []);
 setComplianceSummary(complianceResponse.summary || null);
 }
 } catch (err) {
 console.error(err);
 } finally {
 setIsLoading(false);
 }
 };
 fetchData();
 }, [token]);

 const dynamicWorkloadData = React.useMemo(() => {
 if (!complianceData || complianceData.length === 0) return [];
 const workloadMap = new Map<string, number>();
 complianceData.forEach(record => {
 if (record.guide_email) {
 const name = record.guide_email.split('@')[0];
 workloadMap.set(name, (workloadMap.get(name) || 0) + 1);
 }
 });
 const sorted = Array.from(workloadMap.entries()).map(([name, groups]) => ({ name, groups })).sort((a,b) => b.groups - a.groups);
 return sorted;
 }, [complianceData]);

 const dynamicCycleData = React.useMemo(() => {
 if (!groups || groups.length === 0) return [];
 let ideation = 0, implementation = 0, testing = 0, final = 0;
 groups.forEach(g => {
 if (g.status === 'PROPOSED' || g.status === 'WAITING_ALLOCATION') ideation++;
 else if (g.status === 'ACTIVE') implementation++;
 else if (g.status === 'COMPLETED') final++;
 else ideation++;
 });
 
 const total = groups.length;
 
 return [
 { name: 'Ideation', full: 'Phase 1 — Ideation', value: ideation, percent: Math.round((ideation / total) * 100) },
 { name: 'Implementation', full: 'Phase 2 — Implementation', value: implementation, percent: Math.round((implementation / total) * 100) },
 { name: 'Testing', full: 'Phase 3 — Testing', value: testing, percent: Math.round((testing / total) * 100) },
 { name: 'Final', full: 'Phase 4 — Final', value: final, percent: Math.round((final / total) * 100) },
 ].filter(d => d.value > 0);
 }, [groups]);

 const handleDownloadCompliance = async () => {
 if (!token) return;
 try {
 const blob = await api.exportLogbookCompliance(token);
 const url = window.URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download = `logbook_compliance_${new Date().toISOString().split('T')[0]}.csv`;
 document.body.appendChild(a);
 a.click();
 window.URL.revokeObjectURL(url);
 document.body.removeChild(a);
 } catch (err) {
 console.error('Failed to download compliance report', err);
 alert('Failed to download compliance report');
 }
 };

 const handleExportGrades = async () => {
 if (!token) return;
 try {
 // Fetch groups and all evaluations
 const [groups, evaluations] = await Promise.all([
 api.getGroups(token),
 api.getEvaluations(token)
 ]);
 
 if (!groups || groups.length === 0) {
 alert('No groups found to export.');
 return;
 }

 // Create Data Array for Excel
 const exportData: any[] = [];

 // Process data
 evaluations.forEach((evalItem: any) => {
 const group = groups.find((g: any) => g.group_id === evalItem.group_id);
 if (group) {
 exportData.push({
 "Group ID": group.group_id,
 "Group Name": group.group_name || evalItem.group_name || '',
 "Members": group.member_count || 0,
 "Evaluator": evalItem.evaluator_name || evalItem.evaluator_id || '',
 "Phase": evalItem.phase || '',
 "Total Score": evalItem.total_marks || 0
 });
 }
 });

 // Trigger Download
 const worksheet = XLSX.utils.json_to_sheet(exportData);
 const workbook = XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(workbook, worksheet, "Evaluations");
 XLSX.writeFile(workbook, `evaluations_export_${new Date().toISOString().split('T')[0]}.xlsx`);

 } catch (err) {
 console.error('Failed to export grades', err);
 alert('Failed to export grades');
 }
 };

 const filteredCompliance = filterStatus === 'all'
 ? complianceData
 : complianceData.filter(g => g.status === filterStatus);

 const getStatusBadge = (status: string) => {
 const badges = {
 on_track: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', label: 'On Track', icon: CheckCircle },
 warning: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', label: 'Warning', icon: Clock },
 at_risk: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', label: 'At Risk', icon: AlertTriangle },
 };
 return badges[status as keyof typeof badges] || badges.on_track;
 };

 return (
 <AppShell currentPage="/coordinator/dashboard">
 <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
 <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
 <div>
 <h2 className="text-3xl font-bold tracking-tight text-white">Coordinator Analytics</h2>
 <p className="text-white/50 mt-1 text-lg">Department-level insights, workload distribution, and compliance tracking.</p>
 </div>
 <div className="flex flex-wrap gap-3">
 <button 
 onClick={async () => {
 try {
 if (token) {
 await api.triggerReminders(token);
 alert('Overdue reminders check triggered successfully! System alerts have been sent to applicable groups.');
 }
 } catch (err: any) {
 alert(err.message || 'Failed to trigger reminders');
 }
 }}
 className="px-4 py-2 bg-gradient-to-r from-rose-500 to-red-600 text-white font-medium rounded-lg hover:shadow-lg hover:shadow-red-500/20 transition-all flex items-center gap-2"
 >
 <AlertOctagon className="w-4 h-4" /> Trigger Overdue Reminders
 </button>
 <button 
 onClick={handleExportGrades}
 className="px-4 py-2 bg-slate-800 border border-white/[0.08] text-white font-medium rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2"
 >
 <Activity className="w-4 h-4" /> Export Grades (Excel)
 </button>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
 {[
 { label:"Total Students", val: isLoading ?"..." : String(stats.totalStudents), trend:"Active in system", icon: Users, color: 'text-indigo-400', bg: 'bg-indigo-500/10', glow: 'shadow-indigo-500/5' },
 { label:"Total Projects", val: isLoading ?"..." : String(stats.totalGroups), trend:"Formed groups", icon: BookOpen, color: 'text-emerald-400', bg: 'bg-emerald-500/10', glow: 'shadow-emerald-500/5' },
 { label:"Unassigned", val: isLoading ?"..." : String(stats.unassigned), trend:"Requires guide", icon: AlertOctagon, color: 'text-rose-400', bg: 'bg-rose-500/10', glow: 'shadow-rose-500/5' },
 { label:"Avg Compliance", val: isLoading || !complianceSummary ?"..." : `${complianceSummary.average_compliance}%`, trend:"Logbook submissions", icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-500/10', glow: 'shadow-purple-500/5' },
 ].map((k, i) => (
 <motion.div 
 key={i} 
 whileHover={{ y: -4 }}
 className={`p-6 rounded-2xl border border-white/[0.08] bg-white/5 shadow-sm hover:shadow-xl hover:${k.glow} transition-all relative overflow-hidden backdrop-blur-sm`}
 >
 <div className="flex justify-between items-start z-10 relative">
 <div>
 <p className="text-sm font-medium text-white/50 mb-1">{k.label}</p>
 <h3 className="text-4xl font-bold tracking-tight text-white">{k.val}</h3>
 </div>
 <div className={`p-3 rounded-xl ${k.bg}`}>
 <k.icon className={`w-6 h-6 ${k.color}`} />
 </div>
 </div>
 <div className="mt-4 text-sm font-medium text-emerald-400 relative z-10">{k.trend}</div>
 <div className={`absolute -bottom-4 -right-4 w-24 h-24 rounded-full opacity-20 blur-2xl z-0 ${k.bg}`} />
 </motion.div>
 ))}
 </div>

 <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
 <div className="xl:col-span-2 p-6 rounded-2xl border border-white/[0.08] bg-white/5 shadow-sm backdrop-blur-sm">
 <div className="flex justify-between items-center mb-6">
 <h3 className="text-xl font-bold text-white flex items-center gap-2"><Zap className="w-5 h-5 text-indigo-400" /> Guide Workload Distribution</h3>
 </div>
 <div className="h-[350px] w-full">
 {dynamicWorkloadData.length > 0 ? (
 <ResponsiveContainer width="100%" height="100%">
 <BarChart data={dynamicWorkloadData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.5)'}} dy={10} />
 <YAxis axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.5)'}} />
 <Tooltip 
 cursor={{fill: 'rgba(255,255,255,0.02)'}}
 contentStyle={{ backgroundColor: 'rgba(9, 9, 11, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
 />
 <Bar dataKey="groups" radius={[6, 6, 0, 0]} maxBarSize={60}>
 {dynamicWorkloadData.map((e, i) => (
 <Cell key={i} fill={e.groups > 6 ? '#ef4444' : e.groups < 3 ? '#10b981' : '#6366f1'} />
 ))}
 </Bar>
 </BarChart>
 </ResponsiveContainer>
 ) : (
 <div className="flex items-center justify-center h-full text-white/50 text-sm">No data available</div>
 )}
 </div>
 </div>

 <div className="p-6 rounded-2xl border border-white/[0.08] bg-white/5 shadow-sm flex flex-col backdrop-blur-sm">
 <h3 className="text-xl font-bold mb-2 text-white flex items-center gap-2"><Activity className="w-5 h-5 text-emerald-400" /> Project Cycle Health</h3>
 <p className="text-sm text-white/50 mb-4">Distribution of groups across project lifecycle phases.</p>
 <div className="h-[220px] w-full">
 {dynamicCycleData.length > 0 ? (
 <ResponsiveContainer width="100%" height="100%">
 <PieChart>
 <Pie
 data={dynamicCycleData}
 cx="50%"
 cy="50%"
 innerRadius={60}
 outerRadius={80}
 paddingAngle={5}
 dataKey="value"
 stroke="none"
 >
 {dynamicCycleData.map((entry, index) => (
 <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
 ))}
 </Pie>
 <Tooltip 
 formatter={(value: any, name: any, props: any) => [`${props.payload.percent}% (${value} groups)`, props.payload.full]}
 contentStyle={{ backgroundColor: 'rgba(9, 9, 11, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
 itemStyle={{ color: '#fff' }}
 />
 </PieChart>
 </ResponsiveContainer>
 ) : (
 <div className="flex items-center justify-center h-full text-white/50 text-sm">No group data available</div>
 )}
 </div>
 <div className="grid grid-cols-2 gap-2 mt-4">
 {dynamicCycleData.map((d, i) => (
 <div key={d.name} className="flex items-center gap-2">
 <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
 <span className="text-xs text-white/50">{d.name}</span>
 <span className="text-xs font-bold text-white ml-auto">{d.percent}%</span>
 </div>
 ))}
 </div>
 </div>
 </div>

 <div className="mt-6 p-6 rounded-2xl border border-white/[0.08] bg-gradient-to-r from-indigo-500/10 to-purple-500/10 shadow-sm flex flex-col md:flex-row items-center gap-6 backdrop-blur-sm">
 <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center shrink-0">
 <Sparkles className="w-8 h-8 text-indigo-400" />
 </div>
 <div>
 <h3 className="text-xl font-bold mb-2 text-white">AI Coordinator Insights</h3>
 <p className="text-white/50">
 The system has detected that you have <strong className="text-white">{stats.unassigned}</strong> groups waiting for a guide. 
 Head over to the <strong className="text-white">Allocations</strong> tab to assign them to available faculty members based on their workload capacity.
 </p>
 </div>
 </div>

 {/* Logbook Compliance Panel */}
 <div className="p-6 rounded-2xl border border-white/[0.08] bg-white/5 shadow-sm backdrop-blur-sm">
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
 <div>
 <h3 className="text-xl font-bold text-white flex items-center gap-2">
 <BookOpen className="w-5 h-5 text-blue-400" />
 Logbook Compliance Tracking
 </h3>
 {complianceSummary && (
 <div className="flex items-center gap-6 mt-3 text-sm">
 <div className="flex items-center gap-2">
 <div className="w-2 h-2 rounded-full bg-emerald-400" />
 <span className="text-white/50">On Track: <strong className="text-white">{complianceSummary.on_track_count}</strong></span>
 </div>
 <div className="flex items-center gap-2">
 <div className="w-2 h-2 rounded-full bg-amber-400" />
 <span className="text-white/50">Warning: <strong className="text-white">{complianceSummary.warning_count}</strong></span>
 </div>
 <div className="flex items-center gap-2">
 <div className="w-2 h-2 rounded-full bg-red-400" />
 <span className="text-white/50">At Risk: <strong className="text-white">{complianceSummary.at_risk_count}</strong></span>
 </div>
 </div>
 )}
 </div>
 <div className="flex items-center gap-3">
 <select
 value={filterStatus}
 onChange={(e) => setFilterStatus(e.target.value)}
 className="px-3 py-2 bg-white/5 border border-white/[0.08] text-white rounded-lg text-sm focus:outline-none focus:border-blue-500/50"
 >
 <option value="all" className="bg-slate-800">All Groups</option>
 <option value="at_risk" className="bg-slate-800">At Risk Only</option>
 <option value="warning" className="bg-slate-800">Warning Only</option>
 <option value="on_track" className="bg-slate-800">On Track Only</option>
 </select>
 <button
 onClick={handleDownloadCompliance}
 className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium rounded-lg hover:shadow-lg hover:shadow-blue-500/20 transition-all"
 >
 <Download className="w-4 h-4" />
 Download CSV
 </button>
 </div>
 </div>

 {isLoading ? (
 <div className="flex items-center justify-center py-16">
 <div className="w-8 h-8 border-2 border-white/[0.08] border-t-blue-400 rounded-full animate-spin" />
 </div>
 ) : complianceData.length === 0 ? (
 <div className="text-center py-16 text-white/50">
 <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
 <p>No active groups found</p>
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-left">
 <thead>
 <tr className="bg-white/[0.04] border-b border-white/[0.08][0.06]">
 <th className="p-4 text-xs font-bold text-white/50 uppercase tracking-widest">Group</th>
 <th className="p-4 text-xs font-bold text-white/50 uppercase tracking-widest">Guide</th>
 <th className="p-4 text-xs font-bold text-white/50 uppercase tracking-widest text-center">Weeks Active</th>
 <th className="p-4 text-xs font-bold text-white/50 uppercase tracking-widest text-center">Submitted</th>
 <th className="p-4 text-xs font-bold text-white/50 uppercase tracking-widest text-center">Compliance %</th>
 <th className="p-4 text-xs font-bold text-white/50 uppercase tracking-widest text-center">Consecutive Missed</th>
 <th className="p-4 text-xs font-bold text-white/50 uppercase tracking-widest">Status</th>
 </tr>
 </thead>
 <tbody>
 {filteredCompliance.map((group) => {
 const statusInfo = getStatusBadge(group.status);
 const StatusIcon = statusInfo.icon;
 return (
 <tr key={group.group_id} className="border-b border-white/[0.08][0.03] hover:bg-white/[0.04] transition-colors">
 <td className="p-4">
 <span className="text-sm font-semibold text-white">{group.group_name}</span>
 </td>
 <td className="p-4">
 <span className="text-sm text-white/50">{group.guide_email}</span>
 </td>
 <td className="p-4 text-center">
 <span className="text-sm font-medium text-white">{group.weeks_active}</span>
 </td>
 <td className="p-4 text-center">
 <span className="text-sm font-medium text-white">{group.logbooks_submitted}</span>
 </td>
 <td className="p-4 text-center">
 <div className="flex items-center justify-center">
 <div className="relative w-20">
 <div className="h-2 bg-white/[0.04] /10 rounded-full overflow-hidden">
 <div
 className={`h-full transition-all ${
 group.status === 'at_risk' ? 'bg-red-500' :
 group.status === 'warning' ? 'bg-amber-500' :
 'bg-emerald-500'
 }`}
 style={{ width: `${group.compliance_rate}%` }}
 />
 </div>
 <span className="text-xs font-bold text-white/50 absolute -right-8 top-0">{group.compliance_rate}%</span>
 </div>
 </div>
 </td>
 <td className="p-4 text-center">
 <span className={`text-sm font-medium ${
 group.consecutive_missed >= 2 ? 'text-red-400' :
 group.consecutive_missed === 1 ? 'text-amber-400' :
 'text-emerald-400'
 }`}>
 {group.consecutive_missed}
 </span>
 </td>
 <td className="p-4">
 <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}>
 <StatusIcon size={12} />
 {statusInfo.label}
 </span>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 )}
 </div>
 </div>
 </AppShell>
 );
};
