import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { LogOut, AlertCircle } from 'lucide-react';
import { api } from '../../lib/apiClient';
import { LogbookReviewUI } from '../../components/LogbookReviewUI';

interface Group {
    group_id: string;
    group_name: string;
    member_count: number;
    status: string;
}

export const GuideDashboard: React.FC = () => {
    const { user, token, clearAuth } = useAuthStore();
    const navigate = useNavigate();

    const [groups, setGroups] = useState<Group[]>([]);
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchGroups = async () => {
        if (!token) return;
        try {
            setIsLoading(true);
            // Get all groups and filter for those assigned to this guide
            const data = await api.getGroups(token);
            const allGroups = Array.isArray(data) ? data : [];
            // In a real scenario, we'd filter by guide_id from the backend
            // For now, we'll fetch all groups
            setGroups(allGroups);
            if (allGroups.length > 0 && !selectedGroupId) {
                setSelectedGroupId(allGroups[0].group_id);
            }
            setError('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load groups');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleLogout = () => {
        clearAuth();
        navigate('/');
    };

    const selectedGroup = groups.find(g => g.group_id === selectedGroupId);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-900">Faculty Guide Dashboard</h1>
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
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-3">
                        <AlertCircle size={20} />
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    {/* Assigned Groups */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Assigned Groups</h2>
                        {isLoading && groups.length === 0 ? (
                            <p className="text-gray-500 text-sm">Loading groups...</p>
                        ) : groups.length === 0 ? (
                            <p className="text-gray-500 text-sm">No groups assigned yet</p>
                        ) : (
                            <div className="space-y-2">
                                {groups.map((group) => (
                                    <button
                                        key={group.group_id}
                                        onClick={() => setSelectedGroupId(group.group_id)}
                                        className={`w-full text-left p-2 rounded-lg border-2 transition-all text-sm ${
                                            selectedGroupId === group.group_id
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-gray-200 hover:border-gray-300 bg-gray-50'
                                        }`}
                                    >
                                        <p className="font-medium text-gray-900 truncate">{group.group_name}</p>
                                        <p className="text-xs text-gray-600">{group.member_count}/4 members</p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Group Details */}
                    <div className="md:col-span-3 bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Group Details</h2>
                        {selectedGroup ? (
                            <div className="space-y-3">
                                <div>
                                    <p className="text-sm text-gray-600">Group Name</p>
                                    <p className="font-semibold text-gray-900">{selectedGroup.group_name}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Status</p>
                                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                                        selectedGroup.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                                        selectedGroup.status === 'WAITING_ALLOCATION' ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-gray-100 text-gray-700'
                                    }`}>
                                        {selectedGroup.status}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Members</p>
                                    <p className="font-semibold text-gray-900">{selectedGroup.member_count}/4</p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-gray-500 text-sm">Select a group to view details</p>
                        )}
                    </div>
                </div>

                {/* Logbook Review Interface */}
                {selectedGroupId && token && (
                    <LogbookReviewUI
                        token={token}
                        groupId={selectedGroupId}
                    />
                )}
            </main>
        </div>
    );
};
