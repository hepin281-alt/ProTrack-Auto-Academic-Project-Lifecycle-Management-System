import React, { useState, useRef } from 'react';
import { AppShell } from '../../layouts/AppShell';
import { CheckCircle, Clock, Trophy, Star, Mic, MicOff, MessageSquare, Send } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/apiClient';

interface EvaluationItem {
    criteria: string;
    maxScore: number;
    weight: number;
}

interface EvaluationState {
    [key: string]: number;
}

export const CommitteeEvaluationNew: React.FC = () => {
    const { token } = useAuthStore();
    const [activeTab, setActiveTab] = useState<'queue' | 'grading'>('queue');
    const [selectedGroup, setSelectedGroup] = useState<any | null>(null);
    const [scores, setScores] = useState<EvaluationState>({});
    const [evaluatedGroups, setEvaluatedGroups] = useState<string[]>([]);
    const [activeGroups, setActiveGroups] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [generalFeedback, setGeneralFeedback] = useState('');
    const [isDictating, setIsDictating] = useState(false);
    const [hasConflict, setHasConflict] = useState(false);
    
    // Backchannel state
    const [backchannelMessages, setBackchannelMessages] = useState<{sender: string, text: string}[]>([
        { sender: 'Dr. Smith', text: 'This group seems to have a weak literature survey.' }
    ]);
    const [newChatMsg, setNewChatMsg] = useState('');
    
    // Web Speech API
    const recognitionRef = useRef<any>(null);

    const evaluationCriteria: EvaluationItem[] = [
        { criteria: 'Literature Survey', maxScore: 5, weight: 0.1 },
        { criteria: 'Problem Statement', maxScore: 5, weight: 0.1 },
        { criteria: 'Technical Design', maxScore: 20, weight: 0.25 },
        { criteria: 'Implementation', maxScore: 30, weight: 0.35 },
        { criteria: 'Testing & Documentation', maxScore: 15, weight: 0.15 },
        { criteria: 'Presentation', maxScore: 10, weight: 0.1 },
    ];

    React.useEffect(() => {
        const fetchGroups = async () => {
            if (!token) return;
            try {
                setIsLoading(true);
                const groups = await api.getGroups(token, 'ACTIVE');
                setActiveGroups(groups);
                const evals = await api.getEvaluations(token);
                const finalEvals = evals.filter(e => e.phase === 'FINAL');
                setEvaluatedGroups(finalEvals.map(e => e.group_id));
            } catch (error) {
                console.error("Failed to fetch evaluation data");
            } finally {
                setIsLoading(false);
            }
        };
        fetchGroups();
    }, [token]);

    const [groupLogbooks, setGroupLogbooks] = useState<any[]>([]);

    React.useEffect(() => {
        if (selectedGroup && token) {
            api.getLogbooks(token, selectedGroup.group_id).then(res => {
                const logs = Array.isArray(res) ? res : (res as any).logbooks || [];
                setGroupLogbooks(logs);
            }).catch(_err => console.error("Failed to fetch group logbooks"));
        } else {
            setGroupLogbooks([]);
        }
    }, [selectedGroup, token]);

    const handleScoreChange = (criteria: string, value: string) => {
        const numValue = parseFloat(value) || 0;
        setScores({
            ...scores,
            [criteria]: Math.min(numValue, evaluationCriteria.find(c => c.criteria === criteria)?.maxScore || 0),
        });
    };

    const calculateTotal = () =>
        evaluationCriteria.reduce((total, item) =>
            total + ((scores[item.criteria] || 0) / item.maxScore) * item.weight * 100, 0);

    const totalScore = calculateTotal().toFixed(2);

    const toggleDictation = () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert('Your browser does not support Voice Dictation (Web Speech API). Please use Chrome.');
            return;
        }

        if (isDictating) {
            recognitionRef.current?.stop();
            setIsDictating(false);
            return;
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event: any) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                }
            }
            if (finalTranscript) {
                setGeneralFeedback(prev => prev + (prev ? ' ' : '') + finalTranscript);
            }
        };

        recognition.onend = () => {
            setIsDictating(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
        setIsDictating(true);
    };

    const handleSendChat = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newChatMsg.trim()) return;
        setBackchannelMessages([...backchannelMessages, { sender: 'You', text: newChatMsg }]);
        setNewChatMsg('');
    };

    const handleSubmitEvaluation = async () => {
        if (selectedGroup && token) {
            try {
                // Incorporate generalFeedback if backend supported it, else just logs
                await api.submitEvaluation(token, selectedGroup.group_id, 'FINAL', scores, parseFloat(totalScore));
                setEvaluatedGroups([...evaluatedGroups, selectedGroup.group_id]);
                setSelectedGroup(null);
                setScores({});
                setGeneralFeedback('');
                setHasConflict(false);
                setActiveTab('queue');
            } catch (error) {
                console.error("Failed to submit evaluation");
            }
        }
    };

    const tabs = [
        { id: 'queue' as const, label: 'Evaluation Queue' },
        { id: 'grading' as const, label: 'Live Grading Sheet' },
    ];

    return (
        <AppShell currentPage="/committee/dashboard">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-500">
                        <Trophy size={18} className="text-white" />
                    </div>
                    <h1 className="text-2xl font-black text-white">Project Evaluations</h1>
                </div>
                <p className="text-white/40 text-sm ml-11">Review and grade final project submissions</p>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.08] w-fit mb-8">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                            activeTab === tab.id
                                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-lg'
                                : 'text-white/50 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Queue View */}
            {activeTab === 'queue' && (
                <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-6">
                    <h2 className="text-sm font-bold text-white mb-6">Today's Evaluations</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* To Evaluate */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest">To Evaluate</h3>
                                <span className="px-2.5 py-1 text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg">
                                    {activeGroups.filter(g => !evaluatedGroups.includes(g.group_id)).length}
                                </span>
                            </div>
                            <div className="space-y-2">
                                {isLoading ? (
                                    <p className="text-xs text-white/40">Loading groups...</p>
                                ) : activeGroups.filter(g => !evaluatedGroups.includes(g.group_id)).map(group => (
                                    <div
                                        key={group.group_id}
                                        onClick={() => { setSelectedGroup(group); setActiveTab('grading'); }}
                                        className="flex items-center justify-between p-4 rounded-xl bg-amber-500/[0.06] border border-amber-500/[0.15] cursor-pointer hover:bg-amber-500/[0.1] hover:border-amber-500/[0.25] transition-all group"
                                    >
                                        <div>
                                            <p className="text-sm font-semibold text-white group-hover:text-amber-300 transition-colors">{group.group_name}</p>
                                            <p className="text-xs text-white/35 mt-0.5 flex items-center gap-1">
                                                <Clock size={10} /> Ready for evaluation
                                            </p>
                                        </div>
                                        <Star size={15} className="text-amber-400/40 group-hover:text-amber-400 transition-colors" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Evaluated */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest">Evaluated</h3>
                                <span className="px-2.5 py-1 text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg">
                                    {evaluatedGroups.length}
                                </span>
                            </div>
                            <div className="space-y-2">
                                {activeGroups.filter(g => evaluatedGroups.includes(g.group_id)).map(group => (
                                    <div key={group.group_id} className="flex items-center justify-between p-4 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/[0.15]">
                                        <p className="text-sm font-semibold text-white/70">{group.group_name}</p>
                                        <CheckCircle size={16} className="text-emerald-400" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Grading Sheet */}
            {activeTab === 'grading' && selectedGroup && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Project Info */}
                    <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-5">
                        <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4">Project Info</h3>
                        <div className="space-y-4">
                            <div>
                                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Project Title</p>
                                <p className="text-sm font-semibold text-white">{selectedGroup?.group_name}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Team Members</p>
                                <p className="text-sm text-white/70">{selectedGroup?.member_count || 0} students</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Past Logbooks</p>
                                <div className="space-y-1.5">
                                    {groupLogbooks.length === 0 ? (
                                        <p className="text-xs text-white/30">No logbooks submitted.</p>
                                    ) : (
                                        groupLogbooks.map((log: any) => (
                                            <button key={log.log_id} className="text-xs text-amber-400 hover:text-amber-300 font-semibold block transition-colors">
                                                Week {log.week_number} Logbook ({log.guide_status}) →
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                            
                            {/* Private Backchannel */}
                            <div className="mt-6 pt-6 border-t border-white/[0.08]">
                                <h4 className="text-[10px] text-indigo-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                    <MessageSquare size={12} /> Committee Backchannel
                                </h4>
                                <div className="bg-black/20 rounded-xl border border-white/5 p-3 space-y-3 max-h-48 overflow-y-auto mb-3">
                                    {backchannelMessages.map((msg, i) => (
                                        <div key={i} className={`flex flex-col ${msg.sender === 'You' ? 'items-end' : 'items-start'}`}>
                                            <span className="text-[9px] text-white/30 font-bold mb-0.5">{msg.sender}</span>
                                            <div className={`px-2.5 py-1.5 rounded-lg text-xs ${msg.sender === 'You' ? 'bg-indigo-500/20 text-indigo-100' : 'bg-white/10 text-white/80'}`}>
                                                {msg.text}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <form onSubmit={handleSendChat} className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={newChatMsg}
                                        onChange={e => setNewChatMsg(e.target.value)}
                                        placeholder="Private message..."
                                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-white/25 focus:outline-none focus:border-indigo-500/50"
                                    />
                                    <button type="submit" disabled={!newChatMsg.trim()} className="p-1.5 bg-indigo-500/20 text-indigo-400 rounded-lg disabled:opacity-50">
                                        <Send size={14} />
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>

                    {/* Rubric */}
                    <div className="lg:col-span-2 rounded-2xl bg-white/[0.04] border border-white/[0.08] p-5">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest">Evaluation Rubric</h3>
                            <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
                                <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Conflict of Interest?</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={hasConflict} onChange={() => setHasConflict(!hasConflict)} className="sr-only peer" />
                                    <div className="w-8 h-4 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-red-500"></div>
                                </label>
                            </div>
                        </div>

                        {hasConflict ? (
                            <div className="mb-6 p-6 rounded-xl bg-red-500/5 border border-red-500/20 text-center">
                                <p className="text-sm font-bold text-red-400 mb-1">Evaluation Disabled</p>
                                <p className="text-xs text-white/50">You have declared a conflict of interest for this group. You cannot grade them.</p>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-3 mb-6 max-h-80 overflow-y-auto pr-1">
                                    {evaluationCriteria.map((item, idx) => (
                                        <div key={idx} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                                            <div className="flex items-center justify-between mb-2.5">
                                                <label className="text-sm font-semibold text-white/80">{item.criteria}</label>
                                                <span className="text-xs font-bold text-white/40">{scores[item.criteria] || 0}/{item.maxScore}</span>
                                            </div>
                                            <input
                                                type="number"
                                                min="0"
                                                max={item.maxScore}
                                                value={scores[item.criteria] || ''}
                                                onChange={(e) => handleScoreChange(item.criteria, e.target.value)}
                                                className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white placeholder:text-white/25 rounded-lg text-sm focus:outline-none focus:border-amber-400/50 transition-all"
                                                placeholder={`0 – ${item.maxScore}`}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}

                        {/* General Feedback with Voice Dictation */}
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs font-bold text-white/40 uppercase tracking-widest">General Remarks</label>
                                <button 
                                    onClick={toggleDictation}
                                    className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold transition-colors ${
                                        isDictating ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-white/10 text-white/50 hover:bg-white/20'
                                    }`}
                                >
                                    {isDictating ? <MicOff size={12} /> : <Mic size={12} />}
                                    {isDictating ? 'Stop Dictating' : 'Voice Dictate'}
                                </button>
                            </div>
                            <textarea
                                value={generalFeedback}
                                onChange={e => setGeneralFeedback(e.target.value)}
                                placeholder="Write or dictate qualitative feedback..."
                                className="w-full h-24 bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-amber-400/50 resize-none"
                            ></textarea>
                        </div>

                        {/* Total Score */}
                        <div className="rounded-2xl p-5 mb-5 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20 text-center">
                            <p className="text-xs font-bold text-amber-400/60 uppercase tracking-widest mb-1">Total Score</p>
                            <p className="text-5xl font-black text-white">{totalScore}</p>
                            <p className="text-xs text-white/30 mt-1">out of 100 points</p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => { setSelectedGroup(null); setScores({}); setHasConflict(false); setActiveTab('queue'); }}
                                className="flex-1 px-4 py-2.5 text-sm text-white/50 border border-white/10 rounded-xl hover:bg-white/5 font-semibold transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmitEvaluation}
                                disabled={hasConflict}
                                className="flex-1 px-4 py-2.5 text-sm bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-500/25 font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Submit Evaluation
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'grading' && !selectedGroup && (
                <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-16 text-center">
                    <Trophy size={40} className="text-white/10 mx-auto mb-3" />
                    <p className="text-sm text-white/30">Select a group from the queue to begin grading</p>
                    <button onClick={() => setActiveTab('queue')} className="mt-4 text-xs text-amber-400 hover:text-amber-300 font-semibold transition-colors">
                        ← Go to Queue
                    </button>
                </div>
            )}
        </AppShell>
    );
};
