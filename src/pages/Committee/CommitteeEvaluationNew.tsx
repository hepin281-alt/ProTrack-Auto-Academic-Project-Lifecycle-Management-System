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
 const [activeTab, setActiveTab] = useState<'queue' | 'grading' | 'past'>('queue');
 const [selectedGroup, setSelectedGroup] = useState<any | null>(null);
 const [scores, setScores] = useState<EvaluationState>({});
 const [activePhase, setActivePhase] = useState<'REVIEW_1' | 'REVIEW_2' | 'REVIEW_3' | 'FINAL'>('FINAL');
 const [allEvaluations, setAllEvaluations] = useState<any[]>([]);
 const [evaluatedGroups, setEvaluatedGroups] = useState<string[]>([]);
 const [pastEvaluations, setPastEvaluations] = useState<any[]>([]);
 const [allSchedules, setAllSchedules] = useState<any[]>([]);
 const [activeGroups, setActiveGroups] = useState<any[]>([]);
 const [isLoading, setIsLoading] = useState(false);
 const [generalFeedback, setGeneralFeedback] = useState('');
 const [isDictating, setIsDictating] = useState(false);
 
 // Rubrics State
 const [rubricTemplates, setRubricTemplates] = useState<any[]>([]);
 const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);

 // Backchannel state
 const [backchannelMessages, setBackchannelMessages] = useState<{sender: string, text: string}[]>([
 { sender: 'Dr. Smith', text: 'This group seems to have a weak literature survey.' }
 ]);
 const [newChatMsg, setNewChatMsg] = useState('');
 
 // Web Speech API
 const recognitionRef = useRef<any>(null);

 React.useEffect(() => {
 const fetchGroupsAndRubrics = async () => {
 if (!token) return;
 try {
 setIsLoading(true);
 const [groups, evals, rubrics, schedules] = await Promise.all([
 api.getGroups(token, 'ACTIVE').catch((err) => { console.error('getGroups failed:', err); return []; }),
 api.getEvaluations(token).catch((err) => { console.error('getEvaluations failed:', err); return []; }),
 api.getRubrics(token).catch((err) => { console.error('getRubrics failed:', err); return []; }),
 api.getSchedules(token).catch((err) => { console.error('getSchedules failed:', err); return []; })
 ]);
 setActiveGroups(groups);
 setAllEvaluations(evals);
 setRubricTemplates(rubrics);
 setAllSchedules(schedules || []);
 } catch (error) {
 console.error('Failed to fetch evaluation data:', error);
 } finally {
 setIsLoading(false);
 }
 };
 fetchGroupsAndRubrics();
 }, [token]);

 React.useEffect(() => {
 // Filter evaluations for the current activePhase
 const phaseEvals = allEvaluations.filter(e => e.phase === activePhase);
 setEvaluatedGroups(phaseEvals.map(e => e.group_id));
 setPastEvaluations(phaseEvals);

 // Auto-select a rubric for the current phase if available
 if (rubricTemplates.length > 0) {
 const phaseRubrics = rubricTemplates.filter(r => r.target_phase === activePhase);
 setSelectedTemplate(phaseRubrics.length > 0 ? phaseRubrics[0] : null);
 } else {
 setSelectedTemplate(null);
 }
 }, [activePhase, allEvaluations, rubricTemplates]);

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
 const maxScore = selectedTemplate?.schema?.find((c: any) => c.name === criteria)?.maxMarks || 0;
 setScores({
 ...scores,
 [criteria]: Math.min(numValue, maxScore),
 });
 };

 const calculateTotal = () => {
 if (!selectedTemplate || !selectedTemplate.schema) return 0;
 return selectedTemplate.schema.reduce((total: number, item: any) => 
 total + (scores[item.name] || 0), 0);
 };

 const totalScore = calculateTotal().toFixed(2);
 const maxTotalScore = selectedTemplate?.schema?.reduce((sum: number, c: any) => sum + (c.maxMarks || 0), 0) || 100;

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
 await api.submitEvaluation(token, selectedGroup.group_id, activePhase, scores, parseFloat(totalScore));
 
 // Add the new evaluation to local state so UI updates instantly
 const newEval = { group_id: selectedGroup.group_id, phase: activePhase, rubric_scores: scores, total_marks: parseFloat(totalScore) };
 setAllEvaluations([...allEvaluations, newEval]);
 
 setEvaluatedGroups([...evaluatedGroups, selectedGroup.group_id]);
 setSelectedGroup(null);
 setScores({});
 setGeneralFeedback('');
 setActiveTab('queue');
 } catch (error) {
 console.error("Failed to submit evaluation");
 }
 }
 };

 const tabs = [
 { id: 'queue' as const, label: 'Evaluation Queue' },
 { id: 'grading' as const, label: 'Live Grading Sheet' }
 ];

 return (
 <AppShell currentPage="/committee/evaluations">
 {/* Header */}
 <div className="mb-6">
 <div className="flex items-center gap-3 mb-2">
 <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-500">
 <Trophy size={18} className="text-white" />
 </div>
 <h1 className="text-2xl font-black text-white">Project Evaluations</h1>
 </div>
 <p className="text-white/50 text-sm ml-11 mb-6">Review and grade final project submissions</p>

 {/* Phase Master Tabs */}
 <div className="flex gap-3 ml-11">
 {[
 { id: 'REVIEW_1', label: 'REVIEW 1' },
 { id: 'REVIEW_2', label: 'REVIEW 2' },
 { id: 'REVIEW_3', label: 'REVIEW 3' },
 { id: 'FINAL', label: 'FINAL' }
 ].map(phase => (
 <button
 key={phase.id}
 onClick={() => setActivePhase(phase.id as any)}
 className={`px-6 py-2 rounded-full text-xs font-bold tracking-wider transition-all border ${
 activePhase === phase.id
 ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300'
 : 'bg-transparent border-white/[0.08] text-white/50 hover:border-white/[0.08] hover:text-white/50'
 }`}
 >
 {phase.label}
 </button>
 ))}
 </div>
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
 <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest">To Evaluate</h3>
 <span className="px-2.5 py-1 text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg">
 {activeGroups.filter(g => allSchedules.some(s => s.phase === activePhase && s.group_id === g.group_id) && !evaluatedGroups.includes(g.group_id)).length}
 </span>
 </div>
 <div className="space-y-2">
 {isLoading ? (
 <p className="text-xs text-white/50">Loading groups...</p>
 ) : (
 activeGroups.filter(g => allSchedules.some(s => s.phase === activePhase && s.group_id === g.group_id) && !evaluatedGroups.includes(g.group_id)).map(group => {
 const schedule = allSchedules.find(s => s.phase === activePhase && s.group_id === group.group_id);
 return (
 <div
 key={group.group_id}
 onClick={() => { setSelectedGroup(group); setActiveTab('grading'); }}
 className="rounded-xl p-4 bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] hover:border-amber-500/30 transition-all cursor-pointer group/card flex items-center justify-between"
 >
 <div>
 <h4 className="text-sm font-bold text-white group-hover/card:text-amber-400 transition-colors">{group.group_name}</h4>
 <p className="text-xs text-white/50 flex items-center gap-1 mt-1">
 <Clock size={12} /> Scheduled: {schedule ? new Date(schedule.presentation_time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : ''} {schedule?.venue ? `at ${schedule.venue}` : ''}
 </p>
 </div>
 <Star size={16} className="text-white/20 group-hover/card:text-amber-400 transition-colors" />
 </div>
 )})
 )}
 </div>
 </div>

 {/* Evaluated */}
 <div>
 <div className="flex items-center justify-between mb-4">
 <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest">Evaluated</h3>
 <span className="px-2.5 py-1 text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg">
 {pastEvaluations.length}
 </span>
 </div>
 <div className="space-y-3">
 {pastEvaluations.map((evalItem: any) => {
 const group = activeGroups.find(g => g.group_id === evalItem.group_id);
 return (
 <div key={evalItem.eval_id} className="flex flex-col items-start justify-between p-4 rounded-xl bg-emerald-500/[0.04] border border-emerald-500/[0.15]">
 <div className="w-full flex items-center justify-between mb-3">
 <div>
 <div className="flex items-center gap-2 mb-0.5">
 <h3 className="text-sm font-bold text-white">{group?.group_name || `Group ${evalItem.group_id.slice(0, 4)}`}</h3>
 {evalItem.is_locked && (
 <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
 LOCKED
 </span>
 )}
 </div>
 <p className="text-[10px] font-bold text-emerald-400/50 uppercase tracking-widest">Total Score: {evalItem.total_marks}</p>
 </div>
 <CheckCircle size={18} className="text-emerald-400/50" />
 </div>
 <button
 onClick={() => {
 if (evalItem.is_locked) {
 alert("This evaluation is locked and cannot be edited.");
 return;
 }
 setSelectedGroup(group);
 setScores(evalItem.rubric_scores || {});
 setActiveTab('grading');
 }}
 className="w-full py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-lg transition-all border border-emerald-500/20"
 >
 Edit Grades
 </button>
 </div>
 );
 })}
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
 <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest mb-4">Project Info</h3>
 <div className="space-y-4">
 <div>
 <p className="text-[10px] text-white/50 uppercase tracking-wider mb-1">Project Title</p>
 <p className="text-sm font-semibold text-white">{selectedGroup?.group_name}</p>
 </div>
 <div>
 <p className="text-[10px] text-white/50 uppercase tracking-wider mb-1">Team Members</p>
 <p className="text-sm text-white/50">{selectedGroup?.member_count || 0} students</p>
 </div>
 <div>
 <p className="text-[10px] text-white/50 uppercase tracking-wider mb-2">Past Logbooks</p>
 <div className="space-y-1.5">
 {groupLogbooks.length === 0 ? (
 <p className="text-xs text-white/50">No logbooks submitted.</p>
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
 <div className="bg-white/5 rounded-xl border border-white/[0.08] p-3 space-y-3 max-h-48 overflow-y-auto mb-3">
 {backchannelMessages.map((msg, i) => (
 <div key={i} className={`flex flex-col ${msg.sender === 'You' ? 'items-end' : 'items-start'}`}>
 <span className="text-[9px] text-white/50 font-bold mb-0.5">{msg.sender}</span>
 <div className={`px-2.5 py-1.5 rounded-lg text-xs ${msg.sender === 'You' ? 'bg-indigo-500/20 text-indigo-100' : 'bg-white/[0.04] /10 text-white/50'}`}>
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
 className="flex-1 bg-white/5 border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-white/25 focus:outline-none focus:border-indigo-500/50"
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
 <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest">Evaluation Rubric</h3>
 </div>

 {/* Dynamic Rubric Selection */}
 <div className="mb-6 bg-white/5 border border-white/[0.08] p-4 rounded-xl">
 <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">Select Evaluation Rubric</label>
 {rubricTemplates.length === 0 ? (
 <div className="text-sm text-amber-400 font-semibold bg-amber-400/10 p-3 rounded-lg">
 No rubrics found. Please contact the Coordinator to create grading rubrics.
 </div>
 ) : (
 <select
 className="w-full bg-white/5 border border-white/[0.08] rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-amber-500/50 appearance-none"
 value={selectedTemplate?.template_id || ''}
 onChange={(e) => {
 const tpl = rubricTemplates.find(t => t.template_id === e.target.value);
 setSelectedTemplate(tpl || null);
 setScores({}); // Reset scores on template change
 }}
 >
 {rubricTemplates.filter(tpl => tpl.target_phase === activePhase).map(tpl => (
 <option key={tpl.template_id} value={tpl.template_id} className="bg-gray-900 text-white">
 {tpl.name}
 </option>
 ))}
 </select>
 )}
 </div>

 <div className="space-y-3 mb-6 max-h-80 overflow-y-auto pr-1">
 {!selectedTemplate ? (
 <div className="p-6 rounded-xl bg-white/[0.04] border border-white/[0.08][0.06] text-center">
 <p className="text-white/50 text-sm">No rubric template found for {activePhase.replace('_', ' ')}.</p>
 </div>
 ) : (
 selectedTemplate?.schema?.map((item: any, idx: number) => (
 <div key={idx} className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.08][0.06]">
 <div className="flex items-center justify-between mb-2.5">
 <label className="text-sm font-semibold text-white/50">{item.name}</label>
 <span className="text-xs font-bold text-white/50">{scores[item.name] || 0}/{item.maxMarks}</span>
 </div>
 <input
 type="number"
 min="0"
 max={item.maxMarks}
 value={scores[item.name] || ''}
 onChange={(e) => handleScoreChange(item.name, e.target.value)}
 className="w-full px-3 py-2 bg-white/5 border border-white/[0.08] text-white placeholder:text-white/25 rounded-lg text-sm focus:outline-none focus:border-amber-400/50 transition-all"
 placeholder={`0 – ${item.maxMarks}`}
 />
 </div>
 ))
 )}
 </div>

 {/* General Feedback with Voice Dictation */}
 <div className="mb-6">
 <div className="flex items-center justify-between mb-2">
 <label className="text-xs font-bold text-white/50 uppercase tracking-widest">General Remarks</label>
 <button 
 onClick={toggleDictation}
 className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold transition-colors ${
 isDictating ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-white/[0.04] /10 text-white/50 hover:bg-white/5/20'
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
 className="w-full h-24 bg-white/5 border border-white/[0.08] rounded-xl p-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-amber-400/50 resize-none"
 ></textarea>
 </div>

 {/* Total Score */}
 <div className="rounded-2xl p-5 mb-5 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20 text-center">
 <p className="text-xs font-bold text-amber-400/60 uppercase tracking-widest mb-1">Total Score</p>
 <p className="text-5xl font-black text-white">{totalScore}</p>
 <p className="text-xs text-white/50 mt-1">out of {maxTotalScore} points</p>
 </div>

 <div className="flex gap-3">
 <button
 onClick={() => { setSelectedGroup(null); setScores({}); setActiveTab('queue'); }}
 className="flex-1 px-4 py-2.5 text-sm text-white/50 border border-white/[0.08] rounded-xl hover:bg-white/5 font-semibold transition-all"
 >
 Cancel
 </button>
 <button
 onClick={handleSubmitEvaluation}
 disabled={parseFloat(totalScore) === 0}
 className="flex-1 px-4 py-2.5 text-sm bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-500/25 font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
 >
 Submit Grade <CheckCircle size={16} />
 </button>
 </div>
 </div>
 </div>
 )}

 {activeTab === 'grading' && !selectedGroup && (
 <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-16 text-center">
 <Trophy size={40} className="text-white/50 mx-auto mb-3" />
 <p className="text-sm text-white/50">Select a group from the queue to begin grading</p>
 <button onClick={() => setActiveTab('queue')} className="mt-4 text-xs text-amber-400 hover:text-amber-300 font-semibold transition-colors">
 ← Go to Queue
 </button>
 </div>
 )}

 </AppShell>
 );
};
