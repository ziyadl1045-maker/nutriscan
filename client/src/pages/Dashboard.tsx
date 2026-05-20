import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { BottomNav } from "@/components/BottomNav";
import { Scan, ChevronRight, User, Loader2, MessageSquare, Globe } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";
import { fr, arSA, enUS } from "date-fns/locale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const { data: scans, isLoading } = useQuery<any[]>({
    queryKey: [api.profile.scans.path],
    initialData: [],
  });

  const getLocale = () => {
    if (i18n.language === "fr") return fr;
    if (i18n.language === "ar") return arSA;
    return enUS;
  };

  const getScoreColor = (score: number) => {
    if (score <= 25) return "bg-emerald-500";
    if (score <= 45) return "bg-lime-500";
    if (score <= 70) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="bg-white px-6 py-8 pb-12 rounded-b-[2.5rem] shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-muted-foreground font-medium">{t('welcome_back') || 'Welcome back,'}</p>
            <h1 className="text-3xl font-bold text-slate-900 font-display">
              {user?.firstName || "Friend"}!
            </h1>
          </div>
          <Link href="/profile">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center cursor-pointer hover:bg-emerald-200 transition-colors">
              {user?.profileImageUrl ? (
                <img src={user.profileImageUrl} alt="Profile" className="w-full h-full rounded-full object-cover" />
              ) : (
                <User className="text-emerald-700 w-6 h-6" />
              )}
            </div>
          </Link>
        </div>

        {/* Language Switcher in Dashboard */}
        <div className="flex justify-end mb-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="rounded-full gap-2">
                <Globe className="h-4 w-4" />
                <span className="text-xs font-medium uppercase">{i18n.language}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => changeLanguage('en')}>
                English
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeLanguage('fr')}>
                Français
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeLanguage('ar')}>
                العربية
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeLanguage('zgh')}>
                ⵜⴰⵎⴰⵣⵉⵖⵜ
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Link href="/scan">
            <motion.div 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-primary rounded-3xl p-6 text-white shadow-lg shadow-emerald-900/20 relative overflow-hidden cursor-pointer group h-full"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8 blur-xl group-hover:bg-white/20 transition-colors" />
              <div className="relative z-10">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm mb-4">
                  <Scan className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold mb-1">{t('scan') || 'Scan'}</h2>
                <p className="text-emerald-100 text-xs">{t('analyze_barcodes') || 'Instant analysis'}</p>
              </div>
            </motion.div>
          </Link>

          <Link href="/chat">
            <motion.div 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-emerald-600 rounded-3xl p-6 text-white shadow-lg shadow-emerald-900/20 relative overflow-hidden cursor-pointer group h-full"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8 blur-xl group-hover:bg-white/20 transition-colors" />
              <div className="relative z-10">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm mb-4">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold mb-1">Expert IA</h2>
                <p className="text-emerald-100 text-xs">Conseils personnalisés</p>
              </div>
            </motion.div>
          </Link>
        </div>
      </div>

      <div className="px-6 mt-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-900">{t('recent_scans') || 'Recent Scans'}</h3>
          <Link href="/profile">
            <button className="text-sm font-semibold text-primary">{t('view_all') || 'View All'}</button>
          </Link>
        </div>

        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : scans?.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200">
              <p className="text-muted-foreground">{t('no_scans_yet') || 'No scans yet'}</p>
            </div>
          ) : (
            scans?.slice(0, 10).map((scan: any) => (
              <Link key={scan.id} href={`/product/${scan.barcode}`}>
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center overflow-hidden">
                      {scan.imageUrl ? (
                        <img src={scan.imageUrl} alt={scan.productName} className="w-full h-full object-cover" />
                      ) : (
                        <Scan className="text-slate-300 w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 line-clamp-1">{scan.productName}</h4>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(scan.createdAt), { addSuffix: true, locale: getLocale() })}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-gray-300 ${i18n.language === 'ar' ? 'rotate-180' : ''}`} />
                </motion.div>
              </Link>
            ))
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
