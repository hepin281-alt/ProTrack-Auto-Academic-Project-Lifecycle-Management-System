import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/apiClient';
import { Calendar, Clock, Users, Plus, CheckCircle2, FileText, Loader2 } from 'lucide-react';
import dayjs from 'dayjs';

interface Meeting {
 meeting_id: string;
 title: string;
 scheduled_at: string;
 notes: string;
 attendance: string[];
}

export const GuideMeetings: React.FC<{ groupId: string, members: any[] }> = ({ groupId, members }) => {
 const { token } = useAuthStore();
 const [meetings, setMeetings] = useState<Meeting[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [isCreating, setIsCreating] = useState(false);

 // Form state
 const [title, setTitle] = useState('');
 const [date, setDate] = useState('');
 const [time, setTime] = useState('');
 const [notes, setNotes] = useState('');

 useEffect(() => {
 if (token && groupId) fetchMeetings();
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

 const handleCreate = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!title || !date || !time) return;

 try {
 const scheduled_at = new Date(`${date}T${time}`).toISOString();
 await api.createMeeting(token!, groupId, { title, scheduled_at, notes });
 setTitle(''); setDate(''); setTime(''); setNotes('');
 setIsCreating(false);
 fetchMeetings();
 } catch (error) {
 console.error('Failed to create meeting', error);
 }
 };

 const handleToggleAttendance = async (meetingId: string, studentId: string, currentAttendance: string[]) => {
 try {
 const isPresent = currentAttendance.includes(studentId);
 const newAttendance = isPresent 
 ? currentAttendance.filter(id => id !== studentId)
 : [...currentAttendance, studentId];
 
 await api.updateMeetingAttendance(token!, groupId, meetingId, newAttendance);
 
 // Optimistic update
 setMeetings(meetings.map(m => m.meeting_id === meetingId ? { ...m, attendance: newAttendance } : m));
 } catch (error) {
 console.error('Failed to update attendance', error);
 }
 };

 if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-purple-500" /></div>;

 return (
 <div className="space-y-6">
 <div className="flex justify-between items-center">
 <h3 className="text-lg font-bold text-white flex items-center gap-2">
 <Calendar size={20} className="text-purple-400" />
 Group Meetings
 </h3>
 <button 
 onClick={() => setIsCreating(!isCreating)}
 className="flex items-center gap-2 px-4 py-2 bg-white/[0.04] /10 hover:bg-white/5/20 text-white rounded-lg transition-colors text-sm font-medium"
 >
 {isCreating ? 'Cancel' : <><Plus size={16} /> Schedule Meeting</>}
 </button>
 </div>

 {isCreating && (
 <form onSubmit={handleCreate} className="bg-white/5 border border-white/[0.08] rounded-xl p-5 space-y-4">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-bold text-white/50 uppercase mb-1">Meeting Title</label>
 <input
 required
 value={title}
 onChange={e => setTitle(e.target.value)}
 className="w-full bg-white/5 border border-white/[0.08] rounded-lg px-4 py-2 text-white outline-none focus:border-purple-500"
 placeholder="e.g., Weekly Progress Review"
 />
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-bold text-white/50 uppercase mb-1">Date</label>
 <input
 required
 type="date"
 value={date}
 onChange={e => setDate(e.target.value)}
 className="w-full bg-white/5 border border-white/[0.08] rounded-lg px-4 py-2 text-white outline-none focus:border-purple-500"
 />
 </div>
 <div>
 <label className="block text-xs font-bold text-white/50 uppercase mb-1">Time</label>
 <input
 required
 type="time"
 value={time}
 onChange={e => setTime(e.target.value)}
 className="w-full bg-white/5 border border-white/[0.08] rounded-lg px-4 py-2 text-white outline-none focus:border-purple-500"
 />
 </div>
 </div>
 </div>
 <div>
 <label className="block text-xs font-bold text-white/50 uppercase mb-1">Private Notes / Agenda</label>
 <textarea
 value={notes}
 onChange={e => setNotes(e.target.value)}
 className="w-full bg-white/5 border border-white/[0.08] rounded-lg px-4 py-2 text-white outline-none focus:border-purple-500 min-h-[80px]"
 placeholder="Optional notes about what to discuss..."
 />
 </div>
 <div className="flex justify-end">
 <button type="submit" className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-lg transition-colors">
 Schedule
 </button>
 </div>
 </form>
 )}

 <div className="grid grid-cols-1 gap-4">
 {meetings.length === 0 ? (
 <div className="text-center py-10 bg-white/5 rounded-xl border border-white/[0.08]">
 <Calendar size={40} className="mx-auto text-white/50 mb-3" />
 <p className="text-white/50">No meetings scheduled yet.</p>
 </div>
 ) : (
 meetings.map(meeting => (
 <div key={meeting.meeting_id} className="bg-white/5 border border-white/[0.08] rounded-xl p-5 flex flex-col md:flex-row gap-6">
 <div className="flex-1 space-y-3">
 <div>
 <h4 className="font-bold text-white text-lg">{meeting.title}</h4>
 <div className="flex items-center gap-4 mt-1 text-sm text-white/50">
 <span className="flex items-center gap-1"><Calendar size={14}/> {dayjs(meeting.scheduled_at).format('MMM D, YYYY')}</span>
 <span className="flex items-center gap-1"><Clock size={14}/> {dayjs(meeting.scheduled_at).format('h:mm A')}</span>
 </div>
 </div>
 {meeting.notes && (
 <div className="bg-white/5 p-3 rounded-lg text-sm text-white/50 border border-white/[0.08] flex gap-2 items-start">
 <FileText size={16} className="text-purple-400 shrink-0 mt-0.5" />
 <p>{meeting.notes}</p>
 </div>
 )}
 </div>
 
 <div className="md:w-64 bg-white/5 rounded-lg p-3 border border-white/[0.08]">
 <h5 className="text-xs font-bold text-white/50 uppercase flex items-center gap-2 mb-3">
 <Users size={14} /> Attendance
 </h5>
 <div className="space-y-2">
 {members.map((member: any) => {
 const isPresent = meeting.attendance?.includes(member.student_id);
 return (
 <button
 key={member.student_id}
 onClick={() => handleToggleAttendance(meeting.meeting_id, member.student_id, meeting.attendance || [])}
 className={`w-full flex items-center justify-between p-2 rounded text-sm transition-colors ${isPresent ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-white/50 hover:bg-white/[0.04] /10'}`}
 >
 <span className="truncate pr-2">{member.email.split('@')[0]}</span>
 <CheckCircle2 size={16} className={isPresent ? 'opacity-100' : 'opacity-30'} />
 </button>
 );
 })}
 </div>
 </div>
 </div>
 ))
 )}
 </div>
 </div>
 );
};
