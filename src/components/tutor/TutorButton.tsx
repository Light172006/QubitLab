import { MessageSquare } from 'lucide-react';
import { useUIStore, useTutorStore } from '../../store';

export const TUTOR_BUTTON_ID = 'tutor-trigger';
export const TUTOR_DRAWER_ID = 'tutor-drawer';

/**
 * Navbar trigger for the tutor drawer.
 *
 * - Outline navy while closed, filled navy while open.
 * - Orange dot when an explanation finished while the drawer was closed.
 * - "Offline" badge while the template fallback is answering.
 */
export function TutorButton() {
  const isOpen = useUIStore((state) => state.tutorDrawerOpen);
  const toggleTutorDrawer = useUIStore((state) => state.toggleTutorDrawer);
  const isFallback = useTutorStore((state) => state.isFallback);
  const hasUnread = useTutorStore((state) => state.hasUnread);
  const showUnreadDot = hasUnread && !isOpen;

  return (
    <button
      id={TUTOR_BUTTON_ID}
      type="button"
      onClick={toggleTutorDrawer}
      aria-expanded={isOpen}
      aria-controls={TUTOR_DRAWER_ID}
      className={`relative inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        isOpen
          ? 'bg-navy text-white hover:bg-navy/90'
          : 'bg-white text-navy border border-navy hover:bg-navy/5'
      }`}
      title={isOpen ? 'Close the tutor (T)' : 'Open the tutor (T)'}
    >
      <MessageSquare className="w-4 h-4" aria-hidden="true" />
      <span>Tutor</span>

      {showUnreadDot && (
        <>
          <span className="sr-only">New explanation available</span>
          <span
            aria-hidden="true"
            className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-accent-orange-strong ring-2 ring-white"
          />
        </>
      )}

      {isFallback && (
        <span className="px-1.5 py-0.5 text-label rounded-full bg-orange-tint text-accent-text-orange font-semibold">
          Offline
        </span>
      )}
    </button>
  );
}