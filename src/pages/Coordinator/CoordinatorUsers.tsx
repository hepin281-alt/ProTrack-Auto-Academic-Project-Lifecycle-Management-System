import React, { useState, useEffect } from 'react';
import { AppShell } from '../../layouts/AppShell';
import { api } from '../../lib/apiClient';
import { useAuthStore } from '../../store/authStore';
import { Users, Upload, CheckCircle2, X, AlertCircle, RefreshCw, Shield, Trash2 } from 'lucide-react';

export const CoordinatorUsers: React.FC = () => {
    const { token } = useAuthStore();
    const [activeTab, setActiveTab] = useState<'students' | 'faculty' | 'orphans'>('students');

    // Students state
    const [whitelist, setWhitelist] = useState<any[]>([]);
    const [isLoadingWhitelist, setIsLoadingWhitelist] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [csvPreview, setCsvPreview] = useState<{headers: string[], rows: string[][], total: number} | null>(null);
    const [registerStudentPRN, setRegisterStudentPRN] = useState('');
    const [registerStudentName, setRegisterStudentName] = useState('');
    const [registerStudentEmail, setRegisterStudentEmail] = useState('');
    const [isRegisteringStudent, setIsRegisteringStudent] = useState(false);

    // Faculty state
    const [registerEmail, setRegisterEmail] = useState('');
    const [registerFullName, setRegisterFullName] = useState('');
    const [registerRole, setRegisterRole] = useState('GUIDE');
    const [isRegistering, setIsRegistering] = useState(false);
    
    const [facultyWhitelist, setFacultyWhitelist] = useState<any[]>([]);
    const [csvFacultyFile, setCsvFacultyFile] = useState<File | null>(null);
    const [csvFacultyPreview, setCsvFacultyPreview] = useState<{headers: string[], rows: string[][], total: number} | null>(null);
    
    // Faculty List state
    const [facultyList, setFacultyList] = useState<any[]>([]);
    const [isLoadingFaculty, setIsLoadingFaculty] = useState(false);
    const [editingWorkloadId, setEditingWorkloadId] = useState<string | null>(null);
    const [editingWorkloadValue, setEditingWorkloadValue] = useState<string>('');
    const [isSavingWorkload, setIsSavingWorkload] = useState(false);

    // Orphans state
    const [orphans, setOrphans] = useState<any[]>([]);
    const [isLoadingOrphans, setIsLoadingOrphans] = useState(false);
    const [isAutoGrouping, setIsAutoGrouping] = useState(false);

    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

    const showToast = (type: 'success' | 'error', msg: string) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchWhitelist = async () => {
        if (!token) return;
        setIsLoadingWhitelist(true);
        try {
            const data = await api.getWhitelist(token);
            setWhitelist(data || []);
        } catch (err) {
            console.error(err);
            showToast('error', 'Failed to fetch whitelist');
        } finally {
            setIsLoadingWhitelist(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'students') {
            fetchWhitelist();
        } else if (activeTab === 'orphans') {
            fetchOrphans();
        } else if (activeTab === 'faculty') {
            fetchFacultyList();
            fetchFacultyWhitelist();
        }
    }, [activeTab]);

    useEffect(() => {
        if (!csvFile) {
            setCsvPreview(null);
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            if (text) {
                const lines = text.split('\n').filter(l => l.trim().length > 0);
                if (lines.length > 0) {
                    const headers = lines[0].split(',').map(h => h.trim());
                    const rows = lines.slice(1, 4).map(l => l.split(',').map(c => c.trim()));
                    setCsvPreview({ headers, rows, total: lines.length - 1 });
                }
            }
        };
        reader.readAsText(csvFile);
    }, [csvFile]);

    useEffect(() => {
        if (!csvFacultyFile) {
            setCsvFacultyPreview(null);
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            if (text) {
                const lines = text.split('\n').filter(l => l.trim().length > 0);
                if (lines.length > 0) {
                    const headers = lines[0].split(',').map(h => h.trim());
                    const rows = lines.slice(1, 4).map(l => l.split(',').map(c => c.trim()));
                    setCsvFacultyPreview({ headers, rows, total: lines.length - 1 });
                }
            }
        };
        reader.readAsText(csvFacultyFile);
    }, [csvFacultyFile]);

    const fetchFacultyWhitelist = async () => {
        if (!token) return;
        try {
            const data = await api.getFacultyWhitelist(token);
            setFacultyWhitelist(data || []);
        } catch (err) {
            console.error(err);
            showToast('error', 'Failed to fetch faculty whitelist');
        }
    };

    const fetchOrphans = async () => {
        if (!token) return;
        setIsLoadingOrphans(true);
        try {
            const data = await api.getOrphanStudents(token);
            setOrphans(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch orphans', err);
        } finally {
            setIsLoadingOrphans(false);
        }
    };

    const handleAutoGroup = async () => {
        if (!token) return;
        setIsAutoGrouping(true);
        try {
            await api.autoGroupOrphans(token);
            showToast('success', 'Successfully auto-grouped orphans');
            fetchOrphans();
        } catch (err) {
            showToast('error', 'Failed to auto-group orphans');
        } finally {
            setIsAutoGrouping(false);
        }
    };

    const handleAddStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;
        setIsRegisteringStudent(true);
        try {
            await api.addStudentToWhitelist(token, { 
                prn_no: registerStudentPRN, 
                email: registerStudentEmail, 
                full_name: registerStudentName 
            });
            showToast('success', 'Student added to whitelist successfully');
            setRegisterStudentPRN('');
            setRegisterStudentName('');
            setRegisterStudentEmail('');
            fetchWhitelist();
        } catch (err: any) {
            console.error(err);
            showToast('error', err.message || 'Failed to add student to whitelist');
        } finally {
            setIsRegisteringStudent(false);
        }
    };

    const handleExportCSV = () => {
        if (whitelist.length === 0) return;
        const csvContent = [
            ['PRN No', 'Full Name', 'Email', 'Is Claimed'],
            ...whitelist.map(s => [s.prn_no, s.full_name, s.email, s.is_claimed ? 'Yes' : 'No'])
        ].map(e => e.join(",")).join("\n");
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "student_whitelist.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleUploadWhitelist = async () => {
        if (!csvFile || !token) return;
        setUploading(true);
        try {
            const res = await api.uploadWhitelist(token, csvFile);
            showToast('success', `Uploaded successfully! Processed ${res.totalProcessed} records. Success: ${res.successCount}, Errors: ${res.errorCount}`);
            setCsvFile(null);
            fetchWhitelist();
        } catch (err) {
            console.error(err);
            showToast('error', 'Failed to upload whitelist');
        } finally {
            setUploading(false);
        }
    };

    const handleUploadFacultyWhitelist = async () => {
        if (!csvFacultyFile || !token) return;
        setUploading(true);
        try {
            const res = await api.uploadFacultyWhitelist(token, csvFacultyFile);
            showToast('success', `Uploaded successfully! Processed ${res.totalProcessed} records. Success: ${res.successCount}, Errors: ${res.errorCount}`);
            setCsvFacultyFile(null);
            fetchFacultyWhitelist();
        } catch (err) {
            console.error(err);
            showToast('error', 'Failed to upload faculty whitelist');
        } finally {
            setUploading(false);
        }
    };

    const handleRevokeStudent = async (id: number) => {
        if (!token || !confirm('Are you sure you want to remove this student from the whitelist?')) return;
        try {
            await api.deleteStudentFromWhitelist(token, id);
            showToast('success', 'Student removed from whitelist');
            fetchWhitelist();
        } catch (err) {
            console.error(err);
            showToast('error', 'Failed to remove student');
        }
    };

    const handleRevokeFaculty = async (id: number) => {
        if (!token || !confirm('Are you sure you want to remove this faculty from the whitelist?')) return;
        try {
            await api.deleteFacultyFromWhitelist(token, id);
            showToast('success', 'Faculty removed from whitelist');
            fetchFacultyWhitelist();
        } catch (err) {
            console.error(err);
            showToast('error', 'Failed to remove faculty');
        }
    };

    const handleRevokeRegisteredUser = async (id: number) => {
        if (!token || !confirm('DANGER: Are you sure you want to completely delete this user and their data? This action cannot be undone.')) return;
        try {
            await api.deleteRegisteredUser(token, id);
            showToast('success', 'User completely deleted and access revoked');
            fetchFacultyList();
            fetchWhitelist();
            fetchFacultyWhitelist();
        } catch (err: any) {
            console.error(err);
            showToast('error', err.message || 'Failed to delete user');
        }
    };

    const handleRegisterFaculty = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;
        setIsRegistering(true);
        try {
            await api.addFacultyToWhitelist(token, {
                email: registerEmail,
                full_name: registerFullName,
                role: registerRole
            });
            showToast('success', `${registerRole} added to whitelist successfully! They can now claim their account.`);
            setRegisterEmail('');
            setRegisterFullName('');
            fetchFacultyWhitelist();
        } catch (err: any) {
            showToast('error', err.message || 'Failed to add faculty to whitelist');
        } finally {
            setIsRegistering(false);
        }
    };

    const fetchFacultyList = async () => {
        if (!token) return;
        setIsLoadingFaculty(true);
        try {
            const data = await api.getFacultyList(token);
            setFacultyList(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch faculty list', err);
        } finally {
            setIsLoadingFaculty(false);
        }
    };

    const handleSaveWorkload = async (facultyId: string) => {
        if (!token) return;
        const val = parseInt(editingWorkloadValue);
        if (isNaN(val) || val < 0) {
            showToast('error', 'Capacity must be a positive number');
            return;
        }

        setIsSavingWorkload(true);
        try {
            await api.updateGuideWorkload(token, facultyId, val);
            showToast('success', 'Capacity updated successfully!');
            setEditingWorkloadId(null);
            fetchFacultyList();
        } catch (err: any) {
            showToast('error', err.message || 'Failed to update capacity');
        } finally {
            setIsSavingWorkload(false);
        }
    };

    const claimedCount = whitelist.filter(s => s.is_claimed).length;

    return (
        <AppShell currentPage="/coordinator/users">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-sm font-semibold animate-slide-up ${
                    toast.type === 'success'
                        ? 'bg-emerald-900/90 border-emerald-500/30 text-emerald-300'
                        : 'bg-red-900/90 border-red-500/30 text-red-300'
                }`}>
                    {toast.type === 'success' ? <CheckCircle2 size={16} /> : <X size={16} />}
                    {toast.msg}
                    <button onClick={() => setToast(null)} className="ml-2 opacity-60 hover:opacity-100"><X size={13} /></button>
                </div>
            )}

            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-red-500">
                            <Users size={18} className="text-white" />
                        </div>
                        <h1 className="text-2xl font-black text-white">User Management</h1>
                    </div>
                    <p className="text-white/40 text-sm ml-11">Manage student whitelists and faculty accounts</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.08] w-fit mb-8">
                {[
                    { id: 'students' as const, label: 'Student Whitelist' },
                    { id: 'faculty' as const, label: 'Faculty & Committee' },
                    { id: 'orphans' as const, label: 'Orphan Students' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                            activeTab === tab.id
                                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg'
                                : 'text-white/50 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Student Whitelist Tab */}
            {activeTab === 'students' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Add Form & Bulk Upload */}
                    <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-7 h-fit shadow-2xl">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
                                <Users size={18} className="text-white" />
                            </div>
                            <h3 className="text-lg font-bold text-white">Add Student</h3>
                        </div>
                        <form onSubmit={handleAddStudent} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">PRN No</label>
                                <input 
                                    type="text" 
                                    required
                                    value={registerStudentPRN}
                                    onChange={e => setRegisterStudentPRN(e.target.value)}
                                    placeholder="e.g. 120A1010"
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white placeholder:text-white/25 rounded-xl text-sm focus:outline-none focus:border-white/30 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Full Name</label>
                                <input 
                                    type="text" 
                                    required
                                    value={registerStudentName}
                                    onChange={e => setRegisterStudentName(e.target.value)}
                                    placeholder="Jane Doe"
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white placeholder:text-white/25 rounded-xl text-sm focus:outline-none focus:border-white/30 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Email Address</label>
                                <input 
                                    type="email" 
                                    required
                                    value={registerStudentEmail}
                                    onChange={e => setRegisterStudentEmail(e.target.value)}
                                    placeholder="student@college.edu"
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white placeholder:text-white/25 rounded-xl text-sm focus:outline-none focus:border-white/30 transition-all"
                                />
                            </div>
                            <button 
                                type="submit"
                                disabled={isRegisteringStudent}
                                className="w-full py-3 mt-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
                            >
                                {isRegisteringStudent ? 'Creating...' : 'Create Student Account'}
                            </button>
                            <div className="mt-4 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-start gap-3">
                                <AlertCircle size={16} className="text-orange-400 mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-emerald-200/70 leading-relaxed">
                                    Students added here will be whitelisted. They can then visit the homepage and "Claim" their account.
                                </p>
                            </div>
                        </form>

                        <div className="mt-8 pt-6 border-t border-white/10">
                            <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4">Bulk Upload Students</h3>
                            <div className="space-y-4">
                                <div>
                                    <input 
                                        type="file" 
                                        accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                                        onChange={e => setCsvFile(e.target.files?.[0] || null)}
                                        className="w-full text-xs text-white/50 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-orange-500/20 file:text-orange-400 hover:file:bg-orange-500/30 transition-all cursor-pointer" 
                                    />
                                    {csvPreview ? (
                                        <div className="mt-4 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                                            <div className="flex items-center gap-2 mb-2">
                                                <CheckCircle2 size={14} className="text-emerald-400" />
                                                <span className="text-xs font-bold text-emerald-300">Found {csvPreview.total} valid rows</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-[10px] text-white/30 mt-2">File must contain columns: prn_no, email, full_name</p>
                                    )}
                                </div>
                                <button
                                    onClick={handleUploadWhitelist}
                                    disabled={!csvFile || uploading}
                                    className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {uploading ? <RefreshCw size={16} className="animate-spin" /> : <Upload size={16} />}
                                    {uploading ? 'Processing...' : 'Upload & Whitelist'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Registry Table */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-7 shadow-2xl h-fit">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-white">Registry Status</h3>
                                <div className="flex items-center gap-4">
                                    <div className="text-sm font-bold text-white/40 bg-black/20 px-3 py-1.5 rounded-lg border border-white/5">
                                        <span className="text-emerald-400">{claimedCount}</span> claimed / {whitelist.length} total
                                    </div>
                                    <button 
                                        onClick={handleExportCSV}
                                        className="text-xs font-bold bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg transition-colors border border-white/10"
                                    >
                                        Export CSV
                                    </button>
                                </div>
                            </div>
                            
                            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-white/[0.08] text-[10px] uppercase tracking-widest text-white/40 bg-black/20">
                                            <th className="py-3 px-4 font-semibold">PRN No</th>
                                            <th className="py-3 px-4 font-semibold">Name</th>
                                            <th className="py-3 px-4 font-semibold">Email</th>
                                            <th className="py-3 px-4 font-semibold">Status</th>
                                            <th className="py-3 px-4 font-semibold text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm text-white/80">
                                        {isLoadingWhitelist ? (
                                            <tr>
                                                <td colSpan={5} className="py-8 text-center text-white/30 text-xs">
                                                    <RefreshCw size={16} className="animate-spin inline mr-2" /> Loading...
                                                </td>
                                            </tr>
                                        ) : whitelist.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="py-8 text-center text-white/30 text-xs italic">
                                                    No students whitelisted yet.
                                                </td>
                                            </tr>
                                        ) : (
                                            whitelist.map(student => (
                                                <tr key={student.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                                                    <td className="py-3 px-4 font-mono text-xs">{student.prn_no}</td>
                                                    <td className="py-3 px-4">{student.full_name}</td>
                                                    <td className="py-3 px-4 text-xs text-white/40">{student.email}</td>
                                                    <td className="py-3 px-4">
                                                        {student.is_claimed ? (
                                                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">CLAIMED</span>
                                                        ) : (
                                                            <span className="px-2 py-0.5 rounded-md bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-bold">UNCLAIMED</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4 text-right">
                                                        <button 
                                                            onClick={() => handleRevokeStudent(student.id)}
                                                            className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                                                            title="Revoke access"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Faculty & Committee Tab */}
            {activeTab === 'faculty' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Create Form */}
                    <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-7 h-fit shadow-2xl">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500">
                            <Shield size={18} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">Create Admin Account</h3>
                            <p className="text-xs text-white/40">Manually provision Faculty Guides or Committee members</p>
                        </div>
                    </div>

                    <form onSubmit={handleRegisterFaculty} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Role</label>
                            <select 
                                value={registerRole}
                                onChange={e => setRegisterRole(e.target.value)}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white rounded-xl text-sm focus:outline-none focus:border-white/30 transition-all appearance-none"
                            >
                                <option value="GUIDE">Faculty Guide</option>
                                <option value="COMMITTEE">Committee Member</option>
                                <option value="COORDINATOR">Project Coordinator</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Email Address</label>
                            <input 
                                type="email" 
                                required
                                value={registerEmail}
                                onChange={e => setRegisterEmail(e.target.value)}
                                placeholder="faculty@college.edu"
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white placeholder:text-white/25 rounded-xl text-sm focus:outline-none focus:border-white/30 transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Full Name</label>
                            <input 
                                type="text" 
                                required
                                value={registerFullName}
                                onChange={e => setRegisterFullName(e.target.value)}
                                placeholder="Dr. John Doe"
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white placeholder:text-white/25 rounded-xl text-sm focus:outline-none focus:border-white/30 transition-all"
                            />
                        </div>

                        <button 
                            type="submit"
                            disabled={isRegistering}
                            className="w-full py-3 mt-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
                        >
                            {isRegistering ? 'Creating...' : `Create ${registerRole.charAt(0) + registerRole.slice(1).toLowerCase()} Account`}
                        </button>

                        <div className="mt-4 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-start gap-3">
                            <AlertCircle size={16} className="text-orange-400 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-emerald-200/70 leading-relaxed">
                                Faculty added here will be whitelisted. They can then visit the homepage and "Claim" their account to set a secure password.
                            </p>
                        </div>
                    </form>
                    
                    {/* Faculty Bulk Upload */}
                    <div className="mt-8 pt-6 border-t border-white/10">
                        <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4">Bulk Upload Faculty</h3>
                        <div className="space-y-4">
                            <div>
                                <input 
                                    type="file" 
                                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                                    onChange={e => setCsvFacultyFile(e.target.files?.[0] || null)}
                                    className="w-full text-xs text-white/50 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-orange-500/20 file:text-orange-400 hover:file:bg-orange-500/30 transition-all cursor-pointer" 
                                />
                                {csvFacultyPreview ? (
                                    <div className="mt-4 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                                        <div className="flex items-center gap-2 mb-2">
                                            <CheckCircle2 size={14} className="text-emerald-400" />
                                            <span className="text-xs font-bold text-emerald-300">Found {csvFacultyPreview.total} valid rows</span>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-[10px] text-white/30 mt-2">File must contain columns: email, employee_id, full_name, role</p>
                                )}
                            </div>
                            <button
                                onClick={handleUploadFacultyWhitelist}
                                disabled={!csvFacultyFile || uploading}
                                className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {uploading ? <RefreshCw size={16} className="animate-spin" /> : <Upload size={16} />}
                                {uploading ? 'Processing...' : 'Upload & Whitelist Faculty'}
                            </button>
                        </div>
                    </div>
                    </div>

                    {/* Right Column: Tables */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Pending Invitations Table */}
                        <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-7 shadow-2xl h-fit">
                            <h3 className="text-lg font-bold text-white mb-6">Pending Invitations (Whitelist)</h3>
                            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-white/[0.08] text-[10px] uppercase tracking-widest text-white/40 bg-black/20">
                                            <th className="py-3 px-4 font-semibold">Name</th>
                                            <th className="py-3 px-4 font-semibold">Email</th>
                                            <th className="py-3 px-4 font-semibold">Role</th>
                                            <th className="py-3 px-4 font-semibold text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm text-white/80">
                                        {facultyWhitelist.filter(f => !f.is_claimed).length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="py-8 text-center text-white/30 text-xs italic">
                                                    No pending invitations.
                                                </td>
                                            </tr>
                                        ) : (
                                            facultyWhitelist.filter(f => !f.is_claimed).map(faculty => (
                                                <tr key={faculty.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                                                    <td className="py-3 px-4">{faculty.full_name}</td>
                                                    <td className="py-3 px-4 text-xs text-white/40">{faculty.email}</td>
                                                    <td className="py-3 px-4">
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-400 border border-orange-500/20">{faculty.role}</span>
                                                    </td>
                                                    <td className="py-3 px-4 text-right">
                                                        <button onClick={() => handleRevokeFaculty(faculty.id)} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors inline-block" title="Revoke Invitation"><Trash2 size={14} /></button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Registered Faculty Table */}
                        <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-7 shadow-2xl h-fit">
                            <h3 className="text-lg font-bold text-white mb-6">Registered Faculty & Committee</h3>
                        
                        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-white/[0.08] text-[10px] uppercase tracking-widest text-white/40 bg-black/20">
                                        <th className="py-3 px-4 font-semibold">Faculty Name</th>
                                        <th className="py-3 px-4 font-semibold">Role</th>
                                        <th className="py-3 px-4 font-semibold">Assigned Groups</th>
                                        <th className="py-3 px-4 font-semibold text-right">Max Capacity</th>
                                        <th className="py-3 px-4 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm text-white/80">
                                    {isLoadingFaculty ? (
                                        <tr>
                                            <td colSpan={5} className="py-8 text-center text-white/30 text-xs">
                                                <div className="flex items-center justify-center gap-2">
                                                    <RefreshCw size={14} className="animate-spin" />
                                                    Loading faculty...
                                                </div>
                                            </td>
                                        </tr>
                                    ) : facultyList.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="py-8 text-center text-white/30 text-xs italic">
                                                No faculty members found. Register one above.
                                            </td>
                                        </tr>
                                    ) : (
                                    facultyList.map(faculty => (
                                        <tr key={faculty.faculty_id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                                            <td className="py-3 px-4">
                                                <div className="font-semibold text-white">{faculty.full_name || 'Un-setup Profile'}</div>
                                                <div className="text-xs text-white/40">{faculty.email}</div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                                    faculty.role === 'GUIDE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                                    'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                                }`}>
                                                    {faculty.role}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                {faculty.role === 'GUIDE' ? (
                                                    <span className="text-white/70 font-mono text-xs bg-black/30 px-2 py-1 rounded">
                                                        {faculty.current_workload || 0}
                                                    </span>
                                                ) : (
                                                    <span className="text-white/30">—</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                {faculty.role === 'GUIDE' ? (
                                                    editingWorkloadId === faculty.faculty_id ? (
                                                        <div className="flex items-center justify-end gap-2">
                                                            <input 
                                                                type="number" 
                                                                min="0"
                                                                value={editingWorkloadValue}
                                                                onChange={e => setEditingWorkloadValue(e.target.value)}
                                                                className="w-16 px-2 py-1 bg-black/50 border border-white/20 rounded text-white text-xs text-center"
                                                                autoFocus
                                                            />
                                                            <button 
                                                                onClick={() => handleSaveWorkload(faculty.faculty_id)}
                                                                disabled={isSavingWorkload}
                                                                className="p-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                                                            >
                                                                <CheckCircle2 size={14} />
                                                            </button>
                                                            <button 
                                                                onClick={() => setEditingWorkloadId(null)}
                                                                disabled={isSavingWorkload}
                                                                className="p-1 rounded bg-white/10 text-white/50 hover:bg-white/20 transition-colors"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button 
                                                            onClick={() => {
                                                                setEditingWorkloadId(faculty.faculty_id);
                                                                setEditingWorkloadValue(String(faculty.max_workload || 4));
                                                            }}
                                                            className="text-white/70 hover:text-white font-mono text-xs bg-black/30 hover:bg-blue-500/20 hover:text-blue-300 transition-all border border-transparent hover:border-blue-500/30 px-3 py-1 rounded cursor-pointer"
                                                            title="Click to edit capacity"
                                                        >
                                                            {faculty.max_workload || 4}
                                                        </button>
                                                    )
                                                ) : (
                                                    <span className="text-white/30">—</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <button 
                                                    onClick={() => handleRevokeRegisteredUser(faculty.faculty_id)}
                                                    className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                                                    title="Delete User Account"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                </div>
                </div>
            )}

            {/* Orphans Tab */}
            {activeTab === 'orphans' && (
                <div className="max-w-4xl mx-auto rounded-2xl bg-white/[0.04] border border-white/[0.08] p-7">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-red-500">
                                <Users size={18} className="text-white" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Orphan Students</h3>
                                <p className="text-xs text-white/40">Students registered but not in any group</p>
                            </div>
                        </div>
                        {orphans.length > 0 && (
                            <button 
                                onClick={handleAutoGroup}
                                disabled={isAutoGrouping}
                                className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50 flex items-center gap-2"
                            >
                                {isAutoGrouping ? <RefreshCw size={14} className="animate-spin" /> : <Users size={14} />}
                                Auto-Group Orphans
                            </button>
                        )}
                    </div>
                    
                    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/[0.08] text-[10px] uppercase tracking-widest text-white/40 bg-black/20">
                                    <th className="py-3 px-4 font-semibold">PRN No</th>
                                    <th className="py-3 px-4 font-semibold">Email</th>
                                    <th className="py-3 px-4 font-semibold">Joined At</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm text-white/80">
                                {isLoadingOrphans ? (
                                    <tr>
                                        <td colSpan={3} className="py-8 text-center text-white/30 text-xs">
                                            <RefreshCw size={16} className="animate-spin inline mr-2" /> Loading...
                                        </td>
                                    </tr>
                                ) : orphans.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="py-8 text-center text-white/30 text-xs">
                                            No orphan students found. All registered students are in groups.
                                        </td>
                                    </tr>
                                ) : (
                                    orphans.map(student => (
                                        <tr key={student.student_id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                                            <td className="py-3 px-4 font-mono text-xs">{student.prn_no}</td>
                                            <td className="py-3 px-4 text-xs text-white/60">{student.email}</td>
                                            <td className="py-3 px-4 text-xs text-white/40">{new Date(student.created_at).toLocaleDateString()}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slide-up { from{opacity:0;transform:translateY(-12px)} to{opacity:1;transform:translateY(0)} }
                .animate-slide-up{animation:slide-up 0.3s ease-out}
            `}</style>
        </AppShell>
    );
};
