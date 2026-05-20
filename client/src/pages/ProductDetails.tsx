import { useRoute, Link, useLocation } from "wouter";
import { useProduct } from "@/hooks/use-products";
import { HealthGauge } from "@/components/HealthGauge";
import { BottomNav } from "@/components/BottomNav";
import { ArrowLeft, Share2, Info, Search, Sparkles, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { api } from "@shared/routes";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "react-i18next";

export default function ProductDetails() {
  const { t } = useTranslation();
  const [match, params] = useRoute("/product/:barcode");
  const [, setLocation] = useLocation();
  const barcode = match ? params.barcode : null;
  const { data: product, isLoading, error } = useProduct(barcode);
  const [searchName, setSearchName] = useState("");

  const aiLookupMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", api.products.aiLookup.path, { name });
      return res.json();
    },
  });
  
  const calculateScore = (p: any) => {
    if (!p || !p.nutriments) return 0;
    
    let points = 0;
    const n = p.nutriments as Record<string, any>;
    
    const energy = p.calories || 0;
    if (energy > 800) points += 10;
    else if (energy > 160) points += Math.floor(energy / 80);
    
    const sugars = parseFloat(n.sugars) || 0;
    if (sugars > 45) points += 10;
    else if (sugars > 4.5) points += Math.floor(sugars / 4.5);
    
    const satFat = parseFloat(n['saturated-fat']) || 0;
    if (satFat > 10) points += 10;
    else if (satFat > 1) points += Math.floor(satFat / 1);
    
    const salt = parseFloat(n.salt) || 0;
    if (salt > 0.9) points += 10;
    else if (salt > 0.1) points += Math.floor(salt / 0.1);
    
    const proteins = parseFloat(n.proteins) || 0;
    const fiber = parseFloat(n.fiber) || 0;
    const goodPoints = Math.min(5, Math.floor(proteins / 1.6)) + Math.min(5, Math.floor(fiber / 0.9));
    
    const finalScore = points - goodPoints;
    return Math.max(0, Math.min(100, 100 - (finalScore + 15) * 2));
  };

  const currentProduct = aiLookupMutation.data || product;
  const score = Math.round(
    currentProduct?.healthScore !== undefined && currentProduct?.healthScore !== null
      ? currentProduct.healthScore
      : calculateScore(currentProduct)
  );

  const getRecommendation = (s: number) => {
    if (s >= 80) return t("rec_excellent");
    if (s >= 60) return t("rec_good");
    if (s >= 40) return t("rec_moderate");
    if (s >= 20) return t("rec_poor");
    return t("rec_very_poor");
  };

  if (isLoading || aiLookupMutation.isPending) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          {aiLookupMutation.isPending && (
            <p className="text-sm font-medium text-muted-foreground animate-pulse">
              {t("loading_ai")}
            </p>
          )}
        </div>
      </div>
    );
  }

  if ((error || !product) && !aiLookupMutation.data) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6">
          <Info className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold mb-2">{t("product_not_found")}</h2>
        <p className="text-muted-foreground mb-8">
          {t("product_not_found_desc")} <span className="font-mono font-bold text-foreground">{barcode}</span>.{" "}
          {t("search_by_name")}
        </p>
        
        <div className="w-full max-w-sm space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input 
              type="text"
              placeholder={t("enter_product_name")}
              className="w-full h-14 pl-12 pr-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-primary/20 transition-all text-lg"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchName && aiLookupMutation.mutate(searchName)}
            />
          </div>
          <button 
            disabled={!searchName}
            onClick={() => aiLookupMutation.mutate(searchName)}
            className="w-full h-14 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 disabled:opacity-50 transition-all active:scale-95"
          >
            <Sparkles className="w-5 h-5" />
            {t("estimate_with_ai")}
          </button>
          
          <div className="pt-4">
            <Link href="/scan" className="text-sm font-semibold text-primary hover:underline">
              {t("scan_another")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const displayProduct = currentProduct;
  const servingSize = displayProduct?.serving_quantity || 100;
  const multiplier = servingSize / 100;

  const getNutrientValue = (val: any) => {
    const num = parseFloat(val) || 0;
    return (num * multiplier).toFixed(1);
  };

  const getCalories = (val: any) => {
    const num = parseFloat(val) || 0;
    return Math.round(num * multiplier);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white px-6 pt-6 pb-6 sticky top-0 z-10 shadow-sm flex items-center justify-between">
        <Link href="/scan">
          <div className="p-2 -ml-2 hover:bg-gray-100 rounded-full cursor-pointer transition">
            <ArrowLeft className="w-6 h-6 text-slate-800" />
          </div>
        </Link>
        <h1 className="font-bold text-slate-800">{t("product_analysis")}</h1>
        <Share2 className="w-6 h-6 text-slate-800" />
      </div>

      <div className="px-6 py-8 space-y-8">
        {/* Product Identity */}
        <div className="text-center">
          <div className="relative w-24 h-24 bg-white rounded-2xl mx-auto mb-4 shadow-md border border-gray-100 flex items-center justify-center">
            {displayProduct.image_url ? (
              <img src={displayProduct.image_url} alt={displayProduct.name} className="w-full h-full object-contain rounded-2xl p-2" />
            ) : (
              <span className="text-2xl font-bold text-gray-300">IMG</span>
            )}
            {displayProduct.isMoroccan && (
              <div className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-full border-2 border-white shadow-sm flex items-center gap-1">
                <span>🇲🇦</span> MAROC
              </div>
            )}
          </div>
          <h2 className="text-2xl font-bold text-slate-900 font-display mb-1">{displayProduct.name}</h2>
          <p className="text-muted-foreground">{displayProduct.brand || t("unknown_brand")}</p>
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
            {t("values_for")} {servingSize}g {servingSize !== 100 && `(${t("serving")})`}
          </div>
        </div>

        {/* Gauge */}
        <div className="space-y-2">
          <HealthGauge score={score} />
          <p className="text-center text-sm font-medium text-slate-600 px-4">
            {getRecommendation(score)}
          </p>
        </div>

        {/* Nutrients Grid */}
        <div>
          <h3 className="text-lg font-bold text-slate-900 mb-4">{t("nutrient_analysis")}</h3>
          <div className="grid grid-cols-2 gap-4">
            <NutrientCard 
              label={t("sugars")}
              value={`${getNutrientValue(displayProduct.nutriments?.sugars)}g`} 
              status={parseFloat(displayProduct.nutriments?.sugars) * multiplier > 10 * multiplier ? t("high") : t("reasonable")}
              color={parseFloat(displayProduct.nutriments?.sugars) * multiplier > 10 * multiplier ? "red" : "green"}
            />
            <NutrientCard 
              label={t("fat")}
              value={`${getNutrientValue(displayProduct.nutriments?.fat)}g`} 
              status={parseFloat(displayProduct.nutriments?.fat) * multiplier > 15 * multiplier ? t("high") : t("moderate")}
              color={parseFloat(displayProduct.nutriments?.fat) * multiplier > 15 * multiplier ? "red" : "orange"}
            />
            <NutrientCard 
              label={t("proteins")}
              value={`${getNutrientValue(displayProduct.nutriments?.proteins)}g`} 
              status={t("healthy")}
              color="green"
            />
            <NutrientCard 
              label={t("salt")}
              value={`${(parseFloat(displayProduct.nutriments?.salt || 0) * multiplier).toFixed(2)}g`} 
              status={parseFloat(displayProduct.nutriments?.salt) * multiplier > 1.5 * multiplier ? t("high") : t("low")}
              color={parseFloat(displayProduct.nutriments?.salt) * multiplier > 1.5 * multiplier ? "red" : "green"}
            />
            <NutrientCard 
              label={t("calories_label")}
              value={`${getCalories(displayProduct.calories || displayProduct.nutriments?.energy_kcal)} kcal`} 
              status={getCalories(displayProduct.calories || displayProduct.nutriments?.energy_kcal) > 400 * multiplier ? t("high") : t("normal")}
              color={getCalories(displayProduct.calories || displayProduct.nutriments?.energy_kcal) > 400 * multiplier ? "red" : "green"}
            />
          </div>
        </div>

        {/* Additives Section */}
        {displayProduct.additives && displayProduct.additives.length > 0 && (
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-4">{t("chemical_additives")}</h3>
            <div className="flex flex-wrap gap-2">
              {displayProduct.additives.map((additive: string, idx: number) => (
                <div key={idx} className="px-3 py-1.5 bg-red-50 text-red-700 border border-red-100 rounded-lg text-sm font-medium">
                  {additive}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Moroccan Score */}
        {displayProduct.isMoroccan && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-2xl">🇲🇦</div>
              <div>
                <h4 className="font-bold text-emerald-900 text-sm">{t("local_product")}</h4>
                <p className="text-[10px] text-emerald-700">{t("supports_economy")}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-black text-emerald-600">100/100</div>
              <div className="text-[8px] font-bold text-emerald-500 uppercase">Eco-Score</div>
            </div>
          </div>
        )}

        {/* Alternatives Section */}
        {displayProduct.alternatives && displayProduct.alternatives.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-500" />
              <h3 className="text-lg font-bold text-slate-900">{t("healthier_alternatives")}</h3>
            </div>
            <div className="space-y-3">
              {displayProduct.alternatives.map((alt: any, idx: number) => (
                <div key={idx} className="p-4 bg-white rounded-xl border border-emerald-100 shadow-sm flex items-center justify-between">
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="font-bold text-slate-800 truncate">{alt.name}</p>
                    <p className="text-xs text-muted-foreground">{alt.brand}</p>
                    <p className="text-[10px] text-emerald-600 font-medium mt-1 leading-tight">{alt.reason}</p>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-full border-2 border-emerald-500 flex items-center justify-center text-xs font-bold text-emerald-700 bg-emerald-50">
                      {Math.round(alt.healthScore)}
                    </div>
                    <span className="text-[8px] font-bold text-emerald-600 uppercase">Score</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dietary Warnings */}
        {displayProduct.dietWarnings && displayProduct.dietWarnings.length > 0 && (
          <div className="p-4 rounded-xl bg-red-600 border border-red-700 shadow-lg shadow-red-900/20 space-y-2 animate-in fade-in zoom-in duration-300">
            <div className="flex items-center gap-2 text-white">
              <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
                <Info className="w-4 h-4 text-red-600" />
              </div>
              <h3 className="font-bold">{t("diet_warning")}</h3>
            </div>
            <ul className="list-disc list-inside text-sm text-red-50 space-y-1">
              {displayProduct.dietWarnings.map((warning: string, idx: number) => (
                <li key={idx} className="font-bold text-base leading-tight">
                  {warning}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* AI Analysis CTA */}
        <Link href="/chat">
          <motion.div 
            whileTap={{ scale: 0.98 }}
            className="p-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/20 cursor-pointer"
          >
            <h3 className="font-bold text-lg mb-1">{t("have_questions")}</h3>
            <p className="text-emerald-100 text-sm mb-4">{t("ask_nutritionist")}</p>
            <div className="inline-flex px-4 py-2 bg-white/20 backdrop-blur-md rounded-lg text-sm font-medium">
              {t("start_chat")}
            </div>
          </motion.div>
        </Link>
      </div>

      <BottomNav />
    </div>
  );
}

function NutrientCard({ label, value, status, color }: { label: string, value: string, status: string, color: string }) {
  const colorClass = {
    red: "text-red-600 bg-red-50 border-red-100",
    orange: "text-orange-600 bg-orange-50 border-orange-100",
    green: "text-emerald-600 bg-emerald-50 border-emerald-100"
  }[color] || "text-gray-600 bg-gray-50 border-gray-100";

  return (
    <div className={`p-4 rounded-xl border ${colorClass} bg-opacity-50`}>
      <p className="text-sm font-medium opacity-80 mb-1">{label}</p>
      <div className="flex items-end justify-between">
        <span className="text-xl font-bold">{value}</span>
        <span className="text-xs font-bold uppercase tracking-wider opacity-70">{status}</span>
      </div>
    </div>
  );
}
