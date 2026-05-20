import { Link } from "wouter";
import { ArrowRight, Leaf, ShieldCheck, Zap, Globe } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import logoImage from "@assets/generated_images/professional_logo_for_nutriscan_app..png";

export default function Landing() {
  const { t, i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Language Switcher */}
      <div className="absolute top-4 right-4 z-50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Globe className="h-5 w-5" />
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

      {/* Abstract Background Shapes */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute -top-[20%] -right-[20%] w-[80%] h-[80%] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-[40%] -left-[20%] w-[60%] h-[60%] bg-emerald-200/20 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-12 lg:py-24">
        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-6"
        >
          <div className="flex justify-center mb-4">
            <img src={logoImage} alt="NutriScan Logo" className="w-24 h-24 rounded-2xl shadow-xl" />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary font-medium text-sm">
            <Leaf className="w-4 h-4" />
            <span>{t('instant_scanning')}</span>
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-bold font-display tracking-tight text-foreground leading-[1.1]">
            {t('welcome').split(',')[0]}, <br />
            <span className="text-gradient">{t('welcome').split(',')[1]}</span>
          </h1>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {t('scan_any_barcode')} 
            <br />
            {t('join_tournaments')}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <Link href="/auth">
              <Button size="lg" className="h-14 px-8 rounded-full text-lg shadow-lg shadow-primary/25 hover:scale-105 transition-all duration-300">
                Se connecter
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/auth">
              <Button size="lg" variant="outline" className="h-14 px-8 rounded-full text-lg hover:scale-105 transition-all duration-300">
                Créer un compte
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-24">
          {[
            {
              icon: Zap,
              title: t('instant_scanning'),
              desc: t('instant_scanning_desc')
            },
            {
              icon: ShieldCheck,
              title: t('ai_analysis'),
              desc: t('ai_analysis_desc')
            },
            {
              icon: Leaf,
              title: t('better_habits'),
              desc: t('better_habits_desc')
            }
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="p-8 rounded-3xl bg-white border border-border shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6">
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
