import React, { useState, useEffect } from 'react';
import { AppShell } from '../../layouts/AppShell';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/apiClient';
import { Kanban, Plus, AlertCircle, X, ChevronRight, Check, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Task {
    task_id: string;
    group_id: string;
    title: string;
    status: 'TODO' | 'IN_PROGRESS' | 'DONE';
    assigned_to?: string | null;
    assignee_name?: string | null;
}

export const StudentTasks: React.FC = () => {
    const { token } = useAuthStore();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [groupId, setGroupId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskAssignedTo, setNewTaskAssignedTo] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [members, setMembers] = useState<any[]>([]);
    
    // Drag and drop state
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

    useEffect(() => {
        const fetchGroupAndTasks = async () => {
            if (!token) return;
            try {
                setIsLoading(true);
                const groups = await api.getGroups(token);
                const active = groups.find((g: any) => g.status === 'ACTIVE' || g.status === 'WAITING_ALLOCATION');
                if (active) {
                    setGroupId(active.group_id);
                    const [groupTasks, groupMembers] = await Promise.all([
                        api.getTasks(token, active.group_id),
                        api.getMembers(token, active.group_id)
                    ]);
                    setTasks(groupTasks);
                    setMembers(groupMembers || []);
                } else {
                    setError('You do not have an active group to manage tasks.');
                }
            } catch (err) {
                setError('Failed to load tasks');
            } finally {
                setIsLoading(false);
            }
        };
        fetchGroupAndTasks();
    }, [token]);

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || !groupId || !newTaskTitle.trim()) return;
        
        try {
            const newTask = await api.createTask(token, groupId, newTaskTitle.trim(), newTaskAssignedTo || undefined);
            
            // Re-fetch to get assignee_name populated by backend view/join
            const groupTasks = await api.getTasks(token, groupId);
            setTasks(groupTasks);
            
            setNewTaskTitle('');
            setNewTaskAssignedTo('');
            setIsCreating(false);
        } catch (err) {
            console.error('Failed to create task:', err);
        }
    };

    const updateStatus = async (taskId: string, newStatus: 'TODO' | 'IN_PROGRESS' | 'DONE') => {
        if (!token) return;
        try {
            // Optimistic update
            setTasks(tasks.map(t => t.task_id === taskId ? { ...t, status: newStatus } : t));
            await api.updateTaskStatus(token, taskId, newStatus);
        } catch (err) {
            console.error('Failed to update status:', err);
            // Revert on error (could implement full refetch here)
        }
    };

    const deleteTask = async (taskId: string) => {
        if (!token || !confirm('Delete this task?')) return;
        try {
            setTasks(tasks.filter(t => t.task_id !== taskId));
            await api.deleteTask(token, taskId);
        } catch (err) {
            console.error('Failed to delete task:', err);
        }
    };

    // Drag and Drop Handlers
    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        setDraggedTaskId(taskId);
        e.dataTransfer.effectAllowed = 'move';
        // Hide the default drag image or keep it default, HTML5 handles this.
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // Necessary to allow dropping
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, newStatus: 'TODO' | 'IN_PROGRESS' | 'DONE') => {
        e.preventDefault();
        if (draggedTaskId) {
            const task = tasks.find(t => t.task_id === draggedTaskId);
            if (task && task.status !== newStatus) {
                updateStatus(draggedTaskId, newStatus);
            }
        }
        setDraggedTaskId(null);
    };

    const columns = [
        { id: 'TODO', label: 'To Do', color: 'border-blue-500/30 bg-blue-500/5', header: 'bg-blue-500/10 text-blue-300' },
        { id: 'IN_PROGRESS', label: 'In Progress', color: 'border-amber-500/30 bg-amber-500/5', header: 'bg-amber-500/10 text-amber-300' },
        { id: 'DONE', label: 'Done', color: 'border-emerald-500/30 bg-emerald-500/5', header: 'bg-emerald-500/10 text-emerald-300' }
    ];

    return (
        <AppShell currentPage="/student/tasks">
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30">
                            <Kanban size={20} className="text-blue-400" />
                        </div>
                        <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">Group Tasks</h1>
                    </div>
                    <p className="text-white/40 text-sm ml-[52px]">Manage your team's workflow</p>
                </div>
                {groupId && !isCreating && (
                    <button 
                        onClick={() => setIsCreating(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-bold rounded-xl hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:-translate-y-0.5 transition-all"
                    >
                        <Plus size={16} /> Add Task
                    </button>
                )}
            </div>

            {/* Progress Bar & Analytics */}
            {!isLoading && !error && tasks.length > 0 && (
                <div className="mb-8 bg-white/[0.02] border border-white/[0.05] p-5 rounded-2xl flex flex-col gap-3">
                    <div className="flex items-center justify-between text-sm">
                        <span className="font-bold text-white flex items-center gap-2">
                            <Target size={16} className="text-purple-400" />
                            Project Progress
                        </span>
                        <span className="text-white/50 font-semibold">
                            {tasks.filter(t => t.status === 'DONE').length} of {tasks.length} tasks completed
                        </span>
                    </div>
                    <div className="h-3 w-full bg-black/40 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-1000 ease-out"
                            style={{ width: `${Math.round((tasks.filter(t => t.status === 'DONE').length / tasks.length) * 100)}%` }}
                        />
                    </div>
                </div>
            )}

            {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-300">
                    <AlertCircle size={18} />
                    <span className="text-sm">{error}</span>
                </div>
            )}

            {isCreating && (
                <div className="mb-8 p-6 bg-slate-900/60 backdrop-blur-xl border border-white/[0.08] rounded-3xl animate-in fade-in slide-in-from-top-2 shadow-2xl">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-sm font-bold text-white tracking-wide">New Task</h3>
                        <button onClick={() => setIsCreating(false)} className="text-white/40 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-all">
                            <X size={16} />
                        </button>
                    </div>
                    <form onSubmit={handleCreateTask} className="flex flex-col md:flex-row gap-4">
                        <input
                            type="text"
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            placeholder="e.g. Implement login screen..."
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                            autoFocus
                        />
                        <select
                            value={newTaskAssignedTo}
                            onChange={(e) => setNewTaskAssignedTo(e.target.value)}
                            className="w-full md:w-48 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all appearance-none cursor-pointer"
                        >
                            <option value="" className="bg-slate-900">Unassigned</option>
                            {members.map((m: any) => (
                                <option key={m.student_id} value={m.student_id} className="bg-slate-900">
                                    {m.email ? m.email.split('@')[0] : (m.prn_no || 'Member')}
                                </option>
                            ))}
                        </select>
                        <button 
                            type="submit"
                            disabled={!newTaskTitle.trim()}
                            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] disabled:opacity-50 disabled:shadow-none text-white text-sm font-bold rounded-xl transition-all w-full md:w-auto"
                        >
                            Save Task
                        </button>
                    </form>
                </div>
            )}

            {!isLoading && !error && groupId && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {columns.map(col => {
                        const colTasks = tasks.filter(t => t.status === col.id);
                        return (
                            <div key={col.id} className={`flex flex-col rounded-2xl border ${col.color} overflow-hidden h-[calc(100vh-250px)]`}>
                                <div className={`px-4 py-3 border-b border-white/5 flex items-center justify-between ${col.header}`}>
                                    <h3 className="text-sm font-bold uppercase tracking-wider">{col.label}</h3>
                                    <span className="px-2 py-0.5 rounded-full bg-black/30 text-xs font-bold">{colTasks.length}</span>
                                </div>
                                <div 
                                    className="p-3 flex-1 overflow-y-auto space-y-3"
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, col.id as any)}
                                >
                                    <AnimatePresence mode="popLayout">
                                        {colTasks.map(task => (
                                            <motion.div 
                                                layout
                                                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
                                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                                key={task.task_id} 
                                                draggable
                                                onDragStart={(e: any) => handleDragStart(e, task.task_id)}
                                                className={`p-4 bg-white/[0.03] border border-white/10 rounded-2xl group hover:bg-white/[0.06] hover:border-white/20 hover:shadow-lg transition-all relative cursor-grab active:cursor-grabbing hover:-translate-y-0.5 ${draggedTaskId === task.task_id ? 'opacity-50 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : ''}`}
                                            >
                                                <button 
                                                    onClick={() => deleteTask(task.task_id)}
                                                    className="absolute top-3 right-3 text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/10 p-1.5 rounded-lg"
                                                >
                                                    <X size={14} />
                                                </button>
                                                
                                                <p className="text-sm font-semibold text-white mb-4 pr-6 leading-relaxed">{task.title}</p>
                                                
                                                <div className="flex items-center justify-between mt-auto border-t border-white/5 pt-3">
                                                    <div className="flex items-center gap-2">
                                                        {task.assignee_name || task.assigned_to ? (
                                                            <div className="flex items-center gap-2" title={task.assignee_name || 'Assigned'}>
                                                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-sm">
                                                                    <span className="text-[10px] font-bold text-white uppercase">
                                                                        {(task.assignee_name || 'U').charAt(0)}
                                                                    </span>
                                                                </div>
                                                                <span className="text-[10px] font-semibold text-white/40 max-w-[80px] truncate">
                                                                    {task.assignee_name ? task.assignee_name.split(' ')[0] : 'Assigned'}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[10px] font-semibold text-white/20 uppercase tracking-wider">Unassigned</span>
                                                        )}
                                                    </div>
                                                    
                                                    {/* We hide the manual Next/Back buttons when we have drag and drop, 
                                                        but keep them for accessibility if needed. For now, since we have drag-drop, 
                                                        let's keep the Next button for quick advancement but style it subtly. */}
                                                    <div className="flex items-center gap-2">
                                                        {col.id !== 'DONE' && (
                                                            <button 
                                                                onClick={() => updateStatus(task.task_id, col.id === 'TODO' ? 'IN_PROGRESS' : 'DONE')}
                                                                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold transition-colors"
                                                            >
                                                                Next <ChevronRight size={14} />
                                                            </button>
                                                        )}
                                                        {col.id === 'DONE' && (
                                                            <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                                                                <Check size={14} /> Complete
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                    {colTasks.length === 0 && (
                                        <motion.div 
                                            initial={{ opacity: 0 }} 
                                            animate={{ opacity: 1 }} 
                                            className="text-center py-10 text-white/20 text-sm font-semibold tracking-wider"
                                        >
                                            No tasks here
                                        </motion.div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </AppShell>
    );
};
