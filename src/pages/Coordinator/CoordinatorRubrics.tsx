import React, { useState, useEffect } from 'react';
import { AppShell } from '../../layouts/AppShell';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/apiClient';
import { FileEdit, Plus, Trash2, Save, Loader2, ListChecks } from 'lucide-react';

interface Criterion {
 id: string;
 name: string;
 maxMarks: number;
}

export const CoordinatorRubrics: React.FC = () => {
 const { token } = useAuthStore();
 const [rubrics, setRubrics] = useState<any[]>([]);
 const [isLoading, setIsLoading] = useState(false);
 
 // Builder State
 const [templateName, setTemplateName] = useState('');
 const [targetPhase, setTargetPhase] = useState('FINAL');
 const [criteria, setCriteria] = useState<Criterion[]>([
 { id: '1', name: 'Originality', maxMarks: 10 },
 { id: '2', name: 'Technical Complexity', maxMarks: 20 },
 ]);
 const [isSaving, setIsSaving] = useState(false);

 useEffect(() => {
 fetchRubrics();
 }, [token]);

 const fetchRubrics = async () => {
 if (!token) return;
 setIsLoading(true);
 try {
 const data = await api.getRubrics(token);
 setRubrics(Array.isArray(data) ? data : []);
 } catch (err) {
 console.error('Failed to fetch rubrics');
 } finally {
 setIsLoading(false);
 }
 };

 const handleAddCriterion = () => {
 setCriteria([...criteria, { id: Math.random().toString(), name: '', maxMarks: 10 }]);
 };

 const handleRemoveCriterion = (id: string) => {
 setCriteria(criteria.filter(c => c.id !== id));
 };

 const handleUpdateCriterion = (id: string, field: keyof Criterion, value: string | number) => {
 setCriteria(criteria.map(c => c.id === id ? { ...c, [field]: value } : c));
 };

 const handleSaveRubric = async () => {
 if (!token || !templateName.trim()) return;
 try {
 setIsSaving(true);
 await api.saveRubric(token, templateName, criteria, targetPhase);
 setTemplateName('');
 setCriteria([{ id: '1', name: 'Originality', maxMarks: 10 }]);
 fetchRubrics();
 } catch (err) {
 console.error('Failed to save rubric');
 } finally {
 setIsSaving(false);
 }
 };

 const handleDeleteRubric = async (id: string) => {
 if (!token || !window.confirm('Are you sure you want to delete this rubric?')) return;
 try {
 await api.deleteRubric(token, id);
 fetchRubrics();
 } catch (err) {
 console.error('Failed to delete rubric');
 }
 };

 const handleEditRubric = (rubric: any) => {
 setTemplateName(rubric.name);
 setCriteria(rubric.schema || []);
 setTargetPhase(rubric.target_phase || 'FINAL');
 window.scrollTo({ top: 0, behavior: 'smooth' });
 };

 const totalMarks = criteria.reduce((sum, c) => sum + (Number(c.maxMarks) || 0), 0);

 return (
 <AppShell currentPage="/coordinator/rubrics">
 <div className="mb-8 flex items-center justify-between">
 <div>
 <div className="flex items-center gap-3 mb-2">
 <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500">
 <ListChecks size={18} className="text-white" />
 </div>
 <h1 className="text-2xl font-black text-white">Evaluation Rubrics</h1>
 </div>
 <p className="text-white/50 text-sm ml-11">Build and manage evaluation criteria for committee presentations</p>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
 {/* Builder Panel */}
 <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-6">
 <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
 <FileEdit size={18} className="text-cyan-400" />
 Rubric Builder
 </h2>

 <div className="space-y-6">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">Template Name</label>
 <input
 type="text"
 value={templateName}
 onChange={(e) => setTemplateName(e.target.value)}
 placeholder="e.g. Phase 2 Review"
 className="w-full bg-white/5 border border-white/[0.08] rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
 />
 </div>
 <div>
 <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">Target Phase</label>
 <select
 value={targetPhase}
 onChange={(e) => setTargetPhase(e.target.value)}
 className="w-full bg-white/5 border border-white/[0.08] rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/50 appearance-none"
 >
 <option value="REVIEW_1">Review 1</option>
 <option value="REVIEW_2">Review 2</option>
 <option value="REVIEW_3">Review 3</option>
 <option value="FINAL">Final Presentation</option>
 </select>
 </div>
 </div>

 <div className="space-y-3">
 <label className="block text-xs font-bold text-white/50 uppercase tracking-widest flex justify-between items-end">
 <span>Criteria List</span>
 <span className="text-cyan-400">Total Marks: {totalMarks}</span>
 </label>
 
 {criteria.map((c, idx) => (
 <div key={c.id} className="flex items-center gap-3 bg-white/5 border border-white/[0.08] p-3 rounded-xl">
 <span className="text-white/50 font-bold w-6 text-center">{idx + 1}</span>
 <input
 type="text"
 value={c.name}
 onChange={(e) => handleUpdateCriterion(c.id, 'name', e.target.value)}
 placeholder="Criterion Name"
 className="flex-1 bg-transparent border-none text-white text-sm focus:outline-none"
 />
 <input
 type="number"
 value={c.maxMarks}
 onChange={(e) => handleUpdateCriterion(c.id, 'maxMarks', parseInt(e.target.value) || 0)}
 className="w-16 bg-white/5 border border-white/[0.08] rounded-lg px-2 py-1 text-white text-sm text-center focus:outline-none focus:border-cyan-500/50"
 min="1"
 />
 <button 
 onClick={() => handleRemoveCriterion(c.id)}
 className="p-1.5 text-white/50 hover:text-red-400 hover:bg-white/[0.04] /10 rounded-lg transition-colors"
 >
 <Trash2 size={14} />
 </button>
 </div>
 ))}
 
 <button
 onClick={handleAddCriterion}
 className="w-full py-3 border border-dashed border-white/[0.08] rounded-xl text-white/50 hover:text-white hover:border-white/[0.08] hover:bg-white/5 transition-all flex items-center justify-center gap-2 text-sm font-semibold"
 >
 <Plus size={16} /> Add Criterion
 </button>
 </div>

 <button
 onClick={handleSaveRubric}
 disabled={isSaving || !templateName.trim() || criteria.length === 0}
 className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
 >
 {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
 Save Rubric Template
 </button>
 </div>
 </div>

 {/* Existing Rubrics Panel */}
 <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] flex flex-col max-h-[calc(100vh-12rem)]">
 <div className="p-6 border-b border-white/[0.08][0.06]">
 <h2 className="text-lg font-bold text-white">Saved Templates</h2>
 </div>
 <div className="flex-1 overflow-y-auto p-6 space-y-4">
 {isLoading ? (
 <div className="flex justify-center text-white/50 py-8">
 <Loader2 size={24} className="animate-spin" />
 </div>
 ) : rubrics.length === 0 ? (
 <div className="text-center text-white/50 py-8 text-sm">
 No rubric templates found. Create one to get started.
 </div>
 ) : (
 rubrics.map(rubric => (
 <div key={rubric.template_id} className="bg-white/5 border border-white/[0.08] p-5 rounded-xl">
 <div className="flex items-start justify-between mb-3">
 <div className="flex-1">
 <h3 className="font-bold text-white">{rubric.name}</h3>
 <div className="flex items-center gap-2 mt-1">
 <span className="bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded text-[10px] font-bold inline-block">
 {rubric.target_phase?.replace('_', ' ') || 'FINAL'}
 </span>
 <span className="bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded text-[10px] font-bold inline-block">
 {rubric.schema?.reduce((sum: number, c: any) => sum + (c.maxMarks || 0), 0) || 0} Marks
 </span>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <button 
 onClick={() => handleEditRubric(rubric)}
 className="p-1.5 text-white/50 hover:text-cyan-400 hover:bg-white/[0.04] /10 rounded-lg transition-colors"
 title="Edit Template"
 >
 <FileEdit size={14} />
 </button>
 <button 
 onClick={() => handleDeleteRubric(rubric.template_id)}
 className="p-1.5 text-white/50 hover:text-red-400 hover:bg-white/[0.04] /10 rounded-lg transition-colors"
 title="Delete Template"
 >
 <Trash2 size={14} />
 </button>
 </div>
 </div>
 <div className="space-y-1.5">
 {(rubric.schema || []).map((c: any, i: number) => (
 <div key={i} className="flex justify-between text-xs">
 <span className="text-white/50">• {c.name}</span>
 <span className="text-white/50">{c.maxMarks}</span>
 </div>
 ))}
 </div>
 </div>
 ))
 )}
 </div>
 </div>
 </div>
 </AppShell>
 );
};
