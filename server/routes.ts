import type { Express } from "express";
import type { Server } from "http";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { registerChatRoutes } from "./replit_integrations/chat";
import { registerImageRoutes } from "./replit_integrations/image";
import { openai } from "./replit_integrations/chat/routes"; // Reuse openai client
import { api } from "@shared/routes";
import { storage } from "./storage";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Integrations
  await setupAuth(app);
  registerAuthRoutes(app);
  registerChatRoutes(app);
  registerImageRoutes(app);

  const sanitizeUser = (user: any) => {
    if (!user) return user;
    const { password, ...safe } = user;
    return safe;
  };

  // Profile Routes
  app.get(api.profile.get.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;
    const user = await storage.getUser(userId);
    res.json(sanitizeUser(user));
  });

  app.get(api.profile.scans.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;
    const history = await storage.getScanHistory(userId);
    res.json(history);
  });

  app.patch(api.profile.update.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const input = api.profile.update.input.parse(req.body);
      const updated = await storage.updateUser(userId, input);
      res.json(sanitizeUser(updated));
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  // Multi-device session management
  app.get("/api/sessions/count", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const count = await storage.countUserSessions(userId);
      res.json({ count });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/sessions/logout-all", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const currentSid = req.sessionID;
      const deleted = await storage.deleteAllUserSessions(userId, currentSid);
      res.json({ message: `${deleted} autre(s) appareil(s) déconnecté(s)`, count: deleted });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete(`${api.profile.scans.path}/:id`, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const scanId = parseInt(req.params.id);
      const success = await storage.deleteScanEntry(scanId, userId);
      if (success) {
        res.json({ message: "Scan deleted" });
      } else {
        res.status(404).json({ message: "Scan not found" });
      }
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Product Lookup (Proxy to OpenFoodFacts + Moroccan local DB)
  app.get(api.products.lookup.path, async (req: any, res) => {
    const { barcode } = req.params;
    const userId = req.isAuthenticated() ? req.user.id : null;
    
    try {
      // ── 1. Check local Moroccan products database first ────────────────
      const moroccanProduct = await storage.getMoroccanProduct(barcode);

      // ── 2. Fetch from OpenFoodFacts ────────────────────────────────────
      let offProduct: any = null;
      try {
        const offResponse = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
        if (offResponse.ok) {
          const offData = await offResponse.json();
          if (offData?.status === 1) {
            offProduct = offData.product;
          }
        }
      } catch (offErr) {
        console.error("OpenFoodFacts fetch error:", offErr);
        // Continue — we may still have a local Moroccan product
      }

      // If neither source has the product, return 404
      if (!moroccanProduct && !offProduct) {
        return res.status(404).json({ message: "Product not found" });
      }

      // ── 3. Build nutriments — moroccan DB wins if both exist ───────────
      const offNutriments = offProduct?.nutriments || {};
      const offMapped = {
        sugars: offNutriments.sugars_100g || offNutriments.sugars || 0,
        fat: offNutriments.fat_100g || offNutriments.fat || 0,
        proteins: offNutriments.proteins_100g || offNutriments.proteins || 0,
        salt: offNutriments.salt_100g || offNutriments.salt || 0,
        saturated_fat: offNutriments['saturated-fat_100g'] || offNutriments['saturated-fat'] || 0,
        fiber: offNutriments.fiber_100g || offNutriments.fiber || 0,
        sodium: offNutriments.sodium_100g || offNutriments.sodium || 0,
        energy_kcal: offNutriments['energy-kcal_100g'] || offNutriments['energy-kcal'] || 0,
      };

      const moroccanNutriments = moroccanProduct?.nutriments as Record<string, number> | null;
      const mappedNutriments: Record<string, number> = moroccanNutriments
        ? {
            sugars: moroccanNutriments.sugars ?? offMapped.sugars,
            fat: moroccanNutriments.fat ?? offMapped.fat,
            proteins: moroccanNutriments.proteins ?? offMapped.proteins,
            salt: moroccanNutriments.salt ?? offMapped.salt,
            saturated_fat: moroccanNutriments.saturated_fat ?? offMapped.saturated_fat,
            fiber: moroccanNutriments.fiber ?? offMapped.fiber,
            sodium: offMapped.sodium,
            energy_kcal: moroccanNutriments.energy_kcal ?? offMapped.energy_kcal,
          }
        : offMapped;

      // ── 4. Health Score ────────────────────────────────────────────────
      const offScoreValue = offProduct?.nutriscore_score;
      let calculatedHealthScore: number | null = null;
      if (offScoreValue !== undefined && offScoreValue !== null) {
        calculatedHealthScore = Math.max(0, Math.min(100, 100 - (Number(offScoreValue) + 15) * (100 / 55)));
      }

      // ── 5. Name — moroccan DB wins over OFF, AI used only as last resort ─
      let enhancedName = moroccanProduct?.name || offProduct?.product_name || "";
      let aiNutriments = null;
      let aiCalories = null;

      const isGenericName = !enhancedName || enhancedName.toLowerCase().includes("unknown") || enhancedName.length < 3;
      const needsAIEnhancement = !moroccanProduct && (isGenericName || !offProduct?.brands || Object.keys(offProduct?.nutriments || {}).length < 3);

      if (needsAIEnhancement) {
        try {
          const aiResponse = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: "You are a Moroccan food expert. Identify the product precisely from the barcode. If it's a known product in Morocco, provide its exact common name and brand. Do not return generic or random names. Return JSON: { name, brand, nutriments: { sugars, fat, proteins, salt }, calories }."
              },
              {
                role: "user",
                content: `Barcode: ${barcode}. Current data: ${JSON.stringify({ name: offProduct?.product_name, brand: offProduct?.brands })}`
              }
            ],
            response_format: { type: "json_object" }
          });
          const aiData = JSON.parse(aiResponse.choices[0].message.content || "{}");
          if (aiData.name && aiData.name.length > 2) enhancedName = aiData.name;
          if (aiData.nutriments) aiNutriments = aiData.nutriments;
          if (aiData.calories) aiCalories = aiData.calories;
        } catch (e) {
          console.error("AI Enhancement error:", e);
        }
      }

      if (!enhancedName) enhancedName = "Produit inconnu";

      // ── 6. Halal status from moroccan DB ──────────────────────────────
      const isHalalCertifiedLocal = moroccanProduct?.isHalalCertified ?? false;

      const productData: any = {
        name: enhancedName,
        brand: moroccanProduct?.brand || offProduct?.brands || "Marque inconnue",
        nutriments: mappedNutriments,
        image_url: moroccanProduct?.imageUrl || offProduct?.image_url,
        additives: offProduct?.additives_tags?.map((tag: string) => tag.replace('en:', '').replace('-', ' ')),
        calories: moroccanProduct?.calories || Math.round(Number(mappedNutriments.energy_kcal)) || null,
        healthScore: calculatedHealthScore,
        nutriscore: offProduct?.nutriscore_grade || "unknown",
        serving_quantity: offProduct?.serving_quantity || null,
        alternatives: [],
        dietWarnings: [],
        isMoroccan: !!moroccanProduct || barcode.startsWith("611"),
        isHalalCertified: isHalalCertifiedLocal,
        localDbMatch: !!moroccanProduct,
      };

      // Use moroccan product's ingredients when OFF has none
      const product = offProduct || {};

      // Find healthier alternatives using AI if the score is low
      if (calculatedHealthScore !== null && calculatedHealthScore < 70) {
        try {
          const altResponse = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: `Tu es un expert en nutrition spécialisé dans les produits alimentaires mondiaux référencés sur Open Food Facts.

RÈGLES STRICTES :
1. Suggère EXACTEMENT 3 alternatives plus saines DU MÊME TYPE de produit (même catégorie).
2. Chaque alternative DOIT être un produit RÉEL et CONNU, présent sur Open Food Facts, avec son NOM EXACT et sa MARQUE EXACTE.
3. N'invente JAMAIS un produit. Uniquement des produits internationaux que tu connais avec certitude.
4. Exemples de marques mondiales acceptées : Danone, Nestlé, Kellogg's, Nature Valley, Special K, Bjorg, Belvita, Quaker, Activia, Actimel, Innocent, Tropicana, Heinz, Knorr, Panzani, Barilla, Uncle Ben's, President, Yoplait, Welch's, Alpro, Oatly, Clif Bar, Kind Bar, Mc Vitie's, Weetabix, Cheerios, Fitness, Fibre One, Gerblé, Michel et Augustin, St Hubert, Fleury Michon.
5. "name" = nom exact du produit. "brand" = marque exacte.
6. "healthScore" = entier entre 60 et 95 (SANS décimales).
7. "reason" = explication en français, max 10 mots, pourquoi c'est plus sain.

Retourne UNIQUEMENT du JSON valide : { "alternatives": [{ "name": string, "brand": string, "healthScore": number, "reason": string }] }`
              },
              {
                role: "user",
                content: `Produit scanné : "${productData.name}" — Marque : "${productData.brand}" — Catégorie : "${moroccanProduct?.category || product.categories || "Alimentaire"}" — Score santé actuel : ${Math.round(calculatedHealthScore ?? 0)}/100`
              }
            ],
            response_format: { type: "json_object" }
          });
          const altData: any = JSON.parse(altResponse.choices[0].message.content || "{}");
          productData.alternatives = (altData.alternatives || []).map((a: any) => ({
            ...a,
            healthScore: Math.round(a.healthScore || 75)
          }));
        } catch (e) {
          console.error("Alternatives AI error:", e);
        }
      }

      // Check if product matches user dietary preferences
      if (userId) {
        const user = await storage.getUser(userId);
        if (user && user.dietaryPreferences && user.dietaryPreferences.length > 0) {
          const isHalalPref = user.dietaryPreferences.includes('halal');
          const isVeganPref = user.dietaryPreferences.includes('vegan');
          const isGlutenFreePref = user.dietaryPreferences.includes('sans_gluten');
          const isDiabeticPref = user.dietaryPreferences.includes('diabetique');
          const isPeanutAllergyPref = user.dietaryPreferences.includes('allergie_arachide');

          // ── 1. Open Food Facts tags (most reliable) ──────────────────────
          const analysisTags: string[] = product.ingredients_analysis_tags || [];
          const labelsTags: string[] = product.labels_tags || [];
          const categoriesTags: string[] = product.categories_tags || [];

          // Check OFF tags for non-halal / pork
          const offHasPork = analysisTags.some((t: string) =>
            ['en:pork', 'en:non-halal', 'en:pork-gelatin', 'fr:porc'].includes(t)
          );
          const isHalalCertified = labelsTags.some((t: string) =>
            t.includes('halal')
          );
          const productIsInPorkCategory = categoriesTags.some((t: string) =>
            ['en:porks', 'en:hams', 'en:bacons', 'en:lards', 'en:pork-products',
             'en:sausages', 'fr:charcuteries', 'fr:jambons', 'fr:lardons'].includes(t)
          );

          // ── 2. Keyword scan on product text ──────────────────────────────
          const ingredientsText = moroccanProduct?.ingredients || product.ingredients_text || "";
          const productText = (
            enhancedName + " " +
            (product.product_name || "") + " " +
            ingredientsText + " " +
            (moroccanProduct?.brand || product.brands || "") + " " +
            (moroccanProduct?.category || product.categories || "") + " " +
            analysisTags.join(' ')
          ).toLowerCase();

          const porkKeywords = /\b(porc|pork|lard|lardon|bacon|jambon|cochon|pig|swine|ham|prosciutto|pancetta|chorizo|saucisson|rillettes|andouille|boudin)\b|gélatine de porc|gelatin|gelatine|graisse de porc|saindoux|e441|extrait de porc/;
          const keywordHasPork = porkKeywords.test(productText);

          const alcoholKeywords = /\b(alcool|alcohol|bière|beer|vin|wine|whisky|whiskey|vodka|rhum|rum|gin|champagne|cidre|cider|liqueur|spiritueux|brandy|porto|cognac|armagnac|vermouth|sake|mead|hydromel|brassé|fermenté|levure alcoolique)\b|e120.*alcool|arôme.*alcool|alcool éthylique/;
          const keywordHasAlcohol = alcoholKeywords.test(productText);

          // Check OFF tags for alcohol
          const offHasAlcohol = analysisTags.some((t: string) =>
            ['en:alcoholic-beverages', 'en:beers', 'en:wines', 'en:spirits', 'en:alcohol'].includes(t)
          ) || categoriesTags.some((t: string) =>
            ['en:alcoholic-beverages', 'en:beers', 'en:wines', 'en:spirits', 'fr:bieres', 'fr:vins', 'fr:alcools'].includes(t)
          );

          const glutenKeywords = /\b(blé|wheat|gluten|orge|seigle|avoine|épeautre|barley|rye|oat)\b/;
          const keywordHasGluten = glutenKeywords.test(productText);

          const peanutKeywords = /\b(arachide|arachides|cacahuète|cacahuètes|peanut|peanuts|groundnut)\b/;
          const keywordHasPeanut = peanutKeywords.test(productText);

          // ── 3. Apply warnings deterministically ──────────────────────────
          const warnings: string[] = [];

          if (isHalalPref) {
            const hasPorkSignal = offHasPork || productIsInPorkCategory || keywordHasPork;
            const hasAlcoholSignal = offHasAlcohol || keywordHasAlcohol;
            const halalCertified = isHalalCertifiedLocal || isHalalCertified;

            if (hasPorkSignal && !halalCertified) {
              warnings.push("🚫 Haram — Porc : Ce produit contient du porc ou des ingrédients d'origine porcine (lard, gélatine, etc.) incompatibles avec votre régime Halal.");
            }
            if (hasAlcoholSignal && !halalCertified) {
              warnings.push("🚫 Haram — Alcool : Ce produit contient de l'alcool, ce qui est incompatible avec votre régime Halal.");
            }
            if (!hasPorkSignal && !hasAlcoholSignal && !halalCertified && ingredientsText.length > 10) {
              // Use AI only when we have ingredient data but no clear signal
              try {
                const dietResponse = await openai.chat.completions.create({
                  model: "gpt-4o",
                  messages: [
                    {
                      role: "system",
                      content: "Tu es un expert en alimentation halal. Analyse les ingrédients d'un produit alimentaire pour détecter : (1) toute trace de porc (porc, lard, gélatine porcine, saindoux, E441, graisses animales non certifiées), (2) tout alcool (alcool éthylique, vin, bière, arômes alcoolisés, e-numbers issus de fermentation alcoolique). Si aucun problème n'est détecté, renvoie un tableau vide. Réponds UNIQUEMENT en JSON: { warnings: [string] }. Les avertissements commencent par '🚫 Haram — ' et sont en français."
                    },
                    {
                      role: "user",
                      content: `Produit: ${enhancedName}, Marque: ${productData.brand}\nIngrédients: ${ingredientsText || "N/A"}\nCatégories: ${moroccanProduct?.category || product.categories || "N/A"}`
                    }
                  ],
                  response_format: { type: "json_object" }
                });
                const dietData: any = JSON.parse(dietResponse.choices[0].message.content || "{}");
                (dietData.warnings || []).forEach((w: string) => warnings.push(w));
              } catch (e) {
                console.error("Halal AI check error:", e);
              }
            }
          }

          if (isGlutenFreePref && keywordHasGluten) {
            warnings.push("⚠️ Contient du gluten : incompatible avec votre régime sans gluten.");
          }

          if (isPeanutAllergyPref && keywordHasPeanut) {
            warnings.push("⚠️ Allergie arachide : Ce produit contient des arachides ou des cacahuètes.");
          }

          if (isVeganPref) {
            const veganStatus = analysisTags.find((t: string) => t.includes('vegan') || t.includes('non-vegan'));
            if (veganStatus?.includes('non-vegan')) {
              warnings.push("⚠️ Non vegan : Ce produit contient des ingrédients d'origine animale.");
            }
          }

          if (isDiabeticPref) {
            const sugars = mappedNutriments.sugars || 0;
            if (sugars > 15) {
              warnings.push(`⚠️ Diabète : Ce produit est riche en sucres (${sugars}g/100g). À consommer avec précaution.`);
            }
          }

          productData.dietWarnings = warnings;
        }
      }

      // Save to history if user is logged in
      if (userId) {
        try {
          await storage.createScanEntry({
            userId,
            barcode,
            productName: productData.name,
            brand: productData.brand,
            imageUrl: productData.image_url,
            nutriments: productData.nutriments,
            calories: productData.calories ? Math.round(Number(productData.calories)) : null,
            dietWarnings: productData.dietWarnings,
          });
        } catch (e) {
          console.error("Error saving scan history:", e);
        }
      }

      res.json(productData);
    } catch (error) {
      console.error("OpenFoodFacts error:", error);
      res.status(500).json({ message: "Failed to fetch product data" });
    }
  });

  // AI Fallback Lookup
  app.post(api.products.aiLookup.path, async (req, res) => {
    try {
      const { name } = api.products.aiLookup.input.parse(req.body);
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a Moroccan nutrition expert. Provide estimated nutritional facts for the given product in JSON format. Fields: name, brand, sugars (g), fat (g), proteins (g), salt (g), calories (kcal), additives (array of E-codes). All values per 100g. Focus on products available in the Moroccan market (Aicha, Dari, Centrale Danone, Bimo, Excelo, Henry's, etc) including snacks, chips, and biscuits."
          },
          {
            role: "user",
            content: `Product: ${name}`
          }
        ],
        response_format: { type: "json_object" }
      });

      const data = JSON.parse(response.choices[0].message.content || "{}");
      
      res.json({
        name: data.name || name,
        brand: data.brand || "AI Estimate",
        nutriments: {
          sugars: data.sugars || 0,
          fat: data.fat || 0,
          proteins: data.proteins || 0,
          salt: data.salt || 0,
        },
        calories: data.calories || 0,
        additives: data.additives || [],
        isAI: true
      });
    } catch (error) {
      console.error("AI Lookup error:", error);
      res.status(500).json({ message: "Failed to estimate product data" });
    }
  });

  return httpServer;
}
