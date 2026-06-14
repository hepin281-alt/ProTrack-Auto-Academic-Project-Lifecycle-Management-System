import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/apiClient';
import {
    BookOpen, Users, Clipboard, Star, Mail, Lock, Eye, EyeOff,
    ArrowRight, Sparkles, Menu, X, BookMarked, Target, ShieldCheck,
    BarChart3, GraduationCap, Layers, Zap, CheckCircle2, Hash,
    Shield, UserCheck, ChevronRight, ArrowUpRight, Database,
    Bell, GitBranch, TrendingUp, Clock, Award, FileText
} from 'lucide-react';

type Role = 'STUDENT' | 'GUIDE' | 'COORDINATOR' | 'COMMITTEE';

const ROLES = [
    {
        value: 'STUDENT' as Role,
        label: 'Student',
        description: 'Create groups, submit proposals & weekly logbooks',
        icon: BookOpen,
        color: 'from-blue-500 to-cyan-400',
        glow: '0 0 60px rgba(59,130,246,0.4)',
        badge: 'Most Common',
        demo: { email: 'student1@example.com', password: 'Student@123' },
    },
    {
        value: 'GUIDE' as Role,
        label: 'Faculty Guide',
        description: 'Review logbooks & guide up to 4 student projects',
        icon: Users,
        color: 'from-purple-500 to-pink-500',
        glow: '0 0 60px rgba(168,85,247,0.4)',
        badge: 'Faculty',
        demo: { email: 'guide1@example.com', password: 'Guide@123' },
    },
    {
        value: 'COORDINATOR' as Role,
        label: 'Coordinator',
        description: 'Manage groups, allocate guides & run analytics',
        icon: Clipboard,
        color: 'from-orange-500 to-red-500',
        glow: '0 0 60px rgba(249,115,22,0.4)',
        badge: 'Admin',
        demo: { email: 'coordinator@example.com', password: 'Coordinator@123' },
    },
    {
        value: 'COMMITTEE' as Role,
        label: 'Committee',
        description: 'Evaluate final projects with rubric-based grading',
        icon: Star,
        color: 'from-amber-500 to-yellow-400',
        glow: '0 0 60px rgba(245,158,11,0.4)',
        badge: 'Evaluator',
        demo: { email: 'committee@example.com', password: 'Committee@123' },
    },
];

const FEATURES = [
    {
        icon: BookMarked,
        title: 'Digital Logbooks',
        desc: 'Students submit weekly entries digitally. Guides approve or request revisions with one click — no physical diaries needed.',
        color: 'from-blue-500 to-cyan-500',
        stat: '100% paperless',
    },
    {
        icon: Target,
        title: 'Smart Allocation',
        desc: 'Auto-match guides to groups based on workload, expertise tags, and domain similarity across the department.',
        color: 'from-purple-500 to-pink-500',
        stat: 'AI-powered matching',
    },
    {
        icon: ShieldCheck,
        title: 'Rubric Grading',
        desc: 'Committee members evaluate using a standardized, transparent rubric framework ensuring fair and consistent scoring.',
        color: 'from-amber-500 to-orange-500',
        stat: 'Standardized scoring',
    },
    {
        icon: BarChart3,
        title: 'Real-time Analytics',
        desc: 'Track department-wide progress, overdue submissions, phase completion rates, and guide workload distribution instantly.',
        color: 'from-emerald-500 to-teal-500',
        stat: 'Live dashboard',
    },
];

const STATS = [
    { value: '1,200+', label: 'Students', icon: GraduationCap, color: 'text-blue-400' },
    { value: '340+', label: 'Projects', icon: Layers, color: 'text-purple-400' },
    { value: '48', label: 'Guides', icon: Users, color: 'text-pink-400' },
    { value: '99.8%', label: 'Uptime', icon: Zap, color: 'text-emerald-400' },
];

const NAV_LINKS = [
    { label: 'Features', id: 'features' },
    { label: 'How it Works', id: 'how-it-works' },
    { label: 'Roles', id: 'roles' },
];

