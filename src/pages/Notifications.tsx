import React, { useState, useEffect } from 'react';
import { AppShell } from '../layouts/AppShell';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Send, CheckCircle, Loader2, CheckCheck, Megaphone, Activity } from 'lucide-react';
import { cn } from '../lib/utils';

interface Announcement {
  message_id: string;
  content: string;
  sender_email: string;
  sender_role: string;
  created_at: string;
  is_announcement: boolean;
}

interface PersonalNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

const STORAGE_KEY = 'protrack_read_notifications';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Notifications() {
  const { token, user } = useAuthStore();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState<'ANNOUNCEMENTS' | 'ACTIVITY'>('ACTIVITY');
  const [announcementText, setAnnouncementText] = useState('');
  const [readAnnouncements, setReadAnnouncements] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState('');

  // Load read announcements from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const ids = JSON.parse(stored);
        setReadAnnouncements(new Set(ids));
      }
    } catch (error) {
      console.error('Failed to load read announcements:', error);
    }
  }, []);

  // Fetch announcements
  const { data: announcements = [], isLoading: isLoadingAnnouncements } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => api.getAnnouncements(token!),
    enabled: !!token,
    refetchInterval: 30000,
  });

  // Fetch personal notifications
  const { data: personalNotifications = [], isLoading: isLoadingNotifications } = useQuery({
    queryKey: ['personalNotifications'],
    queryFn: () => api.getNotifications(token!),
    enabled: !!token && user?.role === 'STUDENT',
    refetchInterval: 30000,
  });

  // Post announcement mutation
  const postMutation = useMutation({
    mutationFn: (content: string) => api.sendAnnouncement(token!, content),
    onSuccess: () => {
      setAnnouncementText('');
      showToast('Announcement posted successfully!');
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
    onError: () => {
      showToast('Failed to post announcement. Please try again.');
    },
  });

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(''), 3000);
  };

  const markAnnouncementAsRead = (messageId: string) => {
    const newReadIds = new Set(readAnnouncements);
    newReadIds.add(messageId);
    setReadAnnouncements(newReadIds);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...newReadIds]));
  };

  const markPersonalAsRead = async (notificationId: string) => {
    try {
      await api.markNotificationRead(token!, notificationId);
      queryClient.invalidateQueries({ queryKey: ['personalNotifications'] });
      queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
    } catch (error) {
      console.error(error);
    }
  };

  const markAllAsRead = async () => {
    if (activeTab === 'ANNOUNCEMENTS') {
      const allIds = new Set(announcements.map((a: Announcement) => a.message_id));
      setReadAnnouncements(allIds);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...allIds]));
      showToast('All announcements marked as read');
    } else {
      try {
        await api.markAllNotificationsRead(token!);
        queryClient.invalidateQueries({ queryKey: ['personalNotifications'] });
        queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
        showToast('All notifications marked as read');
      } catch (error) {
        showToast('Failed to mark all as read');
      }
    }
  };

  const handlePostAnnouncement = () => {
    if (!announcementText.trim()) return;
    postMutation.mutate(announcementText.trim());
  };

  const getInitials = (email: string): string => {
    return email.charAt(0).toUpperCase();
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'COORDINATOR': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'GUIDE': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'COMMITTEE': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'STUDENT': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      default: return 'bg-white/[0.04] text-white/50 border-white/[0.08]';
    }
  };

  const getAvatarStyle = (role: string) => {
    if (role === 'COORDINATOR') return 'bg-gradient-to-br from-orange-500 to-red-500';
    return 'bg-gradient-to-br from-blue-500 to-indigo-500';
  };

  const unreadAnnouncementsCount = announcements.filter(
    (a: Announcement) => !readAnnouncements.has(a.message_id)
  ).length;

  const unreadPersonalCount = personalNotifications.filter(
    (n: PersonalNotification) => !n.read
  ).length;

  const currentUnreadCount = activeTab === 'ANNOUNCEMENTS' ? unreadAnnouncementsCount : unreadPersonalCount;

  return (
    <AppShell currentPage="/notifications">
      <div className="space-y-6">
        {toast && (
          <div className="fixed bottom-6 right-6 bg-white/[0.02] dark:bg-slate-900/90 backdrop-blur-xl border border-white/[0.08] text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 z-50">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span>{toast}</span>
          </div>
        )}

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="px-3 py-1 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center gap-2">
                <Bell className="w-4 h-4 text-white" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Notifications
                </span>
              </div>
            </div>
            <h1 className="text-3xl font-black text-white mb-2">
              Inbox
            </h1>
            <p className="text-white/50">Stay updated on your project group and system-wide announcements</p>
          </div>

          {(activeTab === 'ANNOUNCEMENTS' ? announcements.length > 0 : personalNotifications.length > 0) && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white rounded-xl font-medium transition-all text-sm"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all as read
            </button>
          )}
        </div>

        {/* COORDINATOR ONLY - Post Announcement Card */}
        {user?.role === 'COORDINATOR' && (
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Send className="w-5 h-5" />
              Post Announcement
            </h2>
            <div className="space-y-4">
              <textarea
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                placeholder="Write an announcement for all students and faculty..."
                rows={3}
                className="w-full bg-white/[0.04] border border-white/[0.08] text-white placeholder-white/30 rounded-xl p-3 focus:outline-none focus:border-indigo-500/50 resize-none text-sm"
              />
              <button
                onClick={handlePostAnnouncement}
                disabled={!announcementText.trim() || postMutation.isPending}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-blue-500 text-white rounded-xl font-semibold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {postMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {postMutation.isPending ? 'Posting...' : 'Post Announcement'}
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-4 border-b border-white/[0.08] mb-6">
          <button
            onClick={() => setActiveTab('ACTIVITY')}
            className={cn(
              "flex items-center gap-2 pb-3 px-2 border-b-2 transition-all font-semibold text-sm",
              activeTab === 'ACTIVITY' ? "border-blue-400 text-white" : "border-transparent text-white/50 hover:text-white/80"
            )}
          >
            <Activity className="w-4 h-4" />
            Activity
            {unreadPersonalCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-500 text-white text-[10px]">{unreadPersonalCount}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('ANNOUNCEMENTS')}
            className={cn(
              "flex items-center gap-2 pb-3 px-2 border-b-2 transition-all font-semibold text-sm",
              activeTab === 'ANNOUNCEMENTS' ? "border-blue-400 text-white" : "border-transparent text-white/50 hover:text-white/80"
            )}
          >
            <Megaphone className="w-4 h-4" />
            Announcements
            {unreadAnnouncementsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-500 text-white text-[10px]">{unreadAnnouncementsCount}</span>
            )}
          </button>
        </div>

        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl overflow-hidden">
          {activeTab === 'ANNOUNCEMENTS' ? (
            // ANNOUNCEMENTS TAB
            <>
              {isLoadingAnnouncements && (
                <div className="flex items-center justify-center py-16">
                  <div className="w-8 h-8 border-2 border-white/[0.08] border-t-indigo-400 rounded-full animate-spin"></div>
                </div>
              )}

              {!isLoadingAnnouncements && announcements.length === 0 && (
                <div className="text-center py-16 text-white/50">
                  <Megaphone size={40} className="mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No announcements yet</p>
                </div>
              )}

              {!isLoadingAnnouncements && announcements.length > 0 && (
                <div>
                  {announcements.map((announcement: Announcement) => {
                    const isRead = readAnnouncements.has(announcement.message_id);
                    return (
                      <div
                        key={announcement.message_id}
                        onClick={() => !isRead && markAnnouncementAsRead(announcement.message_id)}
                        className={cn(
                          'p-4 border-b border-white/[0.08] hover:bg-white/[0.04] transition-colors flex gap-4 cursor-pointer',
                          isRead && 'opacity-60'
                        )}
                      >
                        <div className="flex flex-col items-center gap-2 pt-1">
                          {!isRead && <div className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0"></div>}
                        </div>
                        <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0', getAvatarStyle(announcement.sender_role))}>
                          {getInitials(announcement.sender_email)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-sm font-semibold text-white truncate">{announcement.sender_email}</span>
                            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider', getRoleBadgeStyle(announcement.sender_role))}>
                              {announcement.sender_role}
                            </span>
                            <span className="text-xs text-white/50 ml-auto">{timeAgo(announcement.created_at)}</span>
                          </div>
                          <p className="text-sm text-white/50 mt-2 leading-relaxed whitespace-pre-wrap">{announcement.content}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            // ACTIVITY TAB
            <>
              {isLoadingNotifications && (
                <div className="flex items-center justify-center py-16">
                  <div className="w-8 h-8 border-2 border-white/[0.08] border-t-indigo-400 rounded-full animate-spin"></div>
                </div>
              )}

              {!isLoadingNotifications && personalNotifications.length === 0 && (
                <div className="text-center py-16 text-white/50">
                  <Activity size={40} className="mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No recent activity</p>
                </div>
              )}

              {!isLoadingNotifications && personalNotifications.length > 0 && (
                <div>
                  {personalNotifications.map((notification: PersonalNotification) => {
                    return (
                      <div
                        key={notification.id}
                        onClick={() => !notification.read && markPersonalAsRead(notification.id)}
                        className={cn(
                          'p-4 border-b border-white/[0.08] hover:bg-white/[0.04] transition-colors flex gap-4 cursor-pointer',
                          notification.read && 'opacity-60'
                        )}
                      >
                        <div className="flex flex-col items-center gap-2 pt-1">
                          {!notification.read && <div className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0"></div>}
                        </div>
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white bg-white/10 font-bold flex-shrink-0">
                          <Bell size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-sm font-semibold text-white truncate">{notification.title}</span>
                            <span className="text-xs text-white/50 ml-auto">{timeAgo(notification.created_at)}</span>
                          </div>
                          <p className="text-sm text-white/50 mt-1 leading-relaxed whitespace-pre-wrap">{notification.message}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
