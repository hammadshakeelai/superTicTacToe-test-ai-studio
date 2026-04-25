import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges Tailwind CSS classes intelligently.
 * Combines clsx for conditional classes with tailwind-merge for deduplication.
 */
export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a timestamp to a short locale date string.
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a timestamp to a relative time string (e.g., "2m ago", "1h ago").
 */
export function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Format Elo with a sign prefix.
 */
export function formatEloChange(change: number): string {
  if (change > 0) return `+${change}`;
  return `${change}`;
}

/**
 * Get the CSS color class for a player.
 */
export function getPlayerColorClass(player: 'X' | 'O' | null): string {
  if (player === 'X') return 'text-indigo-400';
  if (player === 'O') return 'text-rose-400';
  return 'text-slate-400';
}

/**
 * Get the CSS background color class for a player.
 */
export function getPlayerBgClass(player: 'X' | 'O' | null): string {
  if (player === 'X') return 'bg-indigo-500';
  if (player === 'O') return 'bg-rose-500';
  return 'bg-slate-500';
}

/**
 * Generate a random match ID.
 */
export function generateMatchId(prefix: string = ''): string {
  const id = Math.random().toString(36).substring(2, 8).toUpperCase();
  return prefix ? `${prefix}_${id}` : id;
}

/**
 * Calculate win rate percentage from wins and total matches.
 */
export function calcWinRate(wins: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((wins / total) * 100);
}

/**
 * Convert a Move to a unique string key for Map lookups.
 * Fixes the bug where object references were used as Map keys.
 */
export function moveToKey(superIdx: number, subIdx: number): string {
  return `${superIdx}-${subIdx}`;
}
