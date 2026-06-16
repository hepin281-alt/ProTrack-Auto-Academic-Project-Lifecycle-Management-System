import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/apiClient';
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

interface GroupResourcesProps {
 groupId: string;
}

export const GroupResources: React.FC<GroupResourcesProps> = ({ groupId }) => {
 const { token } = useAuthStore();
 const [resources, setResources] = useState<Resource[]>([]);
 const [title, setTitle] = useState('');
 const [url, setUrl] = useState('');
 const [description, setDescription] = useState('');
 const [category, setCategory] = useState('General');
 const [resourceType, setResourceType] = useState<'LINK' | 'FILE'>('LINK');
 const [file, setFile] = useState<File | null>(null);
 const [error, setError] = useState('');
 const [isLoading, setIsLoading] = useState(true);

 useEffect(() => {
 loadResources();
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [groupId, token]);

 const loadResources = async () => {
 if (!token || !groupId) return;
 setIsLoading(true);
 try {
 const data = await api.getGroupResources(token, groupId);
 setResources(data);
 } catch (err: any) {
 setError(err.message || 'Failed to load resources');
 } finally {
 setIsLoading(false);
 }
 };

 const handleAdd = async (e: React.FormEvent) => {
 e.preventDefault();
 try {
 if (!groupId || !token || !title) return;

 if (resourceType === 'LINK') {
 await api.createResource(token, groupId, title, url);
 } else if (resourceType === 'FILE' && file) {
 const formData = new FormData();
 formData.append('group_id', groupId);
 formData.append('title', title);
 formData.append('resource_type', 'FILE');
 formData.append('description', description);
 formData.append('category', category);
 formData.append('file', file);
 await api.createGlobalResource(token, formData);
 }

 setTitle('');
 setUrl('');
 setDescription('');
 setCategory('General');
 setFile(null);
 loadResources();
 } catch (err: any) {
 setError(err.message || 'Failed to add resource');
 }
 };

 if (isLoading) {
 return (
 <div className="flex-1 flex items-center justify-center min-h-[400px]">
 <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full"></div>
 </div>
 );
 }

 return (
 <div className="flex flex-col h-full space-y-6">
 {error && (
 <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm">
 {error}
 </div>
 )}

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 <div className="lg:col-span-2 space-y-4">
 <h2 className="text-xl font-semibold text-white/50 flex items-center gap-2">
 <Folder className="w-5 h-5 text-purple-400" />
 Group Resources
 </h2>
 {resources.length === 0 ? (
 <div className="bg-white/5 border border-white/[0.08] rounded-xl p-8 text-center">
 <Folder className="w-12 h-12 text-white/40 mx-auto mb-3" />
 <h3 className="text-lg font-medium text-white">No resources yet</h3>
 <p className="text-white/40 mt-1 text-sm">Share links, documents, or research materials here.</p>
 </div>
 ) : (
 <div className="space-y-4 h-[500px] overflow-y-auto pr-2">
 {resources.map(res => (
 <div key={res.resource_id} className="bg-white/5 border border-white/[0.08] rounded-xl p-5 hover:bg-white/[0.04] transition-colors flex flex-col gap-3 group">
 <div className="flex items-start justify-between">
 <div className="flex items-start gap-4">
 <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${res.resource_type === 'FILE' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-purple-500/20 text-purple-400'}`}>
 {res.resource_type === 'FILE' ? <Folder className="w-5 h-5" /> : <LinkIcon className="w-5 h-5" />}
 </div>
 <div>
 <div className="flex items-center gap-2 mb-1">
 <h3 className="font-medium text-white group-hover:text-purple-400 transition-colors">
 {res.title}
 </h3>
 <span className="px-2 py-0.5 rounded-full bg-white/[0.04] /10 text-white/50 text-[10px] font-medium uppercase tracking-wider">
 {res.category}
 </span>
 </div>
 <div className="flex items-center gap-3 text-xs text-white/40">
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
 href={res.resource_type === 'FILE' ? `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}`.replace('/api', '') + res.file_path : res.url} 
 target="_blank" 
 rel="noopener noreferrer"
 className="p-2 text-white/40 hover:text-white hover:bg-white/[0.04] /10 rounded-lg transition-all"
 >
 <ExternalLink className="w-5 h-5" />
 </a>
 </div>
 {res.description && (
 <p className="text-sm text-white/40 pl-14 leading-relaxed">
 {res.description}
 </p>
 )}
 </div>
 ))}
 </div>
 )}
 </div>

 <div className="lg:col-span-1">
 <div className="bg-white/5 border border-white/[0.08] rounded-xl p-6 sticky top-0">
 <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
 <Plus className="w-5 h-5 text-purple-400" />
 Add Resource
 </h3>
 <form onSubmit={handleAdd} className="space-y-4">
 <div className="flex gap-2">
 <button type="button" onClick={() => setResourceType('LINK')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${resourceType === 'LINK' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-white/5 text-white/40 border border-white/[0.08] hover:bg-white/[0.04] /10'}`}>Link</button>
 <button type="button" onClick={() => setResourceType('FILE')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${resourceType === 'FILE' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-white/5 text-white/40 border border-white/[0.08] hover:bg-white/[0.04] /10'}`}>File</button>
 </div>
 <div>
 <label className="block text-sm font-medium text-white/40 mb-1">Title</label>
 <input
 type="text"
 required
 value={title}
 onChange={(e) => setTitle(e.target.value)}
 className="w-full bg-white/5 border border-white/[0.08] rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
 placeholder="e.g. Research Paper PDF"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-white/40 mb-1">Category</label>
 <select 
 value={category} 
 onChange={(e) => setCategory(e.target.value)}
 className="w-full bg-white/5 border border-white/[0.08] rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
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
 <label className="block text-sm font-medium text-white/40 mb-1">Description (Optional)</label>
 <textarea
 value={description}
 onChange={(e) => setDescription(e.target.value)}
 className="w-full bg-white/5 border border-white/[0.08] rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none h-20 text-sm"
 placeholder="Add some notes..."
 />
 </div>
 {resourceType === 'LINK' ? (
 <div>
 <label className="block text-sm font-medium text-white/40 mb-1">URL / Link</label>
 <input
 type="url"
 required
 value={url}
 onChange={(e) => setUrl(e.target.value)}
 className="w-full bg-white/5 border border-white/[0.08] rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
 placeholder="https://..."
 />
 </div>
 ) : (
 <div>
 <label className="block text-sm font-medium text-white/40 mb-1">File Upload</label>
 <input
 type="file"
 required
 onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
 className="w-full bg-white/5 border border-white/[0.08] rounded-xl px-4 py-2 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-500/20 file:text-purple-400 hover:file:bg-purple-500/30 text-sm"
 />
 </div>
 )}
 <button
 type="submit"
 className="w-full bg-purple-600 hover:bg-purple-500 text-white font-medium py-2.5 rounded-xl transition-colors text-sm"
 >
 Share with Group
 </button>
 </form>
 </div>
 </div>
 </div>
 </div>
 );
};
