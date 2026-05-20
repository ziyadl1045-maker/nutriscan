import { z } from 'zod';
import { users } from './models/auth';
import { scanHistory } from './models/chat';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  profile: {
    update: {
      method: 'PATCH' as const,
      path: '/api/profile',
      input: z.object({
        age: z.number().min(0).max(120).optional(),
        gender: z.string().optional(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        dietaryPreferences: z.array(z.string()).optional(),
      }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.internal, // Unauthorized
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/profile',
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.internal,
      },
    },
    scans: {
      method: 'GET' as const,
      path: '/api/profile/scans',
      responses: {
        200: z.array(z.custom<typeof scanHistory.$inferSelect>()),
        401: errorSchemas.internal,
      },
    },
  },
  products: {
    lookup: {
      method: 'GET' as const,
      path: '/api/products/:barcode',
      responses: {
        200: z.object({
          name: z.string(),
          brand: z.string().optional(),
          nutriments: z.record(z.any()).optional(),
          additives: z.array(z.string()).optional(),
          calories: z.number().nullable().optional(),
          image_url: z.string().nullable().optional(),
          isAI: z.boolean().optional(),
          healthScore: z.number().nullable().optional(),
          nutriscore: z.string().nullable().optional(),
          serving_quantity: z.number().nullable().optional(),
          isMoroccan: z.boolean().optional(),
          isHalalCertified: z.boolean().optional(),
          localDbMatch: z.boolean().optional(),
          alternatives: z.array(z.object({
            name: z.string(),
            brand: z.string().nullable().optional(),
            healthScore: z.number().nullable().optional(),
            reason: z.string().nullable().optional(),
          })).optional(),
          dietWarnings: z.array(z.string()).optional(),
        }),
        404: errorSchemas.notFound,
      },
    },
    aiLookup: {
      method: 'POST' as const,
      path: '/api/products/ai-lookup',
      input: z.object({
        name: z.string(),
      }),
      responses: {
        200: z.object({
          name: z.string(),
          brand: z.string().nullable().optional(),
          nutriments: z.record(z.any()).optional(),
          additives: z.array(z.string()).optional(),
          calories: z.number().nullable().optional(),
          image_url: z.string().nullable().optional(),
          isAI: z.boolean().optional(),
          healthScore: z.number().nullable().optional(),
          nutriscore: z.string().nullable().optional(),
          serving_quantity: z.number().nullable().optional(),
          isMoroccan: z.boolean().optional(),
          isHalalCertified: z.boolean().optional(),
          localDbMatch: z.boolean().optional(),
          alternatives: z.array(z.object({
            name: z.string(),
            brand: z.string().nullable().optional(),
            healthScore: z.number().nullable().optional(),
            reason: z.string().nullable().optional(),
          })).optional(),
          dietWarnings: z.array(z.string()).optional(),
        }),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
