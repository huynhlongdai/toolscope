
-- Function to schedule auto sync via pg_cron + pg_net
CREATE OR REPLACE FUNCTION public.schedule_auto_sync(
  job_name text,
  cron_expr text,
  fn_url text,
  svc_key text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM cron.schedule(
    job_name,
    cron_expr,
    format(
      $sql$
      SELECT net.http_post(
        url := %L,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-key', %L
        ),
        body := '{"auto": true, "direction": "both"}'::jsonb
      )
      $sql$,
      fn_url, svc_key
    )
  );
END;
$$;

-- Function to unschedule a cron job
CREATE OR REPLACE FUNCTION public.unschedule_cron_job(job_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM cron.unschedule(job_name);
EXCEPTION WHEN OTHERS THEN
  -- Ignore if job doesn't exist
  NULL;
END;
$$;
