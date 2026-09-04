import type { ActivityType } from '@/types/domain';

// Windows zakázané: < > : " / \ | ? *  a kontrolné 0x00-0x1F
const FORBIDDEN = /[<>:"/\\|?*\x00-\x1F]/g;

function sanitize(s: string): string {
  return s.replace(FORBIDDEN, '');
}

export function buildOutputFilename(args: {
  date: string;
  lastName: string;
  firstName: string;
  activityType: ActivityType;
}): string {
  const parts = [
    args.date,
    sanitize(args.lastName),
    sanitize(args.firstName),
    sanitize(args.activityType),
  ];
  return parts.join('_') + '.docx';
}
