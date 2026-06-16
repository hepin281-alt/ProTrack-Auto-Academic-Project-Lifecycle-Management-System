import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/apiClient';
import { FileSignature, CheckCircle2, XCircle, Clock, Loader2, FileText } from 'lucide-react';
import dayjs from 'dayjs';

interface Signoff {
  signoff_id: string;
  document_type: string;
  status: string;
  comments: string;
  signed_at: string;
}

export const StudentSignoffs: React.FC<{ groupId: string }> = ({ groupId }) => {
  const { token } = useAuthStore();
  const [signoffs, setSignoffs] = useState<Signoff[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token && groupId) {
      fetchSignoffs();
    }
  }, [token, groupId]);

  const fetchSignoffs = async () => {
    try {
      setIsLoading(true);
      const data = await api.getSignoffs(token!, groupId);
      setSignoffs(data);
    } catch (error) {
      console.error('Failed to fetch signoffs', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED': return <CheckCircle2 size={16} className="text-green-400" />;
      case 'REJECTED': return <XCircle size={16} className="text-red-400" />;
      case 'REVISION_REQUESTED': return <Clock size={16} className="text-amber-400" />;
      default: return <Clock size={16} className="text-white/50" />;
    }
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-purple-500" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <FileSignature size={20} className="text-purple-400" />
          Document Sign-offs
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {signoffs.length === 0 ? (
          <div className="text-center py-10 bg-white/5 rounded-xl border border-white/[0.08]">
            <FileSignature size={40} className="mx-auto text-white/50 mb-3" />
            <p className="text-white/50">No document sign-offs received yet.</p>
          </div>
        ) : (
          signoffs.map(signoff => (
            <div key={signoff.signoff_id} className="bg-white/5 border border-white/[0.08] rounded-xl p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-white text-lg flex items-center gap-2">
                    {signoff.document_type.replace(/_/g, ' ')}
                  </h4>
                  <div className="flex items-center gap-4 mt-2 text-sm text-white/50">
                    <span className="flex items-center gap-1.5 font-medium border border-white/10 px-2.5 py-1 rounded-lg bg-white/5">
                      {getStatusIcon(signoff.status)}
                      <span className={
                        signoff.status === 'APPROVED' ? 'text-green-400' :
                        signoff.status === 'REJECTED' ? 'text-red-400' :
                        'text-amber-400'
                      }>{signoff.status.replace(/_/g, ' ')}</span>
                    </span>
                    <span className="flex items-center gap-1"><Clock size={14} /> {dayjs(signoff.signed_at).format('MMM D, YYYY h:mm A')}</span>
                  </div>
                </div>
              </div>

              {signoff.comments && (
                <div className="mt-4 bg-white/5 p-4 rounded-lg text-sm text-white/70 border border-white/[0.08] flex gap-3 items-start">
                  <FileText size={16} className="text-purple-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{signoff.comments}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
