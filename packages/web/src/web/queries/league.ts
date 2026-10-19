import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orpc } from "../lib/api";
export function useLeague() {
  return useQuery(orpc.league.get.queryOptions({ staleTime: 15000, refetchOnWindowFocus: true }));
}
export function useAccess() {
  return useQuery(orpc.league.access.queryOptions({ staleTime: 0 }));
}
export function useSaveLeague() {
  const cache = useQueryClient();
  return useMutation(
    orpc.league.save.mutationOptions({
      onSuccess: () => cache.invalidateQueries({ queryKey: orpc.league.key() }),
    }),
  );
}
export type LeagueData = NonNullable<ReturnType<typeof useLeague>["data"]>;
export type Team = LeagueData["teams"][number];
