"use client";

import { createContext, useContext } from "react";

/**
 * Resolves an assetId to a loadable URL. Absent by default, so the renderer
 * degrades to accessible placeholders until Phase 6 wires real asset storage
 * (see docs/implementation-plan.md Phase 6 and architecture.md section 10).
 */
export type AssetResolver = (assetId: string) => string | undefined;

const AssetResolverContext = createContext<AssetResolver | undefined>(undefined);

export const AssetResolverProvider = AssetResolverContext.Provider;

export function useAssetResolver(): AssetResolver {
  const resolver = useContext(AssetResolverContext);
  return resolver ?? (() => undefined);
}
