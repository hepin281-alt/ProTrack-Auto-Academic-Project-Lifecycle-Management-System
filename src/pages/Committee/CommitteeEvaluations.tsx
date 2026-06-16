import React from 'react';
import { AppShell } from '../../layouts/AppShell';
import { Star } from 'lucide-react';

export const CommitteeEvaluations: React.FC = () => (
 <AppShell currentPage="/committee/evaluations">
 <div className="mb-8 flex items-center gap-3">
 <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-500">
 <Star size={18} className="text-white" />
 </div>
 <div>
 <h1 className="text-2xl font-black text-white">Evaluations</h1>
 <p className="text-white/50 text-sm">Project evaluation queue and grading</p>
 </div>
 </div>
 <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-16 text-center">
 <Star size={40} className="text-white/50 mx-auto mb-4" />
 <p className="text-white/50 text-sm">Use the Dashboard to access the grading sheet.</p>
 </div>
 </AppShell>
);
