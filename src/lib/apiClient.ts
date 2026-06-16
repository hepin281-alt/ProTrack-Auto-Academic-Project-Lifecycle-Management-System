const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

interface RequestOptions extends RequestInit {
    token?: string;
}

async function apiCall<T>(
    endpoint: string,
    options: RequestOptions = {}
): Promise<T> {
    const { token, ...fetchOptions } = options;
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...((fetchOptions.headers as Record<string, string>) || {})
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...fetchOptions,
        headers
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
}

export const api = {
    // Auth endpoints
    login: (email: string, password: string) =>
        apiCall<any>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        }),

    register: (data: {
        email: string;
        password: string;
        full_name: string;
        role: string;
        prn_no?: string;
        roll_no?: string;
        batch_year?: number;
        expertise_tags?: string[];
    }) =>
        apiCall<any>('/auth/register', {
            method: 'POST',
            body: JSON.stringify(data)
        }),

    claimAccount: (data: {
        role: string;
        email: string;
        password: string;
        prn_no?: string;
        employee_id?: string;
    }) =>
        apiCall<any>('/auth/claim-account', {
            method: 'POST',
            body: JSON.stringify(data)
        }),

    // Coordinator endpoints
    uploadWhitelist: (token: string, file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return fetch(`${API_BASE}/coordinator/whitelist/upload`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`
            },
            body: formData
        }).then(res => {
            if (!res.ok) throw new Error('Upload failed');
            return res.json();
        });
    },

    autoGroupOrphans: (token: string) =>
        apiCall<any>('/coordinator/action/auto-group', { token, method: 'POST' }),
    
    getFacultyList: (token: string) =>
        apiCall<any[]>('/coordinator/action/faculty', { token, method: 'GET' }),
        
    updateGuideWorkload: (token: string, facultyId: string, maxWorkload: number) =>
        apiCall<any>(`/coordinator/action/faculty/${facultyId}/workload`, {
            token,
            method: 'PATCH',
            body: JSON.stringify({ max_workload: maxWorkload })
        }),

    getWhitelist: (token: string) =>
        apiCall<any[]>('/coordinator/whitelist', { token, method: 'GET' }),
        
    deleteStudentFromWhitelist: (token: string, id: number) =>
        apiCall<any>(`/coordinator/whitelist/student/${id}`, { token, method: 'DELETE' }),

    uploadFacultyWhitelist: (token: string, file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return fetch(`${API_BASE}/coordinator/whitelist/faculty/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        }).then(async r => {
            if (!r.ok) {
                const e = await r.json();
                throw new Error(e.error || `HTTP ${r.status}`);
            }
            return r.json();
        });
    },
    addStudentToWhitelist: (token: string, data: { prn_no: string, email: string, full_name: string }) =>
        apiCall<any>('/coordinator/whitelist/student', {
            method: 'POST',
            token,
            body: JSON.stringify(data)
        }),

    addFacultyToWhitelist: (token: string, data: { email: string, full_name: string, role: string }) =>
        apiCall<any>('/coordinator/whitelist/faculty', {
            method: 'POST',
            token,
            body: JSON.stringify(data)
        }),

    getFacultyWhitelist: (token: string) =>
        apiCall<any[]>('/coordinator/whitelist/faculty', { token, method: 'GET' }),

    deleteFacultyFromWhitelist: (token: string, id: number) =>
        apiCall<any>(`/coordinator/whitelist/faculty/${id}`, { token, method: 'DELETE' }),

    deleteRegisteredUser: (token: string, id: number) =>
        apiCall<any>(`/coordinator/action/users/${id}`, { token, method: 'DELETE' }),

    // Group endpoints
    getGroups: (token: string, status?: string, batchYear?: number) => {
        const params = new URLSearchParams();
        if (status) params.append('status', status);
        if (batchYear) params.append('batch_year', batchYear.toString());
        return apiCall<any[]>(`/groups${params.toString() ? '?' + params : ''}`, {
            token,
            method: 'GET'
        });
    },

    getGroupById: (token: string, groupId: string) =>
        apiCall<any>(`/groups/${groupId}`, { token, method: 'GET' }),

    createGroup: (token: string, groupName: string) =>
        apiCall<any>('/groups', {
            token,
            method: 'POST',
            body: JSON.stringify({ group_name: groupName })
        }),

    updateGroupStatus: (token: string, groupId: string, status: string) =>
        apiCall<any>(`/groups/${groupId}/status`, {
            token,
            method: 'PATCH',
            body: JSON.stringify({ status })
        }),

    // Member endpoints
    addMember: (token: string, groupId: string, prnNo: string) =>
        apiCall<any>(`/groups/${groupId}/members`, {
            token,
            method: 'POST',
            body: JSON.stringify({ prn_no: prnNo })
        }),

    getMembers: async (token: string, groupId: string) => {
        const data = await apiCall<any>(`/groups/${groupId}/members`, { token, method: 'GET' });
        return Array.isArray(data) ? data : (data.members || []);
    },

    removeMember: (token: string, groupId: string, studentId: string) =>
        apiCall<any>(`/groups/${groupId}/members/${studentId}`, {
            token,
            method: 'DELETE'
        }),

    getAvailableStudents: (token: string) =>
        apiCall<any[]>('/groups/available-students', {
            token,
            method: 'GET'
        }),

    // Proposal endpoints

    submitProposal: (token: string, groupId: string, title: string, tags: string[], priority?: number) =>
        apiCall<any>(`/groups/${groupId}/proposals`, {
            token,
            method: 'POST',
            body: JSON.stringify({ title, domain_tags: tags, priority: priority || 1 })
        }),

    getProposals: (token: string, groupId: string) =>
        apiCall<any>(`/groups/${groupId}/proposals`, { token, method: 'GET' }),

    updateProposal: (token: string, proposalId: string, title: string, tags: string[], priority?: number) =>
        apiCall<any>(`/groups/proposals/${proposalId}`, {
            token,
            method: 'PATCH',
            body: JSON.stringify({ title, domain_tags: tags, priority })
        }),

    deleteProposal: (token: string, proposalId: string) =>
        apiCall<any>(`/groups/proposals/${proposalId}`, {
            token,
            method: 'DELETE'
        }),

    approveProposal: (token: string, proposalId: string, isApproved: boolean) =>
        apiCall<any>(`/groups/proposals/${proposalId}/approve`, {
            token,
            method: 'PATCH',
            body: JSON.stringify({ is_approved: isApproved })
        }),

    rejectProposal: (token: string, proposalId: string, rejectionReason: string) =>
        apiCall<any>(`/groups/proposals/${proposalId}/reject`, {
            token,
            method: 'PATCH',
            body: JSON.stringify({ rejection_reason: rejectionReason })
        }),

    requestRevision: (token: string, proposalId: string, revisionComment: string) =>
        apiCall<any>(`/groups/proposals/${proposalId}/revision`, {
            token,
            method: 'PATCH',
            body: JSON.stringify({ revision_comment: revisionComment })
        }),

    // Logbook endpoints
    uploadResource: (groupId: string, file: File, title: string) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', title);
        return apiCall<any>(`/resources/group/${groupId}`, {
            method: 'POST',
            body: formData as any,
        });
    },
    // Mappings
    getMappings: () =>
        apiCall<{ poMatrix: any; psoMatrix: any }>('/po-mapping', { method: 'GET' }),
    saveMapping: (data: { criterion_id: string; mapping_type: 'PO' | 'PSO'; outcome_key: string; level: number }) =>
        apiCall<void>('/po-mapping', { method: 'POST', body: JSON.stringify(data) }),
    resetMappings: () =>
        apiCall<void>('/po-mapping', { method: 'DELETE' }),

    uploadEvidence: (token: string, file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return fetch(`${API_BASE}/upload`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`
            },
            body: formData
        }).then(res => {
            if (!res.ok) throw new Error('Upload failed');
            return res.json();
        });
    },

    submitLogbook: (
        token: string,
        groupId: string,
        weekNumber: number,
        workSummary: string,
        evidenceUrl?: string
    ) =>
        apiCall<any>(`/groups/${groupId}/logbooks`, {
            token,
            method: 'POST',
            body: JSON.stringify({
                week_number: weekNumber,
                work_summary: workSummary,
                evidence_url: evidenceUrl
            })
        }),

    getLogbooks: (token: string, groupId: string, status?: string) => {
        const params = new URLSearchParams();
        if (status) params.append('status', status);
        return apiCall<any[]>(
            `/groups/${groupId}/logbooks${params.toString() ? '?' + params : ''}`,
            { token, method: 'GET' }
        );
    },

    approveLogbook: (token: string, logId: string, guideStatus: string, remarks?: string) =>
        apiCall<any>(`/groups/logbooks/${logId}`, {
            token,
            method: 'PATCH',
            body: JSON.stringify({
                guide_status: guideStatus,
                guide_remarks: remarks
            })
        }),

    // Allocation endpoints
    getPendingAllocation: (token: string) =>
        apiCall<any>('/groups/allocation/pending', { token, method: 'GET' }),

    getAvailableGuides: (token: string) =>
        apiCall<any>('/groups/allocation/guides', { token, method: 'GET' }),

    getRankedGuides: (token: string, groupId: string) =>
        apiCall<any>(`/groups/allocation/rank/${groupId}`, { token, method: 'GET' }),

    assignGuide: (token: string, groupId: string, guideId: string, notes?: string, isOverride?: boolean) =>
        apiCall<any>('/groups/allocation/assign', {
            token,
            method: 'POST',
            body: JSON.stringify({ group_id: groupId, guide_id: guideId, notes, is_override: isOverride })
        }),

    batchAllocate: (token: string, groupIds?: string[]) =>
        apiCall<any>('/groups/allocation/batch', {
            token,
            method: 'POST',
            body: JSON.stringify({ group_ids: groupIds })
        }),

    unassignGuide: (token: string, groupId: string, notes?: string) =>
        apiCall<any>(`/groups/allocation/${groupId}`, {
            token,
            method: 'DELETE',
            body: JSON.stringify({ notes })
        }),

    getAllocationAudit: (token: string, groupId?: string) => {
        const params = new URLSearchParams();
        if (groupId) params.append('group_id', groupId);
        return apiCall<any>(`/groups/allocation/audit${params.toString() ? '?' + params : ''}`, { token, method: 'GET' });
    },

    setGroupPreference: (token: string, groupId: string, preferredGuideId: string | null) =>
        apiCall<any>('/groups/allocation/set-preference', {
            token,
            method: 'POST',
            body: JSON.stringify({ group_id: groupId, preferred_guide_id: preferredGuideId })
        }),

    submitGuideRating: (token: string, guideId: string, rating: number, comments?: string) =>
        apiCall<any>('/groups/allocation/ratings', {
            token,
            method: 'POST',
            body: JSON.stringify({ guide_id: guideId, rating, comments })
        }),

    getGuideRatings: (token: string) =>
        apiCall<any>('/groups/allocation/ratings', { token, method: 'GET' }),

    // Evaluation endpoints
    submitEvaluation: (
        token: string,
        groupId: string,
        phase: string,
        rubricScores: Record<string, number>,
        totalMarks: number
    ) =>
        apiCall<any>('/evaluations', {
            token,
            method: 'POST',
            body: JSON.stringify({
                group_id: groupId,
                phase,
                rubric_scores: rubricScores,
                total_marks: totalMarks
            })
        }),

    getEvaluations: (token: string, groupId?: string) => {
        const params = new URLSearchParams();
        if (groupId) params.append('group_id', groupId);
        return apiCall<any[]>(
            `/evaluations${params.toString() ? '?' + params : ''}`,
            { token, method: 'GET' }
        );
    },

    // Schedule endpoints
    getSchedules: (token: string) =>
        apiCall<any[]>('/schedules', { token, method: 'GET' }),

    getSmartSlots: (token: string) =>
        apiCall<any>('/schedules/smart-slots', { token, method: 'GET' }),

    createSchedule: (token: string, groupIds: string[], phase: string, presentationTime: string, venue: string, intervalMinutes: number = 0) =>
        apiCall<any>('/schedules', {
            token,
            method: 'POST',
            body: JSON.stringify({ group_ids: groupIds, phase, presentation_time: presentationTime, venue, interval_minutes: intervalMinutes })
        }),

    // Tasks endpoints
    getTasks: (token: string, groupId: string) =>
        apiCall<any[]>(`/tasks/${groupId}`, { token, method: 'GET' }),

    createTask: (token: string, groupId: string, title: string, assignedTo?: string) =>
        apiCall<any>('/tasks', {
            token,
            method: 'POST',
            body: JSON.stringify({ group_id: groupId, title, assigned_to: assignedTo })
        }),

    updateTaskStatus: (token: string, taskId: string, status: string) =>
        apiCall<any>(`/tasks/${taskId}/status`, {
            token,
            method: 'PATCH',
            body: JSON.stringify({ status })
        }),

    // Resources & Notes (Student)
    getGroupResources: (token: string, groupId: string) =>
        apiCall<any[]>(`/resources/${groupId}`, { token, method: 'GET' }),
        
    createResource: (token: string, groupId: string, title: string, url: string) =>
        apiCall<any>('/resources', {
            token,
            method: 'POST',
            body: JSON.stringify({ group_id: groupId, title, resource_url: url, resource_type: 'LINK' })
        }),
    
    getGlobalResources: (token: string) =>
        apiCall<any[]>('/resources/global', { token, method: 'GET' }),

    createGlobalResource: async (token: string, formData: FormData) => {
        const response = await fetch(`${API_BASE}/resources/global`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `HTTP ${response.status}`);
        }
        return response.json();
    },
        
    getNote: (token: string) =>
        apiCall<any>('/notes', { token, method: 'GET' }),
        
    saveNote: (token: string, content: string) =>
        apiCall<any>('/notes', {
            token,
            method: 'POST',
            body: JSON.stringify({ content })
        }),

    // Guide Analytics & Bulk Approve
    getGuideAnalytics: (token: string) =>
        apiCall<any[]>('/analytics/guide', { token, method: 'GET' }),
    getSystemStats: (token: string) =>
        apiCall<any>('/analytics/system-stats', { token, method: 'GET' }),
        
    bulkApproveLogbooks: (token: string, logbookIds: string[]) =>
        apiCall<any>('/groups/logbooks/bulk-approve', {
            token,
            method: 'PATCH',
            body: JSON.stringify({ logbook_ids: logbookIds })
        }),
        
    checkPlagiarism: (token: string, proposalId: string) =>
        apiCall<any>(`/groups/proposals/${proposalId}/plagiarism`, {
            token,
            method: 'PATCH'
        }),

    getMeetings: (token: string, groupId: string) =>
        apiCall<any[]>(`/groups/${groupId}/meetings`, { token, method: 'GET' }),

    createMeeting: (token: string, groupId: string, data: { title: string; scheduled_at: string; notes?: string; attendance?: string[] }) =>
        apiCall<any>(`/guide/groups/${groupId}/meetings`, { token, method: 'POST', body: JSON.stringify(data) }),

    updateMeetingAttendance: (token: string, groupId: string, meetingId: string, attendance: string[]) =>
        apiCall<any>(`/guide/groups/${groupId}/meetings/${meetingId}/attendance`, { token, method: 'PUT', body: JSON.stringify({ attendance }) }),

    getSignoffs: (token: string, groupId: string) =>
        apiCall<any[]>(`/groups/${groupId}/signoffs`, { token, method: 'GET' }),

    updateSignoff: (token: string, groupId: string, signoffId: string, status: string, remarks: string) =>
        apiCall<any>(`/guide/groups/${groupId}/signoffs`, { token, method: 'POST', body: JSON.stringify({ milestone_id: signoffId, status, remarks }) }),

    // Coordinator Features
    getOrphanStudents: (token: string) =>
        apiCall<any[]>('/coordinator/action/orphans', { token, method: 'GET' }),
        
    getRubrics: (token: string) =>
        apiCall<any[]>('/rubrics', { token, method: 'GET' }),
        
    saveRubric: (token: string, name: string, schema: any, targetPhase: string = 'FINAL') =>
        apiCall<any>('/rubrics', {
            token,
            method: 'POST',
            body: JSON.stringify({ name, schema, target_phase: targetPhase })
        }),

    deleteRubric: (token: string, rubricId: string) =>
        apiCall<any>(`/rubrics/${rubricId}`, { token, method: 'DELETE' }),

    // Committee Features
    searchHistoricProjects: (token: string, title: string) =>
        apiCall<any[]>(`/committee/historic-projects?title=${encodeURIComponent(title)}`, { token, method: 'GET' }),

    deleteTask: (token: string, taskId: string) =>
        apiCall<any>(`/tasks/${taskId}`, { token, method: 'DELETE' }),

    // Peer Evaluation endpoints
    submitPeerEvaluation: (token: string, groupId: string, evaluateeId: string, score: number, comments: string) =>
        apiCall<any>('/peer-evaluations', {
            token,
            method: 'POST',
            body: JSON.stringify({ group_id: groupId, evaluatee_id: evaluateeId, score, comments })
        }),

    getGroupPeerEvaluations: (token: string, groupId: string) =>
        apiCall<any[]>(`/peer-evaluations/group/${groupId}`, { token, method: 'GET' }),

    getGuideGroupPeerEvaluations: (token: string, groupId: string) =>
        apiCall<any[]>(`/peer-evaluations/group/${groupId}`, { token, method: 'GET' }),

    // Chat endpoints
    getGroupChat: (token: string, groupId: string) =>
        apiCall<any[]>(`/chat/group/${groupId}`, { token, method: 'GET' }),

    sendGroupMessage: (token: string, groupId: string, content: string) =>
        apiCall<any>(`/chat/group/${groupId}`, {
            token,
            method: 'POST',
            body: JSON.stringify({ content })
        }),

    getAnnouncements: (token: string) =>
        apiCall<any[]>('/chat/announcements', { token, method: 'GET' }),

    sendAnnouncement: (token: string, content: string) =>
        apiCall<any>('/chat/announcements', {
            token,
            method: 'POST',
            body: JSON.stringify({ content })
        }),

    broadcastAnnouncement: (token: string, message: string) =>
        apiCall<any>('/chat/announcements', { token, method: 'POST', body: JSON.stringify({ content: message }) }),

    getUnreadAnnouncementCount: async (token: string) =>
        apiCall<{ count: number }>('/chat/announcements/unread-count', { token, method: 'GET' }),

    getUnreadNotificationsCount: async (token: string) => {
        const res = await fetch(`${API_BASE}/notifications/unread-count`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to get unread notifications count');
        return res.json();
    },

    markNotificationRead: async (token: string, notificationId: string) => {
        const res = await fetch(`${API_BASE}/notifications/${notificationId}/read`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to mark notification as read');
        return res.json();
    },

    markAllNotificationsRead: async (token: string) => {
        const res = await fetch(`${API_BASE}/notifications/read-all`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to mark all notifications as read');
        return res.json();
    },

    getNotifications: async (token: string) => {
        const res = await fetch(`${API_BASE}/notifications`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch notifications');
        return res.json();
    },

    getBatchYearsCoordinator: async (token: string) =>
        apiCall<{ years: number[] }>('/coordinator/action/batch-years', { token, method: 'GET' }),

    // --- Cron Tasks (Coordinator Only) ---
    triggerReminders: (token: string) =>
        apiCall<any>('/coordinator/trigger-reminders', {
            token,
            method: 'POST'
        }),

    // Settings
    getSettings: async (token: string) => {
        const res = await fetch(`${API_BASE}/settings`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch settings');
        return res.json();
    },

    updateSettings: async (token: string, key: string, value: any) => {
        const res = await fetch(`${API_BASE}/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ key, value })
        });
        if (!res.ok) throw new Error('Failed to update settings');
        return res.json();
    },

    // ── Topic Approval (SPPU Workflow) ────────────────────────────────────────

    submitTopics: (token: string, groupId: string, topics: Array<{
        priority: number; title: string; abstract?: string;
        objectives?: string; domain_tags?: string[]; technology_stack?: string[];
    }>) =>
        apiCall<any>(`/topics/${groupId}`, {
            token, method: 'POST',
            body: JSON.stringify({ topics })
        }),



    getGroupTopics: (token: string, groupId: string) =>
        apiCall<any>(`/topics/group/${groupId}`, { token, method: 'GET' }),

    getPendingTopics: (token: string, stage: 'GUIDE' | 'COMMITTEE' | 'COORDINATOR') =>
        apiCall<any>(`/topics/pending/${stage}`, { token, method: 'GET' }),

    reviewTopic: (token: string, data: {
        proposal_id: string; decision: 'APPROVED' | 'REJECTED';
        comments?: string; rejection_reason?: string; run_plagiarism?: boolean;
    }) =>
        apiCall<any>('/topics/review', {
            token, method: 'POST',
            body: JSON.stringify(data)
        }),

    getAllTopics: (token: string, params?: { stage?: string; group_id?: string }) => {
        const qs = new URLSearchParams();
        if (params?.stage) qs.append('stage', params.stage);
        if (params?.group_id) qs.append('group_id', params.group_id);
        return apiCall<any>(`/topics/all${qs.toString() ? '?' + qs : ''}`, { token, method: 'GET' });
    },

    compareTopics: (token: string, titleSearch: string, stage?: string) => {
        const qs = new URLSearchParams({ title_search: titleSearch });
        if (stage) qs.append('stage', stage);
        return apiCall<any>(`/topics/compare?${qs}`, { token, method: 'GET' });
    },

    // ── Batch Milestones ───────────────────────────────────────────────────────

    getMilestones: (token: string, batchYear: number) =>
        apiCall<any>(`/milestones/${batchYear}`, { token, method: 'GET' }),

    getUpcomingMilestone: (token: string, batchYear: number) =>
        apiCall<any>(`/milestones/${batchYear}/upcoming`, { token, method: 'GET' }),

    getBatchYears: (token: string) =>
        apiCall<any>('/milestones/batch-years/list', { token, method: 'GET' }),

    createOrUpdateMilestone: (token: string, data: {
        batch_year: number;
        milestone_key: string;
        milestone_name: string;
        due_date: string;
    }) =>
        apiCall<any>('/milestones', {
            token,
            method: 'POST',
            body: JSON.stringify(data)
        }),

    markMilestoneComplete: (token: string, milestoneId: string, isCompleted: boolean) =>
        apiCall<any>(`/milestones/${milestoneId}/complete`, {
            token,
            method: 'PATCH',
            body: JSON.stringify({ is_completed: isCompleted })
        }),

    deleteMilestone: (token: string, milestoneId: string) =>
        apiCall<any>(`/milestones/${milestoneId}`, {
            token,
            method: 'DELETE'
        }),

    // ── Logbook Compliance ─────────────────────────────────────────────────────

    getLogbookCompliance: (token: string) =>
        apiCall<any>('/analytics/compliance', { token, method: 'GET' }),

    exportLogbookCompliance: (token: string) => {
        const url = `${API_BASE}/analytics/compliance/export`;
        return fetch(url, {
            headers: { Authorization: `Bearer ${token}` }
        }).then(res => {
            if (!res.ok) throw new Error('Export failed');
            return res.blob();
        });
    },

    // ── Evaluation Locking ─────────────────────────────────────────────────────

    lockEvaluation: (token: string, evalId: string) =>
        apiCall<any>(`/evaluations/${evalId}/lock`, {
            token,
            method: 'POST'
        }),

    unlockEvaluation: (token: string, evalId: string) =>
        apiCall<any>(`/evaluations/${evalId}/lock`, {
            token,
            method: 'DELETE'
        }),

    lockAllEvaluationsForPhase: (token: string, phase: string) =>
        apiCall<any>(`/evaluations/phase/${phase}/lock-all`, {
            token,
            method: 'POST'
        }),
};
