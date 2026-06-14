import React, { useState, useEffect } from 'react';
import { AppShell } from '../../layouts/AppShell';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/apiClient';
import { Folder, Link as LinkIcon, Plus, ExternalLink, User } from 'lucide-react';

interface Resource {
    resource_id: string;
    title: string;
    url?: string;
    file_path?: string;
    resource_type: 'LINK' | 'FILE';
    description?: string;
    category: string;
    uploaded_by_email: string;
    created_at: string;
}

export default function StudentResources() {
    const { token } = useAuthStore();
    const [resources, setResources] = useState<Resource[]>([]);
    const [groupId, setGroupId] = useState<string | null>(null);
    const [title, setTitle] = useState('');
    const [url, setUrl] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('General');
    const [resourceType, setResourceType] = useState<'LINK' | 'FILE'>('LINK');
    const [file, setFile] = useState<File | null>(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [debugGroups, setDebugGroups] = useState<any[]>([]);
    const [userGroups, setUserGroups] = useState<any[]>([]);

    useEffect(() => {
        const init = async () => {
            try {
                if (!token) return;
                const groups = await api.getGroups(token);
                setDebugGroups(groups || []);
                setUserGroups(groups || []);
                let targetGroup = groups.find((g: any) => g.status === 'ACTIVE' || g.status === 'WAITING_ALLOCATION');
                if (!targetGroup && groups && groups.length > 0) {
                    targetGroup = groups[0];
                }

                if (targetGroup) {
                    setGroupId(targetGroup.group_id);
                    await loadResources(targetGroup.group_id);
                }
            } catch (err: any) {
                setError(err.message || 'Failed to initialize');
            } finally {
                setIsLoading(false);
            }
        };
        init();
    }, [token]);

    const loadResources = async (id: string) => {
        try {
            if (!token) return;
            const data = await api.getGroupResources(token, id);
            setResources(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load resources');
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (!groupId || !token) return;
            
            const formData = new FormData();
            formData.append('group_id', groupId);
            formData.append('title', title);
            formData.append('resource_type', resourceType);
            formData.append('description', description);
            formData.append('category', category);
            
            if (resourceType === 'LINK') {
                formData.append('url', url);
            } else if (resourceType === 'FILE' && file) {
                formData.append('file', file);
            }

            await api.createResource(token, formData);
            
            setTitle('');
            setUrl('');
            setDescription('');
            setCategory('General');
            setFile(null);
            loadResources(groupId);
        } catch (err: any) {
            setError(err.message || 'Failed to add resource');
        }
    };

    if (isLoading) {
        return (
            <AppShell currentPage="/student/resources">
                <div className="p-8 flex items-center justify-center">
                    <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                </div>
            </AppShell>
        );
    }

    if (!groupId) {
        return (
            <AppShell currentPage="/student/resources">
                <div className="p-8">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white/5 border border-white/10 rounded-2xl">
                            <Folder className="w-16 h-16 text-gray-500 mb-4" />
                            <h2 className="text-xl font-bold text-white mb-2">No Group Assigned</h2>
                            <p className="text-gray-400 max-w-md">
                                You need to be in a group to access the Resource Hub.
                            </p>
                            <p className="text-red-400 mt-4 text-sm font-mono break-all text-left">
                                Debug Info:<br/>
                                Error: {error || 'None'}<br/>
                                Groups Fetched: {debugGroups ? debugGroups.length : 'undefined'}<br/>
                                Groups Data: {JSON.stringify(debugGroups).substring(0, 150)}
                            </p>
                        </div>
                    </div>
                </div>
            </AppShell>
        );
    }

    return (
        <AppShell currentPage="/student/resources">
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
                            Group Resource Hub
                        </h1>
                        <p className="text-gray-400 mt-1">Share important links, references, and documents with your group.</p>
                    </div>
                    {userGroups.length > 1 && (
                        <select
                            value={groupId || ''}
                            onChange={(e) => {
                                setGroupId(e.target.value);
                                loadResources(e.target.value);
                            }}
                            className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        >
                            {userGroups.map((g) => (
                                <option key={g.group_id} value={g.group_id}>
                                    {g.group_name} ({g.status})
                                </option>
                            ))}
                        </select>
                    )}
                </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    {resources.length === 0 ? (
                        <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
                            <Folder className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                            <h3 className="text-lg font-medium text-white">No resources yet</h3>
                            <p className="text-gray-400 mt-1">Be the first to share something useful!</p>
                        </div>
                    ) : (
                        resources.map(res => (
                            <div key={res.resource_id} className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/[0.07] transition-colors flex flex-col gap-3 group">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-4">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${res.resource_type === 'FILE' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                            {res.resource_type === 'FILE' ? <Folder className="w-5 h-5" /> : <LinkIcon className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-medium text-white group-hover:text-blue-400 transition-colors">
                                                    {res.title}
                                                </h3>
                                                <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/70 text-[10px] font-medium uppercase tracking-wider">
                                                    {res.category}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-gray-400">
                                                <span className="flex items-center gap-1">
                                                    <User className="w-3 h-3" />
                                                    {res.uploaded_by_email || 'Unknown'}
                                                </span>
                                                <span>•</span>
                                                <span>{new Date(res.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <a 
                                        href={res.resource_type === 'FILE' ? `http://localhost:5001${res.file_path}` : res.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                                    >
                                        <ExternalLink className="w-5 h-5" />
                                    </a>
                                </div>
                                {res.description && (
                                    <p className="text-sm text-gray-400 pl-14 leading-relaxed">
                                        {res.description}
                                    </p>
                                )}
                            </div>
                        ))
                    )}
                </div>

                <div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-6 sticky top-6">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Plus className="w-5 h-5 text-blue-400" />
                            Add Resource
                        </h3>
                        <form onSubmit={handleAdd} className="space-y-4">
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setResourceType('LINK')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${resourceType === 'LINK' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'}`}>Link</button>
                                <button type="button" onClick={() => setResourceType('FILE')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${resourceType === 'FILE' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'}`}>File</button>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Title</label>
                                <input
                                    type="text"
                                    required
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    placeholder="e.g. React Documentation"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Category</label>
                                <select 
                                    value={category} 
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                >
                                    <option value="General">General</option>
                                    <option value="Dataset">Dataset</option>
                                    <option value="Research Paper">Research Paper</option>
                                    <option value="Code Snippet">Code Snippet</option>
                                    <option value="Tutorial">Tutorial</option>
                                    <option value="Presentation">Presentation</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Description (Optional)</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none h-20"
                                    placeholder="Add some notes..."
                                />
                            </div>
                            {resourceType === 'LINK' ? (
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">URL / Link</label>
                                    <input
                                        type="url"
                                        required
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        placeholder="https://..."
                                    />
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">File Upload</label>
                                    <input
                                        type="file"
                                        required
                                        onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-500/20 file:text-blue-400 hover:file:bg-blue-500/30"
                                    />
                                </div>
                            )}
                            <button
                                type="submit"
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-xl transition-colors"
                            >
                                Share with Group
                            </button>
                        </form>
                    </div>
                </div>
            </div>
            </div>
        </AppShell>
    );
}
