-- `handle_new_user` is a SECURITY DEFINER trigger function, but PostgREST also
-- exposes every function in the `public` schema as an RPC endpoint. Calling it
-- outside a trigger would fail (there is no `new` record), yet leaving it
-- reachable is needless attack surface — so revoke EXECUTE from the API roles.
-- The `on_auth_user_created` trigger still runs it as the table owner.

revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon;
revoke all on function public.handle_new_user() from authenticated;

revoke all on function public.set_updated_at() from public;
revoke all on function public.set_updated_at() from anon;
revoke all on function public.set_updated_at() from authenticated;
