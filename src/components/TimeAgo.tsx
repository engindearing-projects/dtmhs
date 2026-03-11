"use client";

export function TimeAgo({ date }: { date: string | Date }) {
  const seconds = Math.floor(
    (Date.now() - new Date(date).getTime()) / 1000
  );

  if (seconds < 60) return <span title={new Date(date).toISOString()}>{seconds}s ago</span>;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return <span title={new Date(date).toISOString()}>{minutes}m ago</span>;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return <span title={new Date(date).toISOString()}>{hours}h ago</span>;
  const days = Math.floor(hours / 24);
  if (days < 30) return <span title={new Date(date).toISOString()}>{days}d ago</span>;
  const months = Math.floor(days / 30);
  return <span title={new Date(date).toISOString()}>{months}mo ago</span>;
}
