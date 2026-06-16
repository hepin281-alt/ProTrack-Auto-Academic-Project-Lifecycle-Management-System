import React from 'react';
import { TopicReviewShell } from '../shared/TopicApprovalComponents';

export const CommitteeTopicApproval: React.FC = () => (
 <TopicReviewShell
 currentPage="/committee/topics"
 title="Topic Approvals — Committee"
 subtitle="Second-stage committee review of guide-approved topics"
 iconColor="bg-gradient-to-br from-indigo-500 to-blue-500"
 stage="COMMITTEE"
 emptyMsg="No topics pending committee review."
 />
);
