-- Supabase's optional automatic-RLS event trigger is an internal database
-- helper, not an RPC. It runs as its owner (postgres); API roles must not have
-- EXECUTE on this SECURITY DEFINER function. Leave the trigger itself intact.
-- Some local projects do not have this platform-provided helper.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    if (select prorettype from pg_proc where oid = 'public.rls_auto_enable()'::regprocedure)
       <> 'event_trigger'::regtype then
      raise exception 'Unexpected return type for public.rls_auto_enable(); inspect before changing grants';
    end if;
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end;
$$;
