import { Link, useLocation } from "wouter";
import { Home, Scan, MessageSquare, User, Globe, Keyboard } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function BottomNav() {
  const [location, setLocation] = useLocation();
  const { t, i18n } = useTranslation();
  const [barcode, setBarcode] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (barcode.trim()) {
      setIsDialogOpen(false);
      setLocation(`/product/${barcode.trim()}`);
      setBarcode("");
    }
  };

  const isActive = (path: string) => location === path;

  const navItems = [
    { path: "/", icon: Home, label: t('dashboard') },
    { path: "/scan", icon: Scan, label: t('scan') },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-lg border-t border-border/50 pb-safe">
      <div className="flex items-center justify-around px-2 py-2 md:py-3 max-w-md mx-auto">
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <Link key={item.path} href={item.path} className="relative flex flex-col items-center justify-center p-2 group cursor-pointer w-16">
              {active && (
                <motion.div
                  layoutId="nav-pill"
                  className="absolute inset-0 bg-primary/10 rounded-xl"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <item.icon
                className={`w-6 h-6 transition-colors duration-200 ${
                  active ? "text-primary stroke-[2.5px]" : "text-muted-foreground group-hover:text-primary/70"
                }`}
              />
              <span className={`text-[10px] mt-1 font-medium transition-colors ${
                active ? "text-primary" : "text-muted-foreground"
              }`}>
                {item.label}
              </span>
            </Link>
          );
        })}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <button className="relative flex flex-col items-center justify-center p-2 group cursor-pointer w-16 outline-none">
              <Keyboard className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-[10px] mt-1 font-medium text-muted-foreground">
                {t('manual') || 'Manual'}
              </span>
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md mx-4 rounded-3xl">
            <DialogHeader>
              <DialogTitle>{t('enter_barcode') || 'Enter Barcode'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleManualSubmit} className="space-y-4 pt-4">
              <Input
                placeholder="Ex: 6111234567890"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="rounded-xl py-6 text-lg tracking-widest"
                autoFocus
              />
              <Button type="submit" className="w-full py-6 rounded-xl text-lg font-bold">
                {t('analyze') || 'Analyze'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <Link href="/chat" className="relative flex flex-col items-center justify-center p-2 group cursor-pointer w-16">
          {isActive("/chat") && (
            <motion.div
              layoutId="nav-pill"
              className="absolute inset-0 bg-primary/10 rounded-xl"
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          )}
          <MessageSquare
            className={`w-6 h-6 transition-colors duration-200 ${
              isActive("/chat") ? "text-primary stroke-[2.5px]" : "text-muted-foreground group-hover:text-primary/70"
            }`}
          />
          <span className={`text-[10px] mt-1 font-medium transition-colors ${
            isActive("/chat") ? "text-primary" : "text-muted-foreground"
          }`}>
            {t('chat')}
          </span>
        </Link>

        <Link href="/profile" className="relative flex flex-col items-center justify-center p-2 group cursor-pointer w-16">
          {isActive("/profile") && (
            <motion.div
              layoutId="nav-pill"
              className="absolute inset-0 bg-primary/10 rounded-xl"
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          )}
          <User
            className={`w-6 h-6 transition-colors duration-200 ${
              isActive("/profile") ? "text-primary stroke-[2.5px]" : "text-muted-foreground group-hover:text-primary/70"
            }`}
          />
          <span className={`text-[10px] mt-1 font-medium transition-colors ${
            isActive("/profile") ? "text-primary" : "text-muted-foreground"
          }`}>
            {t('profile')}
          </span>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative flex flex-col items-center justify-center p-2 group cursor-pointer w-16 outline-none">
              <Globe className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-[10px] mt-1 font-medium text-muted-foreground uppercase">{i18n.language.split('-')[0]}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="mb-2">
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
    </div>
  );
}
