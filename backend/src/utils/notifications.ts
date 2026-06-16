import { query } from '../config/database.js';

/**
 * Creates a notification for all students in a given project group.
 * @param groupId The ID of the group
 * @param type The type/category of the notification (e.g. 'MEETING', 'SIGNOFF')
 * @param title The notification title
 * @param message The notification body/message
 */
export async function createGroupNotification(
    groupId: string,
    type: string,
    title: string,
    message: string
): Promise<void> {
    try {
        // Find all student members of this group
        const groupMembers = await query(
            `SELECT student_id FROM group_members WHERE group_id = $1`,
            [groupId]
        );

        if (groupMembers.length === 0) return;

        const promises = groupMembers.map((m: any) => 
            query(
                `INSERT INTO notifications (user_id, type, title, message) VALUES ($1, $2, $3, $4)`,
                [m.student_id, type, title, message]
            )
        );

        await Promise.all(promises);
    } catch (error) {
        console.error('Error creating group notification:', error);
    }
}
