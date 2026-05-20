import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

export function useProduct(barcode: string | null) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: [api.products.lookup.path, barcode],
    queryFn: async () => {
      if (!barcode) return null;
      const url = buildUrl(api.products.lookup.path, { barcode });
      const res = await fetch(url, { credentials: "include" });
      
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch product");
      
      const data = api.products.lookup.responses[200].parse(await res.json());
      
      // Invalidate scan history so it updates in real-time
      queryClient.invalidateQueries({ queryKey: [api.profile.scans.path] });
      
      return data;
    },
    enabled: !!barcode,
  });
}
