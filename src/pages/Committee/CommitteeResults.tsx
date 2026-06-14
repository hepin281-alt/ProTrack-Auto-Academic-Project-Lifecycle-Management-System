import React, { useState, useEffect } from 'react';
import { AppShell } from '../../layouts/AppShell';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/apiClient';
import { BarChart2, Search, Trophy, Medal, Star, Download, Lock, Unlock, LockKeyhole, FileText, Loader2, Globe } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Group {
    group_id: string;
    group_name: string;
}

interface Evaluation {
    eval_id: string;
    group_id: string;
    phase: string;
    total_marks: number;
    created_at: string;
    rubric_scores: Record<string, number>;
    is_locked: boolean;
    locked_by: string | null;
    locked_at: string | null;
    locked_by_name: string | null;
    evaluator_name: string | null;
}

interface ResultRow extends Evaluation {
    group_name: string;
}

export const CommitteeResults: React.FC = () => {
    const { token, user } = useAuthStore();
    const [results, setResults] = useState<ResultRow[]>([]);
    const [allEvaluations, setAllEvaluations] = useState<Evaluation[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPhase, setSelectedPhase] = useState<string>('FINAL');
    const [lockingPhase, setLockingPhase] = useState<string | null>(null);

    const isCoordinator = user?.role === 'COORDINATOR';
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    useEffect(() => {
        fetchResults();
    }, [token, selectedPhase]);

    const fetchResults = async () => {
        if (!token) return;
        try {
            setIsLoading(true);
            const [groups, evaluations] = await Promise.all([
                api.getGroups(token),
                api.getEvaluations(token)
            ]);

            setAllEvaluations(evaluations);

            const groupMap = new Map(groups.map((g: Group) => [g.group_id, g.group_name]));
            
            const phaseEvals = evaluations
                .filter((e: Evaluation) => e.phase === selectedPhase)
                .map((e: Evaluation) => ({
                    ...e,
                    group_name: groupMap.get(e.group_id) || 'Unknown Group'
                }))
                .sort((a, b) => b.total_marks - a.total_marks); // Sort descending

            setResults(phaseEvals);
        } catch (error) {
            console.error("Failed to fetch results", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLockAll = async () => {
        if (!token || !isCoordinator) return;
        if (!window.confirm(`Are you sure you want to lock ALL evaluations for ${selectedPhase.replace('_', ' ')}? This will prevent any modifications until unlocked.`)) {
            return;
        }

        try {
            setLockingPhase(selectedPhase);
            await api.lockAllEvaluationsForPhase(token, selectedPhase);
            alert('All evaluations for this phase have been locked successfully!');
            fetchResults();
        } catch (error) {
            console.error('Failed to lock evaluations', error);
            alert('Failed to lock evaluations. Please try again.');
        } finally {
            setLockingPhase(null);
        }
    };

    const handleToggleLock = async (evalId: string, currentlyLocked: boolean) => {
        if (!token || !isCoordinator) return;

        try {
            if (currentlyLocked) {
                await api.unlockEvaluation(token, evalId);
                alert('Evaluation unlocked successfully!');
            } else {
                await api.lockEvaluation(token, evalId);
                alert('Evaluation locked successfully!');
            }
            fetchResults();
        } catch (error) {
            console.error('Failed to toggle lock', error);
            alert(`Failed to ${currentlyLocked ? 'unlock' : 'lock'} evaluation. Please try again.`);
        }
    };

    const filteredResults = results.filter(r => 
        r.group_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getRankIcon = (index: number) => {
        if (index === 0) return <Trophy size={18} className="text-yellow-400" />;
        if (index === 1) return <Medal size={18} className="text-gray-300" />;
        if (index === 2) return <Medal size={18} className="text-amber-600" />;
        return <span className="text-white/30 font-bold text-sm w-[18px] text-center">{index + 1}</span>;
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();
        
        // Header
        doc.setFontSize(22);
        doc.setTextColor(40, 40, 40);
        doc.text("University Project Results", 14, 22);
        
        doc.setFontSize(11);
        doc.setTextColor(100, 100, 100);
        doc.text(`Official Final Evaluation Leaderboard - ${new Date().toLocaleDateString()}`, 14, 30);
        
        // Prepare table data
        const tableColumn = ["Rank", "Group Name", "Total Score (/100)", "Date Evaluated"];
        const tableRows = filteredResults.map((r, i) => [
            (i + 1).toString(),
            r.group_name,
            r.total_marks.toString(),
            new Date(r.created_at).toLocaleDateString()
        ]);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 40,
            theme: 'grid',
            styles: { fontSize: 10, cellPadding: 4 },
            headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [245, 245, 245] }
        });

        doc.save(`University_Results_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    // ── Server-side PDF download (proper SPPU marksheet) ──────────────────────
    const downloadMarksheet = async (groupId: string, groupName: string) => {
        if (!token) return;
        try {
            setDownloadingId(groupId);
            const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
            const response = await fetch(`${API_BASE}/reports/marksheet/${groupId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) throw new Error(`Server returned ${response.status}`);
            const blob = await response.blob();
            const url  = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href     = url;
            link.download = `protrack_marksheet_${groupName.replace(/\s+/g, '_')}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Marksheet download failed:', err);
            alert('Failed to download marksheet. Please try again.');
        } finally {
            setDownloadingId(null);
        }
    };

    return (
        <AppShell currentPage="/committee/results">
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-500">
                            <BarChart2 size={18} className="text-white" />
                        </div>
                        <h1 className="text-2xl font-black text-white">Evaluation Results</h1>
                    </div>
                    <p className="text-white/40 text-sm ml-11">Leaderboard of evaluated project groups</p>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto flex-wrap">
                    <select
                        value={selectedPhase}
                        onChange={(e) => setSelectedPhase(e.target.value)}
                        className="px-3 py-2.5 bg-white/[0.05] border border-white/[0.1] text-white rounded-xl text-sm focus:outline-none focus:border-amber-500/50"
                    >
                        <option value="REVIEW_1" className="bg-slate-800">Review 1</option>
                        <option value="REVIEW_2" className="bg-slate-800">Review 2</option>
                        <option value="REVIEW_3" className="bg-slate-800">Review 3</option>
                        <option value="FINAL" className="bg-slate-800">Final Presentation</option>
                    </select>
                    <div className="relative flex-1 md:w-64">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                        <input
                            type="text"
                            placeholder="Search groups..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white/[0.05] border border-white/[0.1] text-white rounded-xl text-sm focus:outline-none focus:border-amber-500/50 transition-all"
                        />
                    </div>
                    {isCoordinator && (
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={handleLockAll}
                                disabled={lockingPhase !== null}
                                className="px-4 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-xl flex items-center gap-2 hover:shadow-lg hover:shadow-purple-500/20 active:scale-95 disabled:opacity-50 transition-all"
                            >
                                <Globe size={16} />
                                {lockingPhase ? 'Publishing...' : 'Approve for Publishing'}
                            </button>
                            <button 
                                onClick={handleLockAll}
                                disabled={lockingPhase !== null}
                                className="px-3 py-2.5 bg-white/5 text-white/50 border border-white/10 font-bold rounded-xl flex items-center justify-center hover:bg-white/10 active:scale-95 disabled:opacity-50 transition-all"
                                title="Lock All Evaluations"
                            >
                                <LockKeyhole size={16} />
                            </button>
                        </div>
                    )}
                    <button 
                        onClick={handleExportPDF}
                        disabled={filteredResults.length === 0}
                        className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl flex items-center gap-2 hover:shadow-lg hover:shadow-emerald-500/20 active:scale-95 disabled:opacity-50 transition-all"
                    >
                        <Download size={16} /> <span className="hidden sm:inline">Leaderboard PDF</span>
                    </button>
                </div>
            </div>

            <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/[0.02] border-b border-white/[0.06]">
                                <th className="p-4 text-xs font-bold text-white/40 uppercase tracking-widest w-16 text-center">Rank</th>
                                <th className="p-4 text-xs font-bold text-white/40 uppercase tracking-widest">Group Name</th>
                                <th className="p-4 text-xs font-bold text-white/40 uppercase tracking-widest text-right">Score (/100)</th>
                                <th className="p-4 text-xs font-bold text-white/40 uppercase tracking-widest text-center">Lock Status</th>
                                <th className="p-4 text-xs font-bold text-white/40 uppercase tracking-widest text-right">Date Evaluated</th>
                                <th className="p-4 text-xs font-bold text-white/40 uppercase tracking-widest text-center">Marksheet</th>
                                {isCoordinator && <th className="p-4 text-xs font-bold text-white/40 uppercase tracking-widest text-center">Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={isCoordinator ? 6 : 5} className="p-8 text-center text-white/30 text-sm">
                                        Loading results...
                                    </td>
                                </tr>
                            ) : filteredResults.length === 0 ? (
                                <tr>
                                    <td colSpan={isCoordinator ? 6 : 5} className="p-8 text-center text-white/30 text-sm">
                                        {searchTerm ? 'No groups match your search.' : 'No evaluations completed yet.'}
                                    </td>
                                </tr>
                            ) : (
                                filteredResults.map((result, index) => (
                                    <tr 
                                        key={result.eval_id} 
                                        className={`border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors ${
                                            index === 0 ? 'bg-amber-500/[0.03] hover:bg-amber-500/[0.05]' : ''
                                        }`}
                                    >
                                        <td className="p-4 flex justify-center">
                                            {getRankIcon(index)}
                                        </td>
                                        <td className="p-4">
                                            <p className={`text-sm font-semibold ${index === 0 ? 'text-amber-400' : 'text-white'}`}>
                                                {result.group_name}
                                                {index === 0 && <Star size={12} className="inline ml-2 text-amber-400 fill-amber-400" />}
                                            </p>
                                            {result.evaluator_name && (
                                                <p className="text-xs text-white/40 mt-0.5">Evaluated by: {result.evaluator_name}</p>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            <span className={`px-3 py-1 rounded-lg text-sm font-bold border ${
                                                parseFloat(result.total_marks.toString()) >= 80 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                parseFloat(result.total_marks.toString()) >= 60 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                                'bg-white/5 text-white/70 border-white/10'
                                            }`}>
                                                {result.total_marks}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col items-center gap-1">
                                                {result.is_locked ? (
                                                    <>
                                                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
                                                            <Lock size={12} />
                                                            <span className="text-xs font-bold">Locked</span>
                                                        </div>
                                                        {result.locked_by_name && (
                                                            <p className="text-[10px] text-white/30">by {result.locked_by_name}</p>
                                                        )}
                                                        {result.locked_at && (
                                                            <p className="text-[10px] text-white/30">
                                                                {new Date(result.locked_at).toLocaleString()}
                                                            </p>
                                                        )}
                                                    </>
                                                ) : (
                                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                        <Unlock size={12} />
                                                        <span className="text-xs font-bold">Unlocked</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4 text-right text-xs text-white/40">
                                            {new Date(result.created_at).toLocaleDateString()}
                                        </td>
                                        {/* ── Server-side Marksheet download ── */}
                                        <td className="p-4 text-center">
                                            <button
                                                onClick={() => downloadMarksheet(result.group_id, result.group_name)}
                                                disabled={downloadingId === result.group_id}
                                                title="Download SPPU Marksheet PDF"
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/25 transition-all disabled:opacity-50"
                                            >
                                                {downloadingId === result.group_id
                                                    ? <Loader2 size={12} className="animate-spin" />
                                                    : <FileText size={12} />}
                                                {downloadingId === result.group_id ? 'Generating…' : 'Marksheet'}
                                            </button>
                                        </td>
                                        {isCoordinator && (
                                            <td className="p-4 text-center">
                                                <button
                                                    onClick={() => handleToggleLock(result.eval_id, result.is_locked)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 mx-auto ${
                                                        result.is_locked
                                                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                                                            : 'bg-orange-500/20 text-orange-400 border border-orange-500/30 hover:bg-orange-500/30'
                                                    }`}
                                                >
                                                    {result.is_locked ? (
                                                        <><Unlock size={12} /> Unlock</>
                                                    ) : (
                                                        <><Lock size={12} /> Lock</>
                                                    )}
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </AppShell>
    );
};
