/**
 * useApi.ts — Centralized React Query hooks for all backend resources.
 * Every component that needs data imports from here, not from mock files.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './apiClient';

// ─── Query Keys ────────────────────────────────────────────────────────────────
export const QK = {
 groups: (status?: string) => ['groups', status],
 groupById: (id: string) => ['groups', id],
 members: (groupId: string) => ['members', groupId],
 proposals: (groupId: string) => ['proposals', groupId],
 logbooks: (groupId: string, status?: string) => ['logbooks', groupId, status],
 tasks: (groupId: string) => ['tasks', groupId],
 resources: (groupId: string) => ['resources', groupId],
 note: () => ['note'],
 schedules: () => ['schedules'],
 smartSlots: () => ['schedules', 'smart-slots'],
 evaluations: (groupId?: string) => ['evaluations', groupId],
 peerEvaluations: (groupId: string) => ['peer-evaluations', groupId],
 rubrics: () => ['rubrics'],
 whitelist: () => ['whitelist'],
 facultyWhitelist: () => ['whitelist', 'faculty'],
 analytics: () => ['analytics', 'guide'],
 allocationPending: () => ['allocation', 'pending'],
 allocationGuides: () => ['allocation', 'guides'],
 orphanStudents: () => ['coordinator', 'orphans'],
 historicProjects: (title: string) => ['committee', 'historic', title],
};

// ─── Groups ────────────────────────────────────────────────────────────────────
export function useGroups(token: string, status?: string) {
 return useQuery({
 queryKey: QK.groups(status),
 queryFn: () => api.getGroups(token, status),
 enabled: !!token,
 });
}

export function useGroupById(token: string, groupId: string) {
 return useQuery({
 queryKey: QK.groupById(groupId),
 queryFn: () => api.getGroupById(token, groupId),
 enabled: !!token && !!groupId,
 });
}

export function useCreateGroup(token: string) {
 const qc = useQueryClient();
 return useMutation({
 mutationFn: (groupName: string) => api.createGroup(token, groupName),
 onSuccess: () => qc.invalidateQueries({ queryKey: QK.groups() }),
 });
}

export function useUpdateGroupStatus(token: string) {
 const qc = useQueryClient();
 return useMutation({
 mutationFn: ({ groupId, status }: { groupId: string; status: string }) =>
 api.updateGroupStatus(token, groupId, status),
 onSuccess: () => qc.invalidateQueries({ queryKey: QK.groups() }),
 });
}

// ─── Members ──────────────────────────────────────────────────────────────────
export function useMembers(token: string, groupId: string) {
 return useQuery({
 queryKey: QK.members(groupId),
 queryFn: () => api.getMembers(token, groupId),
 enabled: !!token && !!groupId,
 });
}

export function useAddMember(token: string, groupId: string) {
 const qc = useQueryClient();
 return useMutation({
 mutationFn: (prnNo: string) => api.addMember(token, groupId, prnNo),
 onSuccess: () => {
 qc.invalidateQueries({ queryKey: QK.members(groupId) });
 qc.invalidateQueries({ queryKey: QK.groupById(groupId) });
 },
 });
}

export function useRemoveMember(token: string, groupId: string) {
 const qc = useQueryClient();
 return useMutation({
 mutationFn: (studentId: string) => api.removeMember(token, groupId, studentId),
 onSuccess: () => {
 qc.invalidateQueries({ queryKey: QK.members(groupId) });
 qc.invalidateQueries({ queryKey: QK.groupById(groupId) });
 },
 });
}

// ─── Proposals ────────────────────────────────────────────────────────────────
export function useProposals(token: string, groupId: string) {
 return useQuery({
 queryKey: QK.proposals(groupId),
 queryFn: () => api.getProposals(token, groupId),
 enabled: !!token && !!groupId,
 });
}

export function useSubmitProposal(token: string, groupId: string) {
 const qc = useQueryClient();
 return useMutation({
 mutationFn: ({ title, tags }: { title: string; tags: string[] }) =>
 api.submitProposal(token, groupId, title, tags),
 onSuccess: () => qc.invalidateQueries({ queryKey: QK.proposals(groupId) }),
 });
}

export function useApproveProposal(token: string) {
 const qc = useQueryClient();
 return useMutation({
 mutationFn: ({ proposalId, isApproved }: { proposalId: string; isApproved: boolean }) =>
 api.approveProposal(token, proposalId, isApproved),
 onSuccess: () => qc.invalidateQueries({ queryKey: ['proposals'] }),
 });
}

// ─── Logbooks ─────────────────────────────────────────────────────────────────
export function useLogbooks(token: string, groupId: string, status?: string) {
 return useQuery({
 queryKey: QK.logbooks(groupId, status),
 queryFn: () => api.getLogbooks(token, groupId, status),
 enabled: !!token && !!groupId,
 });
}

export function useSubmitLogbook(token: string, groupId: string) {
 const qc = useQueryClient();
 return useMutation({
 mutationFn: ({ weekNumber, workSummary, evidenceUrl }: { weekNumber: number; workSummary: string; evidenceUrl?: string }) =>
 api.submitLogbook(token, groupId, weekNumber, workSummary, evidenceUrl),
 onSuccess: () => qc.invalidateQueries({ queryKey: QK.logbooks(groupId) }),
 });
}

export function useApproveLogbook(token: string) {
 const qc = useQueryClient();
 return useMutation({
 mutationFn: ({ logId, guideStatus, remarks }: { logId: string; guideStatus: string; remarks?: string }) =>
 api.approveLogbook(token, logId, guideStatus, remarks),
 onSuccess: () => qc.invalidateQueries({ queryKey: ['logbooks'] }),
 });
}

export function useBulkApproveLogbooks(token: string) {
 const qc = useQueryClient();
 return useMutation({
 mutationFn: (logbookIds: string[]) => api.bulkApproveLogbooks(token, logbookIds),
 onSuccess: () => qc.invalidateQueries({ queryKey: ['logbooks'] }),
 });
}

// ─── Tasks ────────────────────────────────────────────────────────────────────
export function useTasks(token: string, groupId: string) {
 return useQuery({
 queryKey: QK.tasks(groupId),
 queryFn: () => api.getTasks(token, groupId),
 enabled: !!token && !!groupId,
 });
}

export function useCreateTask(token: string, groupId: string) {
 const qc = useQueryClient();
 return useMutation({
 mutationFn: ({ title, assignedTo }: { title: string; assignedTo?: string }) =>
 api.createTask(token, groupId, title, assignedTo),
 onSuccess: () => qc.invalidateQueries({ queryKey: QK.tasks(groupId) }),
 });
}

export function useUpdateTaskStatus(token: string, groupId: string) {
 const qc = useQueryClient();
 return useMutation({
 mutationFn: ({ taskId, status }: { taskId: string; status: string }) =>
 api.updateTaskStatus(token, taskId, status),
 onSuccess: () => qc.invalidateQueries({ queryKey: QK.tasks(groupId) }),
 });
}

export function useDeleteTask(token: string, groupId: string) {
 const qc = useQueryClient();
 return useMutation({
 mutationFn: (taskId: string) => api.deleteTask(token, taskId),
 onSuccess: () => qc.invalidateQueries({ queryKey: QK.tasks(groupId) }),
 });
}

// ─── Resources & Notes ────────────────────────────────────────────────────────
export function useResources(token: string, groupId: string) {
 return useQuery({
 queryKey: QK.resources(groupId),
 queryFn: () => api.getGroupResources(token, groupId),
 enabled: !!token && !!groupId,
 });
}

export function useCreateResource(token: string, groupId: string) {
 const qc = useQueryClient();
 return useMutation({
 mutationFn: ({ title, url }: { title: string; url: string }) =>
 api.createResource(token, groupId, title, url),
 onSuccess: () => qc.invalidateQueries({ queryKey: QK.resources(groupId) }),
 });
}

export function useNote(token: string) {
 return useQuery({
 queryKey: QK.note(),
 queryFn: () => api.getNote(token),
 enabled: !!token,
 });
}

export function useSaveNote(token: string) {
 const qc = useQueryClient();
 return useMutation({
 mutationFn: (content: string) => api.saveNote(token, content),
 onSuccess: () => qc.invalidateQueries({ queryKey: QK.note() }),
 });
}

// ─── Schedules ────────────────────────────────────────────────────────────────
export function useSchedules(token: string) {
 return useQuery({
 queryKey: QK.schedules(),
 queryFn: () => api.getSchedules(token),
 enabled: !!token,
 });
}

export function useSmartSlots(token: string) {
 return useQuery({
 queryKey: QK.smartSlots(),
 queryFn: () => api.getSmartSlots(token),
 enabled: !!token,
 });
}

export function useCreateSchedule(token: string) {
 const qc = useQueryClient();
 return useMutation({
 mutationFn: ({ groupId, phase, presentationTime, venue }: { groupId: string; phase: string; presentationTime: string; venue: string }) =>
 api.createSchedule(token, [groupId], phase, presentationTime, venue),
 onSuccess: () => qc.invalidateQueries({ queryKey: QK.schedules() }),
 });
}

// ─── Evaluations ──────────────────────────────────────────────────────────────
export function useEvaluations(token: string, groupId?: string) {
 return useQuery({
 queryKey: QK.evaluations(groupId),
 queryFn: () => api.getEvaluations(token, groupId),
 enabled: !!token,
 });
}

export function useSubmitEvaluation(token: string) {
 const qc = useQueryClient();
 return useMutation({
 mutationFn: ({ groupId, phase, rubricScores, totalMarks }: { groupId: string; phase: string; rubricScores: Record<string, number>; totalMarks: number }) =>
 api.submitEvaluation(token, groupId, phase, rubricScores, totalMarks),
 onSuccess: () => qc.invalidateQueries({ queryKey: ['evaluations'] }),
 });
}

export function usePeerEvaluations(token: string, groupId: string) {
 return useQuery({
 queryKey: QK.peerEvaluations(groupId),
 queryFn: () => api.getGroupPeerEvaluations(token, groupId),
 enabled: !!token && !!groupId,
 });
}

// ─── Rubrics ──────────────────────────────────────────────────────────────────
export function useRubrics(token: string) {
 return useQuery({
 queryKey: QK.rubrics(),
 queryFn: () => api.getRubrics(token),
 enabled: !!token,
 });
}

// ─── Whitelist ────────────────────────────────────────────────────────────────
export function useWhitelist(token: string) {
 return useQuery({
 queryKey: QK.whitelist(),
 queryFn: () => api.getWhitelist(token),
 enabled: !!token,
 });
}

// ─── Analytics ────────────────────────────────────────────────────────────────
export function useGuideAnalytics(token: string) {
 return useQuery({
 queryKey: QK.analytics(),
 queryFn: () => api.getGuideAnalytics(token),
 enabled: !!token,
 });
}

// ─── Coordinator ──────────────────────────────────────────────────────────────
export function useAllocationPending(token: string) {
 return useQuery({
 queryKey: QK.allocationPending(),
 queryFn: () => api.getPendingAllocation(token),
 enabled: !!token,
 });
}

export function useAvailableGuides(token: string) {
 return useQuery({
 queryKey: QK.allocationGuides(),
 queryFn: () => api.getAvailableGuides(token),
 enabled: !!token,
 });
}

export function useOrphanStudents(token: string) {
 return useQuery({
 queryKey: QK.orphanStudents(),
 queryFn: () => api.getOrphanStudents(token),
 enabled: !!token,
 });
}

// ─── Committee ────────────────────────────────────────────────────────────────
export function useHistoricProjects(token: string, title: string) {
 return useQuery({
 queryKey: QK.historicProjects(title),
 queryFn: () => api.searchHistoricProjects(token, title),
 enabled: !!token && title.length >= 2,
 });
}
