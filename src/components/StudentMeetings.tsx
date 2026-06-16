import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/apiClient';
import { Calendar, Clock, FileText, Loader2 } from 'lucide-react';
import dayjs from 'dayjs';

interface Meeting {
  meeting_id: string;
  title: string;
  scheduled_at: string;
  notes: string;
  attendance: string[];
}

export const StudentMeetings: React.FC<{ groupId: string }> = ({ groupId }) => {
  const { token } = useAuthStore();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token && groupId) {
      fetchMeetings();
    }
  }, [token, groupId]);

  const fetchMeetings = async () => {
    try {
      setIsLoading(true);
      const data = await api.getMeetings(token!, groupId);
      setMeetings(data);
    } catch (error) {
      console.error('Failed to fetch meetings', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-purple-500" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Calendar size={20} className="text-purple-400" />
          Scheduled Meetings
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {meetings.length === 0 ? (
          <div className="text-center py-10 bg-white/5 rounded-xl border border-white/[0.08]">
            <Calendar size={40} className="mx-auto text-white/50 mb-3" />
            <p className="text-white/50">No meetings scheduled by your guide yet.</p>
          </div>
        ) : (
          meetings.map(meeting => (
            <div key={meeting.meeting_id} className="bg-white/5 border border-white/[0.08] rounded-xl p-5 flex flex-col md:flex-row gap-6">
              <div className="flex-1 space-y-3">
                <div>
                  <h4 className="font-bold text-white text-lg">{meeting.title}</h4>
                  <div className="flex items-center gap-4 mt-1 text-sm text-white/50">
                    <span className="flex items-center gap-1"><Calendar size={14} /> {dayjs(meeting.scheduled_at).format('MMM D, YYYY')}</span>
                    <span className="flex items-center gap-1"><Clock size={14} /> {dayjs(meeting.scheduled_at).format('h:mm A')}</span>
                  </div>
                </div>
                {meeting.notes && (
                  <div className="bg-white/5 p-3 rounded-lg text-sm text-white/50 border border-white/[0.08] flex gap-2 items-start">
                    <FileText size={16} className="text-purple-400 shrink-0 mt-0.5" />
                    <p>{meeting.notes}</p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