// ──────────────────────────────────────────────────
// MOCK DASHBOARD CARD COMPONENT (used in hero)
// ──────────────────────────────────────────────────
const MockDashboard: React.FC = () => (
    <div className="relative bg-white/[0.03] border border-white/[0.08] rounded-3xl p-6 backdrop-blur-2xl overflow-hidden shadow-2xl">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-purple-500/60 to-transparent" />
        <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                    <p className="text-xs text-white/40 font-medium">Student Dashboard</p>
                    <p className="text-sm font-bold text-white">Rahul Sharma · PRN2024001</p>
                </div>
            </div>
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
            {[
                { label: 'Group', value: 'GRP-04', color: 'text-blue-400' },
                { label: 'Logbooks', value: '8/12', color: 'text-purple-400' },
                { label: 'Status', value: 'Active', color: 'text-emerald-400' },
            ].map(item => (
                <div key={item.label} className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-3 text-center">
                    <p className="text-xs text-white/40 mb-1">{item.label}</p>
                    <p className={`text-lg font-black ${item.color}`}>{item.value}</p>
                </div>
            ))}
        </div>

        <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs text-white/50 mb-1">
                <span className="font-semibold">Phase Progress</span>
                <span className="text-purple-400 font-bold">Phase 2 of 4</span>
            </div>
            <div className="w-full h-2 bg-white/[0.06] rounded-full overflow-hidden">
                <div className="h-full w-[52%] bg-gradient-to-r from-purple-500 to-blue-500 rounded-full animate-pulse" />
            </div>
        </div>

        <div className="mt-5 space-y-2">
            {[
                { action: 'Logbook #8 approved', time: '2h ago', dot: 'bg-emerald-400' },
                { action: 'Guide reviewed Phase 2', time: '1d ago', dot: 'bg-blue-400' },
                { action: 'Proposal approved', time: '3d ago', dot: 'bg-purple-400' },
            ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${item.dot}`} />
                    <span className="text-xs text-white/60 flex-1">{item.action}</span>
                    <span className="text-xs text-white/30">{item.time}</span>
                </div>
            ))}
        </div>
    </div>
);

// ══════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════
const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const { setAuth, setLoading, isLoading } = useAuthStore();
    const portalRef = useRef<HTMLDivElement>(null);

    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    // Claim state
    const [showClaim, setShowClaim] = useState(false);
    const [claimPrn, setClaimPrn] = useState('');
    const [claimEmail, setClaimEmail] = useState('');
    const [claimPassword, setClaimPassword] = useState('');
    const [claimConfirm, setClaimConfirm] = useState('');
    const [claimShowPw, setClaimShowPw] = useState(false);
    const [claimError, setClaimError] = useState('');
    const [claimLoading, setClaimLoading] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const scrollToPortal = () => portalRef.current?.scrollIntoView({ behavior: 'smooth' });

    const scrollTo = (id: string) => {
        setMobileMenuOpen(false);
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!email || !password) { setError('Email and password are required'); return; }
        try {
            setLoading(true);
            const res = await api.login(email, password);
            setAuth(res.token, { 
                user_id: res.user_id, 
                email: res.email, 
                full_name: res.full_name,
                role: res.role, 
                prn_no: res.prn_no ?? null, 
                roll_no: res.roll_no ?? null, 
                batch_year: res.batch_year ?? null 
            });
            navigate(`/${res.role.toLowerCase()}/dashboard`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const handleClaim = async (e: React.FormEvent) => {
        e.preventDefault();
        setClaimError('');
        if (selectedRole === 'STUDENT' && !claimPrn.trim()) { setClaimError('PRN is required for students'); return; }
        if (!claimEmail || !claimPassword) { setClaimError('Email and password are required'); return; }
        if (claimPassword !== claimConfirm) { setClaimError('Passwords do not match'); return; }
        try {
            setClaimLoading(true);
            const payload: any = { email: claimEmail.trim(), password: claimPassword, role: selectedRole as string };
            if (selectedRole === 'STUDENT') payload.prn_no = claimPrn.trim();
            const res = await api.claimAccount(payload);
            setAuth(res.token, { 
                user_id: res.user_id, 
                email: res.email, 
                full_name: res.full_name,
                role: res.role, 
                prn_no: res.prn_no ?? null, 
                roll_no: res.roll_no ?? null, 
                batch_year: res.batch_year ?? null 
            });
            navigate(`/${res.role.toLowerCase()}/dashboard`);
        } catch (err) {
            setClaimError(err instanceof Error ? err.message : 'Failed to claim account');
        } finally {
            setClaimLoading(false);
        }
    };

    const activeRole = ROLES.find(r => r.value === selectedRole);

    return (
        <div className="bg-[#0a0015] text-white min-h-screen overflow-x-hidden selection:bg-purple-500/30" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
            
            {/* ─── Global styles ─── */}

            {/* ══════════════════════ NAVBAR ══════════════════════ */}
            <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${scrolled ? 'bg-[#0a0015]/80 backdrop-blur-2xl border-b border-white/[0.06]' : ''}`}>
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    {/* Logo */}
                    <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10">
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-500 via-blue-500 to-pink-500 rounded-2xl blur-sm opacity-70" />
                            <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                                <Sparkles className="w-5 h-5 text-white" />
                            </div>
                        </div>
                        <span className="text-xl font-black tracking-tight">
                            ProTrack<span className="shimmer-text">-Auto</span>
                        </span>
                    </div>

                    {/* Desktop Nav */}
                    <nav className="hidden md:flex items-center gap-8">
                        {NAV_LINKS.map(link => (
                            <button key={link.id} onClick={() => scrollTo(link.id)} className="text-sm font-semibold text-white/60 hover:text-white transition-colors duration-200">
                                {link.label}
                            </button>
                        ))}
                    </nav>

                    {/* CTA */}
                    <div className="hidden md:flex items-center gap-3">
                        <button onClick={scrollToPortal} className="group relative px-6 py-2.5 rounded-xl font-bold text-sm overflow-hidden transition-all duration-200 hover:scale-105 active:scale-95">
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600" />
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <span className="relative flex items-center gap-2">Login <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" /></span>
                        </button>
                    </div>

                    {/* Mobile toggle */}
                    <button className="md:hidden text-white/70 hover:text-white transition-colors" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                        {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden glass-strong border-t border-white/[0.08] px-6 py-6 animate-fade-in">
                        <div className="flex flex-col gap-5">
                            {NAV_LINKS.map(link => (
                                <button key={link.id} onClick={() => scrollTo(link.id)} className="text-left text-lg font-bold text-white/70 hover:text-white transition-colors">
                                    {link.label}
                                </button>
                            ))}
                            <button onClick={() => { setMobileMenuOpen(false); scrollToPortal(); }} className="mt-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl font-bold text-white text-left">
                                Login to Portal
                            </button>
                        </div>
                    </div>
                )}
            </header>

            {/* ══════════════════════ HERO ══════════════════════ */}
            <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
                {/* Blob background */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="animate-blob absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-700/30 rounded-full blur-[120px]" />
                    <div className="animate-blob blob-delay-1 absolute top-[10%] right-[-15%] w-[500px] h-[500px] bg-blue-700/25 rounded-full blur-[120px]" />
                    <div className="animate-blob blob-delay-2 absolute bottom-[-10%] left-[30%] w-[400px] h-[400px] bg-pink-700/20 rounded-full blur-[100px]" />

                    {/* Grid overlay */}
                    <div className="absolute inset-0 opacity-[0.04]">
                        <svg className="w-full h-full">
                            <defs>
                                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
                                </pattern>
                            </defs>
                            <rect width="100%" height="100%" fill="url(#grid)" />
                        </svg>
                    </div>
                </div>

                <div className="relative max-w-7xl mx-auto px-6 w-full py-20 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    {/* Left: Text */}
                    <div>
                        {/* Badge */}
                        <div className="animate-slide-up inline-flex items-center gap-2 mb-8 px-4 py-2 glass rounded-full">
                            <span className="flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse" />
                            <span className="text-xs font-bold uppercase tracking-widest text-white/60">Academic Portal v2.0 · Live Now</span>
                        </div>

                        <h1 className="animate-slide-up delay-100 text-5xl md:text-6xl lg:text-7xl font-black leading-[1.08] tracking-tight mb-6">
                            Academic Projects.{' '}
                            <br />
                            <span className="shimmer-text">Zero Friction.</span>
                        </h1>

                        <p className="animate-slide-up delay-200 text-lg md:text-xl text-white/60 leading-relaxed max-w-xl mb-10">
                            The unified platform for universities — from group formation to final evaluation.
                            We automate the boring stuff so you can focus on building great things.
                        </p>

                        <div className="animate-slide-up delay-300 flex flex-col sm:flex-row gap-4">
                            <button onClick={scrollToPortal} className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold text-base overflow-hidden transition-all duration-200 hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(168,85,247,0.4)]">
                                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 bg-[length:200%_100%] animate-shimmer" />
                                <span className="relative">Access Portal</span>
                                <ArrowRight className="w-5 h-5 relative group-hover:translate-x-1 transition-transform" />
                            </button>
                            <button onClick={() => scrollTo('features')} className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold text-base glass hover:bg-white/[0.07] transition-all duration-200 hover:scale-105 active:scale-95">
                                Explore Features
                                <ChevronRight className="w-5 h-5 opacity-60" />
                            </button>
                        </div>

                        {/* Mini stats */}
                        <div className="animate-slide-up delay-400 flex flex-wrap gap-6 mt-12 pt-8 border-t border-white/[0.06]">
                            {STATS.map((stat, i) => (
                                <div key={i} className="text-center">
                                    <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
                                    <p className="text-xs text-white/40 font-semibold mt-0.5">{stat.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right: Mock Dashboard */}
                    <div className="animate-slide-up delay-500 animate-float hidden lg:block">
                        <MockDashboard />
                    </div>
                </div>

                {/* Scroll indicator */}
                <button onClick={() => scrollTo('features')} className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/30 hover:text-white/60 transition-colors group">
                    <span className="text-xs font-semibold tracking-widest uppercase">Scroll</span>
                    <div className="w-6 h-10 rounded-full border border-white/20 flex items-start justify-center pt-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" />
                    </div>
                </button>
            </section>

            {/* ══════════════════════ FEATURES ══════════════════════ */}
            <section id="features" className="relative py-28 px-6 overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-purple-900/20 rounded-full blur-[120px]" />
                </div>

                <div className="relative max-w-7xl mx-auto">
                    <div className="text-center mb-20">
                        <p className="text-xs font-bold uppercase tracking-[0.3em] text-purple-400 mb-4">Core Platform</p>
                        <h2 className="text-4xl md:text-5xl font-black mb-5">
                            Built for every role in<br /><span className="shimmer-text">the academic process.</span>
                        </h2>
                        <p className="text-lg text-white/50 max-w-2xl mx-auto">We replaced scattered tools — Excel sheets, email chains, and physical logbooks — with a single, cohesive ecosystem.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {FEATURES.map((feat, idx) => (
                            <div key={idx} className="group relative glass rounded-3xl p-7 hover:bg-white/[0.06] transition-all duration-300 hover:-translate-y-1 cursor-default overflow-hidden">
                                <div className={`absolute inset-0 bg-gradient-to-br ${feat.color} opacity-0 group-hover:opacity-[0.04] transition-opacity duration-300 rounded-3xl`} />
                                
                                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feat.color} p-0.5 mb-6 shadow-lg transform group-hover:-translate-y-1 transition-transform duration-300`}>
                                    <div className="w-full h-full bg-[#0a0015] rounded-[14px] flex items-center justify-center">
                                        <feat.icon className="w-6 h-6 text-white" />
                                    </div>
                                </div>

                                <p className="text-xs font-bold text-white/30 uppercase tracking-widest mb-2">{feat.stat}</p>
                                <h3 className="text-xl font-bold text-white mb-3">{feat.title}</h3>
                                <p className="text-sm text-white/50 leading-relaxed">{feat.desc}</p>
                            </div>
                        ))}
                    </div>

                    {/* Extra feature rows */}
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { icon: GitBranch, title: 'Phase Tracking', desc: 'Move through Planning → Development → Testing → Submission with milestone deadlines.', color: 'from-violet-500 to-purple-500' },
                            { icon: Bell, title: 'Smart Notifications', desc: 'Automated alerts for deadlines, approvals, rejections, and guide feedback.', color: 'from-rose-500 to-red-500' },
                            { icon: Database, title: 'Centralized Storage', desc: 'Logbooks, proposals, and evaluations stored securely and accessible anytime.', color: 'from-teal-500 to-cyan-500' },
                        ].map((feat, idx) => (
                            <div key={idx} className="group glass rounded-3xl p-7 hover:bg-white/[0.06] transition-all duration-300 hover:-translate-y-1 flex items-start gap-5">
                                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${feat.color} p-0.5 shrink-0`}>
                                    <div className="w-full h-full bg-[#0a0015] rounded-[12px] flex items-center justify-center">
                                        <feat.icon className="w-5 h-5 text-white" />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-white mb-1.5">{feat.title}</h3>
                                    <p className="text-sm text-white/50 leading-relaxed">{feat.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════════════════════ HOW IT WORKS ══════════════════════ */}
            <section id="how-it-works" className="relative py-28 px-6 border-y border-white/[0.04] bg-white/[0.01]">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-20">
                        <p className="text-xs font-bold uppercase tracking-[0.3em] text-blue-400 mb-4">Project Lifecycle</p>
                        <h2 className="text-4xl md:text-5xl font-black mb-5">Built for every step of the <span className="shimmer-text">academic year.</span></h2>
                        <p className="text-lg text-white/50 max-w-2xl mx-auto">A structured 4-phase timeline from day one of semester to the final presentation day.</p>
                    </div>

                    <div className="relative">
                        {/* Connector */}
                        <div className="hidden lg:block absolute top-10 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-blue-500/20 via-purple-500/30 to-emerald-500/20" />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {[
                                { num: '01', title: 'Planning', desc: 'Form your group, submit your project proposal, and get it approved by your guide.', color: 'from-blue-500 to-cyan-500', tags: ['Group Formation', 'Proposal'] },
                                { num: '02', title: 'Development', desc: 'Submit weekly logbooks documenting your progress. Guide reviews and approves entries.', color: 'from-purple-500 to-pink-500', tags: ['Logbooks', 'Guide Review'] },
                                { num: '03', title: 'Testing', desc: 'Finalize implementation, run testing cycles, and document results in your logbook.', color: 'from-amber-500 to-orange-500', tags: ['Testing', 'Documentation'] },
                                { num: '04', title: 'Submission', desc: 'Present your completed project to the committee for rubric-based evaluation.', color: 'from-emerald-500 to-teal-500', tags: ['Evaluation', 'Final Score'] },
                            ].map((phase, idx) => (
                                <div key={idx} className="relative group">
                                    <div className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${phase.color} p-0.5 mb-6 shadow-xl mx-auto lg:mx-0`}>
                                        <div className="w-full h-full bg-[#0a0015] rounded-[22px] flex items-center justify-center">
                                            <span className="text-2xl font-black text-white">{phase.num}</span>
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-3 text-center lg:text-left">Phase {idx + 1} — {phase.title}</h3>
                                    <p className="text-sm text-white/50 leading-relaxed mb-5 text-center lg:text-left">{phase.desc}</p>
                                    <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
                                        {phase.tags.map(tag => (
                                            <span key={tag} className="px-3 py-1 glass rounded-full text-xs font-semibold text-white/60">{tag}</span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ══════════════════════ ROLES ══════════════════════ */}
            <section id="roles" className="relative py-28 px-6 overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/[0.01] to-transparent" />
                </div>
                <div className="relative max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <p className="text-xs font-bold uppercase tracking-[0.3em] text-pink-400 mb-4">Who is this for?</p>
                        <h2 className="text-4xl md:text-5xl font-black mb-5">Tailored for your <span className="shimmer-text">role.</span></h2>
                        <p className="text-lg text-white/50 max-w-2xl mx-auto">Different responsibilities demand different interfaces. Customized dashboards for everyone involved.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {ROLES.map((role, idx) => (
                            <div key={idx} className="group relative glass rounded-3xl p-7 hover:bg-white/[0.06] transition-all duration-300 hover:-translate-y-2 overflow-hidden cursor-default">
                                <div className={`absolute inset-0 bg-gradient-to-br ${role.color} opacity-0 group-hover:opacity-[0.06] transition-opacity duration-300`} />
                                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                
                                <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r ${role.color} text-white mb-5`}>{role.badge}</span>
                                
                                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${role.color} p-0.5 mb-5`}>
                                    <div className="w-full h-full bg-[#0a0015] rounded-[14px] flex items-center justify-center">
                                        <role.icon className="w-7 h-7 text-white" />
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">{role.label}</h3>
                                <p className="text-sm text-white/50 leading-relaxed mb-5">{role.description}</p>
                                
                                <div className="pt-4 border-t border-white/[0.06] flex items-center text-white/30 group-hover:text-white/60 transition-colors text-sm font-semibold gap-1">
                                    Explore dashboard <ArrowUpRight className="w-4 h-4" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════════════════════ PORTAL / LOGIN ══════════════════════ */}
            <section id="portal" ref={portalRef} className="relative py-28 px-6 bg-white/[0.01] border-t border-white/[0.04] overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-purple-900/20 blur-[120px] rounded-full" />
                </div>

                <div className="relative max-w-5xl mx-auto">
                    <div className="text-center mb-14">
                        <p className="text-xs font-bold uppercase tracking-[0.3em] text-purple-400 mb-4">Secure Portal</p>
                        <h2 className="text-4xl md:text-5xl font-black mb-5">Access your <span className="shimmer-text">workspace.</span></h2>
                        <p className="text-lg text-white/50 max-w-xl mx-auto">Login with your university credentials or claim your account if you're a new user.</p>
                    </div>

                    {/* Step 1: Pick Role */}
                    {!selectedRole && (
                        <div className="animate-fade-in">
                            <p className="text-center text-sm text-white/40 font-semibold uppercase tracking-widest mb-6">Select your role to continue</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                                {ROLES.map((role) => (
                                    <button
                                        key={role.value}
                                        onClick={() => { setSelectedRole(role.value); setError(''); setEmail(''); setPassword(''); }}
                                        className="group relative glass-strong rounded-3xl p-7 text-left hover:bg-white/[0.08] transition-all duration-300 hover:-translate-y-2 overflow-hidden cursor-pointer"
                                        style={{ boxShadow: 'none' }}
                                        onMouseEnter={e => (e.currentTarget.style.boxShadow = role.glow)}
                                        onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
                                    >
                                        <div className={`absolute inset-0 bg-gradient-to-br ${role.color} opacity-0 group-hover:opacity-[0.07] transition-opacity duration-300 rounded-3xl`} />
                                        
                                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${role.color} p-0.5 mb-5 transform group-hover:-translate-y-1 transition-transform duration-300`}>
                                            <div className="w-full h-full bg-[#0a0015] rounded-[14px] flex items-center justify-center">
                                                <role.icon className="w-7 h-7 text-white" />
                                            </div>
                                        </div>

                                        <h3 className="text-xl font-bold text-white mb-1.5">{role.label}</h3>
                                        <p className="text-sm text-white/50 leading-relaxed mb-5">{role.description}</p>

                                        <div className={`flex items-center gap-2 text-sm font-bold bg-gradient-to-r ${role.color} bg-clip-text text-transparent`}>
                                            Login as {role.label} <ArrowRight className="w-4 h-4 text-white/50 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Login Form */}
                    {selectedRole && !showClaim && (
                        <div className="animate-fade-in max-w-md mx-auto">
                            <button onClick={() => { setSelectedRole(null); setError(''); }} className="flex items-center gap-2 text-sm text-white/40 hover:text-white mb-8 transition-colors group">
                                <ArrowRight className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
                                Back to roles
                            </button>

                            <div className="glass-strong rounded-3xl overflow-hidden shadow-2xl" style={{ boxShadow: activeRole?.glow }}>
                                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                                
                                {/* Header */}
                                <div className={`bg-gradient-to-r ${activeRole?.color} p-px`}>
                                    <div className="bg-[#0f0020] rounded-t-[calc(1.5rem-1px)] px-8 pt-8 pb-6">
                                        <div className="flex items-center gap-4 mb-2">
                                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${activeRole?.color} p-0.5`}>
                                                <div className="w-full h-full bg-[#0f0020] rounded-[11px] flex items-center justify-center">
                                                    {activeRole && React.createElement(activeRole.icon, { className: 'w-6 h-6 text-white' })}
                                                </div>
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-black text-white">{activeRole?.label}</h3>
                                                <p className="text-sm text-white/50">Enter your credentials</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="px-8 pb-8 pt-6 bg-[#0f0020]">
                                    <form onSubmit={handleLogin} className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Email Address</label>
                                            <div className="relative">
                                                <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                                                <input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="off"
                                                    className="w-full pl-11 pr-4 py-3.5 bg-white/[0.04] border border-white/[0.10] text-white rounded-xl focus:outline-none focus:border-purple-500/60 focus:bg-white/[0.07] transition-all text-sm" />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Password</label>
                                            <div className="relative">
                                                <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                                                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password"
                                                    className="w-full pl-11 pr-12 py-3.5 bg-white/[0.04] border border-white/[0.10] text-white rounded-xl focus:outline-none focus:border-purple-500/60 focus:bg-white/[0.07] transition-all text-sm" />
                                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors">
                                                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                                </button>
                                            </div>
                                        </div>

                                        {error && (
                                            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                                <Shield className="w-5 h-5 shrink-0 mt-0.5" />
                                                <span>{error}</span>
                                            </div>
                                        )}

                                        <button type="submit" disabled={isLoading}
                                            className={`w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all ${isLoading ? 'bg-white/10 cursor-not-allowed text-white/50' : `bg-gradient-to-r ${activeRole?.color} hover:opacity-90 hover:shadow-xl active:scale-[0.98]`}`}>
                                            {isLoading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Authenticating...</> : <>Sign In to Dashboard <ArrowRight className="w-5 h-5" /></>}
                                        </button>
                                    </form>

                                    {/* Demo credentials */}
                                    {activeRole?.demo && (
                                        <div className="mt-6 p-4 bg-white/[0.03] border border-white/[0.06] rounded-2xl">
                                            <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-3">Demo Credentials</p>
                                            <div className="space-y-2 font-mono text-xs">
                                                <div className="flex justify-between gap-3">
                                                    <span className="text-white/40">Email</span>
                                                    <button type="button" onClick={() => { setEmail(activeRole.demo.email); setPassword(activeRole.demo.password); }} className="text-purple-400 hover:text-purple-300 truncate transition-colors">{activeRole.demo.email}</button>
                                                </div>
                                                <div className="flex justify-between gap-3">
                                                    <span className="text-white/40">Password</span>
                                                    <span className="text-white/60">{activeRole.demo.password}</span>
                                                </div>
                                            </div>
                                            <button type="button" onClick={() => { setEmail(activeRole.demo.email); setPassword(activeRole.demo.password); }}
                                                className="w-full mt-3 py-2 text-xs font-bold uppercase tracking-widest border border-white/[0.08] hover:border-white/20 rounded-xl text-white/50 hover:text-white transition-all">
                                                ↑ Auto-fill credentials
                                            </button>
                                        </div>
                                    )}

                                    {/* Claim link */}
                                    <div className="mt-5 text-center">
                                        <p className="text-sm text-white/40">
                                            First time?{' '}
                                            <button onClick={() => { setShowClaim(true); setClaimError(''); }} className="text-white font-bold hover:text-purple-300 transition-colors">
                                                Claim your account
                                            </button>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Claim form */}
                    {selectedRole && showClaim && (
                        <div className="animate-fade-in max-w-md mx-auto">
                            <button onClick={() => { setShowClaim(false); setClaimError(''); }} className="flex items-center gap-2 text-sm text-white/40 hover:text-white mb-8 transition-colors group">
                                <ArrowRight className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
                                Back to login
                            </button>

                            <div className="glass-strong rounded-3xl overflow-hidden" style={{ boxShadow: activeRole?.glow }}>
                                <div className={`bg-gradient-to-r ${activeRole?.color} p-px`}>
                                    <div className="bg-[#0f0020] rounded-t-[calc(1.5rem-1px)] px-8 pt-8 pb-6">
                                        <h3 className="text-2xl font-black text-white">Claim Account</h3>
                                        <p className="text-sm text-white/50 mt-1">Set up your {activeRole?.label} account for the first time</p>
                                    </div>
                                </div>

                                <div className="px-8 pb-8 pt-6 bg-[#0f0020]">
                                    <form onSubmit={handleClaim} className="space-y-4">
                                        {selectedRole === 'STUDENT' && (
                                            <div>
                                                <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">PRN Number</label>
                                                <div className="relative">
                                                    <Hash size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                                                    <input type="text" value={claimPrn} onChange={e => setClaimPrn(e.target.value)} placeholder="e.g. PRN2025001"
                                                        className="w-full pl-11 pr-4 py-3.5 bg-white/[0.04] border border-white/[0.10] text-white rounded-xl focus:outline-none focus:border-purple-500/60 focus:bg-white/[0.07] transition-all text-sm" />
                                                </div>
                                            </div>
                                        )}
                                        <div>
                                            <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Registered Email</label>
                                            <div className="relative">
                                                <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                                                <input type="email" value={claimEmail} onChange={e => setClaimEmail(e.target.value)} placeholder="your.email@university.edu"
                                                    className="w-full pl-11 pr-4 py-3.5 bg-white/[0.04] border border-white/[0.10] text-white rounded-xl focus:outline-none focus:border-purple-500/60 focus:bg-white/[0.07] transition-all text-sm" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Set Password</label>
                                            <div className="relative">
                                                <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                                                <input type={claimShowPw ? 'text' : 'password'} value={claimPassword} onChange={e => setClaimPassword(e.target.value)} placeholder="Min. 8 characters"
                                                    className="w-full pl-11 pr-12 py-3.5 bg-white/[0.04] border border-white/[0.10] text-white rounded-xl focus:outline-none focus:border-purple-500/60 focus:bg-white/[0.07] transition-all text-sm" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Confirm Password</label>
                                            <div className="relative">
                                                <CheckCircle2 size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                                                <input type={claimShowPw ? 'text' : 'password'} value={claimConfirm} onChange={e => setClaimConfirm(e.target.value)} placeholder="Retype password"
                                                    className="w-full pl-11 pr-12 py-3.5 bg-white/[0.04] border border-white/[0.10] text-white rounded-xl focus:outline-none focus:border-purple-500/60 focus:bg-white/[0.07] transition-all text-sm" />
                                                <button type="button" onClick={() => setClaimShowPw(!claimShowPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors">
                                                    {claimShowPw ? <EyeOff size={15} /> : <Eye size={15} />}
                                                </button>
                                            </div>
                                        </div>

                                        {claimError && (
                                            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                                <Shield className="w-4 h-4 shrink-0 mt-0.5" />
                                                <span>{claimError}</span>
                                            </div>
                                        )}

                                        <button type="submit" disabled={claimLoading}
                                            className={`w-full py-4 mt-2 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all ${claimLoading ? 'bg-white/10 cursor-not-allowed text-white/50' : `bg-gradient-to-r ${activeRole?.color} hover:opacity-90 active:scale-[0.98]`}`}>
                                            {claimLoading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Processing...</> : <>Claim & Login <ArrowRight className="w-5 h-5" /></>}
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* ══════════════════════ FOOTER ══════════════════════ */}
            <footer className="border-t border-white/[0.04] bg-[#060010] pt-16 pb-8 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                        {/* Brand */}
                        <div className="md:col-span-1">
                            <div className="flex items-center gap-3 mb-5">
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                                    <Sparkles className="w-4 h-4 text-white" />
                                </div>
                                <span className="text-lg font-black tracking-tight">ProTrack<span className="text-white/40">-Auto</span></span>
                            </div>
                            <p className="text-sm text-white/40 leading-relaxed">The unified academic project lifecycle management platform for universities.</p>
                        </div>

                        {/* Quick Links */}
                        <div>
                            <h4 className="text-sm font-bold uppercase tracking-widest text-white/30 mb-5">Quick Links</h4>
                            <ul className="space-y-3">
                                {['Features', 'How it Works', 'Roles', 'Login Portal'].map(link => (
                                    <li key={link}>
                                        <button className="text-sm text-white/50 hover:text-white transition-colors">{link}</button>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Roles */}
                        <div>
                            <h4 className="text-sm font-bold uppercase tracking-widest text-white/30 mb-5">Roles</h4>
                            <ul className="space-y-3">
                                {ROLES.map(r => (
                                    <li key={r.value}>
                                        <button onClick={() => { setSelectedRole(r.value); scrollToPortal(); }} className="text-sm text-white/50 hover:text-white transition-colors">{r.label}</button>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Support */}
                        <div>
                            <h4 className="text-sm font-bold uppercase tracking-widest text-white/30 mb-5">Support</h4>
                            <ul className="space-y-3">
                                <li className="text-sm text-white/50">📧 admin@university.edu</li>
                                <li className="text-sm text-white/50">📞 +91-20-12345678</li>
                                <li className="text-sm text-white/50">🕘 Mon–Fri, 9am–5pm</li>
                                <li>
                                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                                        <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] animate-pulse" />
                                        All systems operational
                                    </span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-white/[0.04] flex flex-col md:flex-row items-center justify-between gap-4">
                        <p className="text-sm text-white/30">© {new Date().getFullYear()} ProTrack-Auto. All rights reserved.</p>
                        <p className="text-sm text-white/20 font-mono">v2.0.0 · Academic Portal</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
