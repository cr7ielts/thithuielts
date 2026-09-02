import { createServerSupabase, createAdminSupabase } from '@/lib/supabase/server';

/** Kiem tra nguoi goi la giao vien/admin. Tra ve client service-role neu hop le. */
export async function requireStaff() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Chưa đăng nhập', status: 401 as const };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.role !== 'teacher' && profile?.role !== 'admin') {
    return { error: 'Chỉ giáo viên hoặc quản trị viên mới dùng được chức năng này', status: 403 as const };
  }

  return { user, admin: createAdminSupabase() };
}
