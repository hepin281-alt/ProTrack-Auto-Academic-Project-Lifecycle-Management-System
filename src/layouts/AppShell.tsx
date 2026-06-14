import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { Menu, X, Bell, LogOut, Search, LayoutDashboard, Users, BookOpen, CheckSquare, BarChart2, Target, Trophy, Star, ChevronDown, Sparkles, Calendar, FolderSync, CheckCircle2, FileText, FolderOpen } from 'lucide-react';

interface AppShellProps {
    children: React.ReactNode;
    currentPage: string;
}

const navigationByRole = {
    STUDENT: [
        { label: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
        { label: 'My Groups', path: '/student/groups', icon: Users },
        { label: 'Group Tasks', path: '/student/tasks', icon: CheckSquare },
        { label: 'Topics', path: '/student/topics', icon: FileText },
        { label: 'Logbook', path: '/student/logbook', icon: BookOpen },
        { label: 'Resource Hub', path: '/student/resources', icon: FolderSync },
        { label: 'Peer Eval', path: '/student/peer-evaluation', icon: Star },
    ],
    GUIDE: [
        { label: 'Dashboard', path: '/guide/dashboard', icon: LayoutDashboard },
        { label: 'My Groups', path: '/guide/groups', icon: Users },
        { label: 'Reviews', path: '/guide/reviews', icon: CheckSquare },
    ],
    COORDINATOR: [
        { label: 'Dashboard', path: '/coordinator/dashboard', icon: BarChart2 },
        { label: 'Allocations', path: '/coordinator/allocations', icon: Target },
        { label: 'PO/PSO Mapping', path: '/coordinator/po-pso', icon: Target },
        { label: 'Documents', path: '/coordinator/documents', icon: FolderOpen },
        { label: 'Topic Approvals', path: '/coordinator/topics', icon: FileText },
        { label: 'User Management', path: '/coordinator/users', icon: Users },
        { label: 'Schedules', path: '/coordinator/schedules', icon: Calendar },
        { label: 'Rubrics', path: '/coordinator/rubrics', icon: Target },
        { label: 'Announcements', path: '/coordinator/announcements', icon: Bell },
    ],
    COMMITTEE: [
        { label: 'Dashboard', path: '/committee/dashboard', icon: Trophy },
        { label: 'Evaluations', path: '/committee/evaluations', icon: CheckCircle2 },
        { label: 'Final Results', path: '/committee/results', icon: Target },
        { label: 'Historic Search', path: '/committee/history', icon: Calendar }
    ],
};

const roleGradients: Record<string, string> = {
    STUDENT:    'from-blue-500 to-cyan-500',
    GUIDE:      'from-purple-500 to-pink-500',
    COORDINATOR:'from-orange-500 to-red-500',
    COMMITTEE:  'from-amber-500 to-yellow-500',
};

export const AppShell: React.FC<AppShellProps> = ({ children, currentPage }) => {
    const { user, clearAuth } = useAuthStore();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [showUserMenu, setShowUserMenu] = useState(false);

    if (!user) return <>{children}</>;

    const navigation = navigationByRole[user.role as keyof typeof navigationByRole] || [];
    const roleGradient = roleGradients[user.role] || 'from-blue-500 to-cyan-500';

    const handleLogout = () => {
        clearAuth();
        navigate('/');
    };

    return (
        <div className="flex h-screen overflow-hidden relative bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">

            {/* Animated background blobs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000" />
                <div className="absolute top-1/2 left-1/3 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000" />
            </div>

            {/* Grid pattern overlay */}
            <div className="fixed inset-0 opacity-[0.04] pointer-events-none z-0">
                <svg className="w-full h-full">
                    <defs>
                        <pattern id="app-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#app-grid)" />
                </svg>
            </div>

            {/* Sidebar */}
            <aside
                className={`${
                    sidebarOpen ? 'w-64' : 'w-20'
                } relative z-40 flex-shrink-0 flex flex-col transition-all duration-300 ease-in-out`}
            >
                {/* Glass sidebar panel */}
                <div className="flex flex-col h-full bg-white/[0.05] backdrop-blur-xl border-r border-white/[0.08]">

                    {/* Logo */}
                    <div className="h-16 flex items-center justify-between px-4 border-b border-white/[0.08]">
                        {sidebarOpen && (
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
                                    <Sparkles size={14} className="text-white" />
                                </div>
                                <span className="font-black text-lg">
                                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">Pro</span>
                                    <span className="text-white">Track</span>
                                </span>
                            </div>
                        )}
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                        >
                            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
                        {navigation.map((item) => {
                            const Icon = item.icon;
                            const isActive = currentPage === item.path;
                            return (
                                <button
                                    key={item.path}
                                    onClick={() => navigate(item.path)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                                        isActive
                                            ? 'bg-white/15 text-white shadow-lg shadow-white/5 border border-white/20'
                                            : 'text-white/60 hover:text-white hover:bg-white/10'
                                    }`}
                                >
                                    <div className={`p-1.5 rounded-lg transition-all ${
                                        isActive
                                            ? `bg-gradient-to-br ${roleGradient} shadow-lg`
                                            : 'bg-white/5 group-hover:bg-white/10'
                                    }`}>
                                        <Icon size={15} className="text-white" />
                                    </div>
                                    {sidebarOpen && (
                                        <span className="text-sm font-semibold tracking-wide">{item.label}</span>
                                    )}
                                    {isActive && sidebarOpen && (
                                        <div className={`ml-auto w-1.5 h-1.5 rounded-full bg-gradient-to-b ${roleGradient}`} />
                                    )}
                                </button>
                            );
                        })}
                    </nav>

                    {/* User info at bottom */}
                    {sidebarOpen && (
                        <div className="px-3 py-4 border-t border-white/[0.08]">
                            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10">
                                <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${roleGradient} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                                    {user.email.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold text-white truncate">{user.email.split('@')[0]}</p>
                                    <p className="text-[10px] text-white/50 capitalize">{user.role.toLowerCase()}</p>
                                    {user.role === 'STUDENT' && (user as any).prn_no && (
                                        <p className="text-[10px] text-blue-400/80 font-mono mt-0.5">PRN: {(user as any).prn_no}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 relative z-10">

                {/* Top Navbar */}
                <header className="h-16 flex items-center justify-between px-6 border-b border-white/[0.08] bg-white/[0.03] backdrop-blur-md flex-shrink-0">

                    {/* Search Bar */}
                    <div className="flex-1 max-w-sm">
                        <div className="relative">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                            <input
                                type="text"
                                placeholder="Search..."
                                className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 text-white placeholder:text-white/30 rounded-xl text-sm focus:outline-none focus:border-white/30 focus:bg-white/8 transition-all"
                            />
                        </div>
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-3 ml-auto">

                        {/* Notifications */}
                        <button 
                            onClick={() => navigate('/notifications')}
                            className="relative p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                        >
                            <Bell size={18} />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-gradient-to-br from-red-400 to-pink-500 rounded-full shadow-lg" />
                        </button>

                        {/* User Menu */}
                        <div className="relative">
                            <button
                                onClick={() => setShowUserMenu(!showUserMenu)}
                                className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all"
                            >
                                <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${roleGradient} flex items-center justify-center text-white text-xs font-bold`}>
                                    {user.email.charAt(0).toUpperCase()}
                                </div>
                                <div className="text-left hidden sm:block">
                                    <p className="text-xs font-semibold text-white leading-none">{user.email.split('@')[0]}</p>
                                    <p className="text-[10px] text-white/40 capitalize mt-0.5">{user.role.toLowerCase()}</p>
                                </div>
                                <ChevronDown size={14} className={`text-white/40 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Dropdown */}
                            {showUserMenu && (
                                <div className="absolute right-0 mt-2 w-52 bg-slate-900/90 backdrop-blur-xl border border-white/15 rounded-2xl shadow-2xl shadow-black/50 z-50 overflow-hidden">
                                    <div className="px-4 py-3 border-b border-white/10">
                                        <p className="text-xs font-semibold text-white">{user.email}</p>
                                        <p className="text-[10px] text-white/40 capitalize mt-0.5">{user.role.toLowerCase()}</p>
                                    </div>
                                    <div className="p-1.5">
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all font-medium"
                                        >
                                            <LogOut size={15} />
                                            Sign out
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-auto p-6">
                    {children}
                </main>
            </div>

        </div>
    );
};
