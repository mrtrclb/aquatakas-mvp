// Yeni üyeye profil kurulum penceresinin gösterilip gösterilmeyeceği (pencere ayrı parça olarak yüklenir)
export function shouldOnboard(auth) {
  const user = auth && auth.user;
  const profile = auth && auth.profile;
  if (!user || !profile || profile.deleted_at) return false;
  const meta = user.user_metadata || {};
  if (meta.onboarded_at) return false;
  // Yalnızca yeni hesaplar (son 14 gün içinde açılmış)
  const created = new Date(profile.created_at || user.created_at || 0).getTime();
  return Date.now() - created < 14 * 86400000;
}
