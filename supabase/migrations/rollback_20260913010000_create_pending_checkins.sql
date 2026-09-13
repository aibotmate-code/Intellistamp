-- Rollback migration for pending_checkins
DROP FUNCTION IF EXISTS public.approve_pending_checkin(UUID, UUID, UUID);
DROP TABLE IF EXISTS public.pending_checkins CASCADE;
