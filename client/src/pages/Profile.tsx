import { useForm } from "react-hook-form";
import { useProfile } from "@/hooks/use-profile";
import { useAuth } from "@/hooks/use-auth";
import { BottomNav } from "@/components/BottomNav";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, LogOut, ChevronRight, Scan, Trash2, Smartphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { Link, useLocation } from "wouter";
import { fr, arSA, enUS } from "date-fns/locale";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useEffect } from "react";

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional(),
  age: z.coerce.number().min(0).max(120),
  gender: z.string().optional(),
  dietaryPreferences: z.array(z.string()).default([]),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { profile, updateProfile, isUpdating, isLoading: isProfileLoading } = useProfile();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const [, setLocation] = useLocation();

  const { data: scans, isLoading: isScansLoading, refetch: refetchScans } = useQuery<any[]>({
    queryKey: [api.profile.scans.path],
    initialData: [],
  });

  const { data: sessionsData } = useQuery<{ count: number }>({
    queryKey: ["/api/sessions/count"],
    initialData: { count: 1 },
  });

  // Auto-refresh data when user returns to app (multi-device sync)
  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden) {
        refetchScans();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [refetchScans]);

  const deleteScanMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `${api.profile.scans.path}/${id}`);
    },
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData([api.profile.scans.path], (old: any[] | undefined) => {
        return old?.filter(scan => scan.id !== deletedId) || [];
      });
      toast({
        title: "Scan supprimé",
        description: "Le produit a été retiré de votre historique.",
      });
    },
  });

  const getLocale = () => {
    if (i18n.language === "fr") return fr;
    if (i18n.language === "ar") return arSA;
    if (i18n.language === "zgh") return fr; // Fallback to French for Amazigh date formatting for now
    return enUS;
  };

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      age: user?.age || 0,
      gender: user?.gender || "",
      dietaryPreferences: user?.dietaryPreferences || [],
    }
  });

  const onSubmit = (data: ProfileFormValues) => {
    updateProfile(data, {
      onSuccess: () => {
        toast({
          title: "Profil mis à jour",
          description: "Vos informations ont été enregistrées.",
        });
      },
      onError: () => {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Impossible de mettre à jour le profil.",
        });
      }
    });
  };

  const onLogout = async () => {
    try {
      await logout();
      toast({
        title: "Déconnexion réussie",
        description: "À bientôt sur NutriScan !",
      });
      setLocation("/auth");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de se déconnecter.",
      });
    }
  };

  if (isProfileLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="bg-white px-6 py-12 pb-16 rounded-b-[2.5rem] shadow-sm text-center">
        <div className="w-24 h-24 mx-auto bg-emerald-100 rounded-full mb-4 overflow-hidden border-4 border-white shadow-lg">
          {user?.profileImageUrl ? (
            <img src={user.profileImageUrl} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-emerald-700">
              {user?.firstName?.[0]}
            </div>
          )}
        </div>
        <h1 className="text-2xl font-bold text-slate-900">{user?.firstName} {user?.lastName}</h1>
        <p className="text-muted-foreground mb-4">{user?.email}</p>
        
        {user?.subscriptionStatus === 'premium' ? (
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-100 text-amber-700 rounded-full text-xs font-bold border border-amber-200 shadow-sm">
            <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
            Membre Premium
          </div>
        ) : (
          <button 
            onClick={() => toast({ title: "Bientôt disponible", description: "Le système de paiement sera activé lors du déploiement final." })}
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-100 text-slate-600 rounded-full text-xs font-bold border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-all"
          >
            Passer à la version Premium
          </button>
        )}
      </div>

      <div className="max-w-md mx-auto px-6 -mt-8 space-y-6">
        <div className="bg-white p-6 rounded-3xl shadow-lg shadow-slate-200/50">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Dietary Preferences */}
            <div className="space-y-4 py-4 border-y border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Préférences Alimentaires</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'halal', label: 'Halal' },
                  { id: 'vegan', label: 'Végan' },
                  { id: 'sans_gluten', label: 'Sans Gluten' },
                  { id: 'diabetique', label: 'Diabétique' },
                  { id: 'allergie_arachide', label: 'Allergie Arachides' }
                ].map((diet) => (
                  <button
                    key={diet.id}
                    type="button"
                    onClick={() => {
                      const current = form.getValues("dietaryPreferences") || [];
                      const updated = current.includes(diet.id)
                        ? current.filter(id => id !== diet.id)
                        : [...current, diet.id];
                      form.setValue("dietaryPreferences", updated, { shouldDirty: true });
                    }}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                      form.watch("dietaryPreferences")?.includes(diet.id)
                        ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm"
                        : "bg-gray-50 border-gray-100 text-slate-500 hover:border-emerald-200"
                    }`}
                  >
                    {diet.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Language Switcher in Profile */}
            <div className="space-y-4 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Langue / Tutlayt</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'en', label: 'English' },
                  { id: 'fr', label: 'Français' },
                  { id: 'ar', label: 'العربية' },
                  { id: 'zgh', label: 'ⵜⴰⵎⴰⵣⵉⵖⵜ' }
                ].map((lang) => (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => i18n.changeLanguage(lang.id)}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                      i18n.language === lang.id
                        ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm"
                        : "bg-gray-50 border-gray-100 text-slate-500 hover:border-emerald-200"
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">{t('first_name') || 'First Name'}</label>
                <input 
                  {...form.register("firstName")}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">{t('last_name') || 'Last Name'}</label>
                <input 
                  {...form.register("lastName")}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">{t('age') || 'Age'}</label>
                <input 
                  type="number"
                  {...form.register("age")}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">{t('gender') || 'Gender'}</label>
                <select 
                  {...form.register("gender")}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                >
                  <option value="">{t('select') || 'Select'}</option>
                  <option value="male">{t('male') || 'Male'}</option>
                  <option value="female">{t('female') || 'Female'}</option>
                  <option value="other">{t('other') || 'Other'}</option>
                </select>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isUpdating}
              className="w-full py-4 mt-4 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50"
            >
              {isUpdating ? (t('saving') || "Saving...") : (t('save_changes') || "Save Changes")}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 space-y-3">
            {/* Appareils connectés (info only) */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-slate-500 shrink-0" />
              <div>
                <h4 className="font-bold text-slate-800 text-sm">Appareils connectés</h4>
                <p className="text-xs text-muted-foreground">
                  {sessionsData?.count ?? 1} appareil(s) actif(s) sur votre compte
                </p>
              </div>
            </div>

            <button 
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-red-500 font-medium hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              {t('sign_out') || 'Sign Out'}
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-lg shadow-slate-200/50">
          <h3 className="text-lg font-bold text-slate-900 mb-4">{t('scan_history') || 'Scan History'}</h3>
          
          <div className="space-y-4">
            {isScansLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : scans?.length === 0 ? (
              <p className="text-center text-muted-foreground py-4 text-sm">{t('no_scans_yet') || 'No scans yet'}</p>
            ) : (
              scans?.map((scan: any) => (
                <div key={scan.id} className="flex items-center gap-2 group border-b border-slate-50 pb-4 last:border-0 last:pb-0">
                  <Link href={`/product/${scan.barcode}`} className="flex-1">
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center overflow-hidden">
                          {scan.imageUrl ? (
                            <img src={scan.imageUrl} alt={scan.productName} className="w-full h-full object-cover" />
                          ) : (
                            <Scan className="text-slate-300 w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900 line-clamp-1">{scan.productName}</h4>
                          <p className="text-[10px] text-muted-foreground">
                            {formatDistanceToNow(new Date(scan.createdAt), { addSuffix: true, locale: getLocale() })}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 text-gray-300 group-hover:text-primary transition-colors ${i18n.language === 'ar' ? 'rotate-180' : ''}`} />
                    </motion.div>
                  </Link>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteScanMutation.mutate(scan.id);
                    }}
                    disabled={deleteScanMutation.isPending}
                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
