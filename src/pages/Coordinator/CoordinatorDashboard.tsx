import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { LogOut, AlertCircle } from 'lucide-react';
import { api } from '../../lib/apiClient';
import { AllocateGuideInterface } from '../../components/AllocateGuideInterface';

interface GroupStats {
    total: number;
    pending: number;
    active: number;
}

export const CoordinatorDashboard: React.FC = () => {
    const { user, token, clearAuth } = useAuthStore();
    const navigate = useNavigate();

    const [stats, setStats] = useState<GroupStats>({ total: 0, pending: 0, active: 0 });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState<string>('');

    const handleUploadCsv = async () => {
        if (!token || !csvFile) return;
        try {
            setIsUploading(true);
            setUploadResult('');
            const res = await api.uploadWhitelist(token, csvFile);
            setUploadResult(`Success: Added ${res.successCount} students. Skipped/errors: ${res.errorCount}.`);
            setCsvFile(null); // Reset input
        } catch (err) {
            setUploadResult(`Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setIsUploading(false);
        }
    };

    const fetchStats = async () => {
        if (!token) return;
        try {
            setIsLoading(true);
            const data = await api.getGroups(token);
            const groups = Array.isArray(data) ? data : [];
            
            setStats({
                total: groups.length,
                pending: groups.filter(g => g.status === 'WAITING_ALLOCATION').length,
                active: groups.filter(g => g.status === 'ACTIVE').length
            });
            setError('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load statistics');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleLogout = () => {
        clearAuth();
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-900">Coordinator Dashboard</h1>
                    <div className="flex items-center gap-4">
                        <span className="text-gray-600">{user?.email}</span>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            <LogOut size={18} />
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {error && (
                    <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg text-orange-700 flex items-center gap-3">
                        <AlertCircle size={20} />
                        {error}
                    </div>
                )}

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-lg shadow p-6">
                        <p className="text-sm text-gray-600 mb-2">Total Groups</p>
                        <p className="text-3xl font-bold text-indigo-600">
                            {isLoading ? '-' : stats.total}
                        </p>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <p className="text-sm text-gray-600 mb-2">Awaiting Allocation</p>
                        <p className="text-3xl font-bold text-orange-600">
                            {isLoading ? '-' : stats.pending}
                        </p>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <p className="text-sm text-gray-600 mb-2">Active Groups</p>
                        <p className="text-3xl font-bold text-green-600">
                            {isLoading ? '-' : stats.active}
                        </p>
                    </div>
                </div>

                {/* CSV Upload Section */}
                <div className="bg-white rounded-lg shadow p-6 mb-8">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Upload Student Roster (CSV)</h2>
                    <p className="text-sm text-gray-600 mb-4">
                        Upload a CSV file containing <code className="bg-gray-100 px-1 rounded">prn_no</code>, <code className="bg-gray-100 px-1 rounded">email</code>, and <code className="bg-gray-100 px-1 rounded">full_name</code> to whitelist students for registration.
                    </p>
                    <div className="flex items-center gap-4">
                        <input
                            type="file"
                            accept=".csv"
                            onChange={(e) => setCsvFile(e.target.files ? e.target.files[0] : null)}
                            className="block w-full text-sm text-gray-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-md file:border-0
                                file:text-sm file:font-semibold
                                file:bg-indigo-50 file:text-indigo-700
                                hover:file:bg-indigo-100"
                        />
                        <button
                            onClick={handleUploadCsv}
                            disabled={!csvFile || isUploading}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                            {isUploading ? 'Uploading...' : 'Upload CSV'}
                        </button>
                    </div>
                    {uploadResult && (
                        <div className={`mt-4 p-3 rounded-md text-sm ${uploadResult.includes('error') || uploadResult.includes('failed') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                            {uploadResult}
                        </div>
                    )}
                </div>

                {/* Allocation Interface */}
                {token && (
                    <AllocateGuideInterface
                        token={token}
                        onAllocationComplete={fetchStats}
                    />
                )}
            </main>
        </div>
    );
};
