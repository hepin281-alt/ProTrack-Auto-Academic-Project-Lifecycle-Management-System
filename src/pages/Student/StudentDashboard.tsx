import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { LogOut, AlertCircle } from 'lucide-react';
import { api } from '../../lib/apiClient';
import { CreateGroupModal } from '../../components/CreateGroupModal';
import { AddMemberModal } from '../../components/AddMemberModal';
import { SubmitProposalModal } from '../../components/SubmitProposalModal';
import { SubmitLogbookModal } from '../../components/SubmitLogbookModal';

interface Group {
    group_id: string;
    group_name: string;
    status: string;
    member_count: number;
    created_at: string;
}

export const StudentDashboard: React.FC = () => {
    const { user, token, clearAuth } = useAuthStore();
    const navigate = useNavigate();

    const [groups, setGroups] = useState<Group[]>([]);
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [showProposalModal, setShowProposalModal] = useState(false);
    const [showLogbookModal, setShowLogbookModal] = useState(false);

    const fetchGroups = async () => {
        if (!token) return;
        try {
            setIsLoading(true);
            const data = await api.getGroups(token);
            setGroups(Array.isArray(data) ? data : []);
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

    const handleCreateGroup = async (groupName: string) => {
        if (!token) return;
        try {
            await api.createGroup(token, groupName);
            await fetchGroups();
            setShowCreateGroupModal(false);
        } catch (err) {
            throw err;
        }
    };

    const handleAddMember = async (prnNo: string) => {
        if (!token || !selectedGroupId) return;
        try {
            await api.addMember(token, selectedGroupId, prnNo);
            await fetchGroups();
            setShowAddMemberModal(false);
        } catch (err) {
            throw err;
        }
    };

    const handleSubmitProposal = async (title: string, tags: string[]) => {
        if (!token || !selectedGroupId) return;
        try {
            await api.submitProposal(token, selectedGroupId, title, tags);
            await fetchGroups();
            setShowProposalModal(false);
        } catch (err) {
            throw err;
        }
    };

    const handleSubmitLogbook = async (weekNumber: number, workSummary: string, evidenceUrl?: string) => {
        if (!token || !selectedGroupId) return;
        try {
            await api.submitLogbook(token, selectedGroupId, weekNumber, workSummary, evidenceUrl);
            setShowLogbookModal(false);
        } catch (err) {
            throw err;
        }
    };

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
                    <h1 className="text-2xl font-bold text-gray-900">Student Dashboard</h1>
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {/* Quick Actions */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                        <div className="space-y-3">
                            <button
                                onClick={() => setShowCreateGroupModal(true)}
                                className="w-full text-left px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors font-medium"
                            >
                                + Create Group
                            </button>
                            <button
                                onClick={() => {
                                    if (selectedGroup) setShowAddMemberModal(true);
                                }}
                                disabled={!selectedGroup}
                                className="w-full text-left px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                + Add Member
                            </button>
                            <button
                                onClick={() => {
                                    if (selectedGroup) setShowProposalModal(true);
                                }}
                                disabled={!selectedGroup}
                                className="w-full text-left px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                + Submit Proposal
                            </button>
                            <button
                                onClick={() => {
                                    if (selectedGroup) setShowLogbookModal(true);
                                }}
                                disabled={!selectedGroup}
                                className="w-full text-left px-4 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                + Submit Logbook
                            </button>
                        </div>
                    </div>

                    {/* Group Details */}
                    <div className="bg-white rounded-lg shadow p-6">
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

                    {/* Stats */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Stats</h2>
                        <div className="space-y-3">
                            <div>
                                <p className="text-sm text-gray-600">Total Groups</p>
                                <p className="text-3xl font-bold text-indigo-600">{groups.length}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Active Groups</p>
                                <p className="text-3xl font-bold text-green-600">
                                    {groups.filter(g => g.status === 'ACTIVE').length}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Groups List */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Groups</h2>
                    {isLoading ? (
                        <p className="text-gray-500">Loading groups...</p>
                    ) : groups.length === 0 ? (
                        <p className="text-gray-500">No groups yet. Create your first group!</p>
                    ) : (
                        <div className="space-y-2">
                            {groups.map((group) => (
                                <button
                                    key={group.group_id}
                                    onClick={() => setSelectedGroupId(group.group_id)}
                                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                                        selectedGroupId === group.group_id
                                            ? 'border-indigo-500 bg-indigo-50'
                                            : 'border-gray-200 hover:border-gray-300 bg-gray-50'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="font-semibold text-gray-900">{group.group_name}</h3>
                                            <p className="text-sm text-gray-600">
                                                {group.member_count}/4 members • {group.status}
                                            </p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                            group.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                                            group.status === 'WAITING_ALLOCATION' ? 'bg-yellow-100 text-yellow-700' :
                                            'bg-gray-100 text-gray-700'
                                        }`}>
                                            {group.status}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Modals */}
            <CreateGroupModal
                isOpen={showCreateGroupModal}
                onClose={() => setShowCreateGroupModal(false)}
                onSubmit={handleCreateGroup}
            />

            <AddMemberModal
                isOpen={showAddMemberModal}
                onClose={() => setShowAddMemberModal(false)}
                onSubmit={handleAddMember}
                currentMemberCount={selectedGroup?.member_count || 1}
            />

            <SubmitProposalModal
                isOpen={showProposalModal}
                onClose={() => setShowProposalModal(false)}
                onSubmit={handleSubmitProposal}
            />

            <SubmitLogbookModal
                isOpen={showLogbookModal}
                onClose={() => setShowLogbookModal(false)}
                onSubmit={handleSubmitLogbook}
            />
        </div>
    );
};
