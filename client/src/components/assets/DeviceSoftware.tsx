import * as React from "react";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

type Props = {
  assetId: string;   // our ITAM asset id for the device
  tenantId: string;  // current tenant (from auth/session)
};

// "system" publishers to ignore by default
const DEFAULT_IGNORES = [
  "Apple",
  "Microsoft",
  "Intel",
  "Dell",
  "HP",
  "Adobe Systems, Inc. (system)",
];

export function DeviceSoftware({ assetId, tenantId }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [hideVendors, setHideVendors] = useState(true);
  const [ignorePublishers, setIgnorePublishers] = useState<string[]>(DEFAULT_IGNORES);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  // Fetch software list for this device (our server -> OA)
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["deviceSoftware", assetId],
    queryFn: async () => {
      const r = await fetch(`/api/assets/${assetId}/software`);
      const text = await r.text();
      if (!r.ok) {
        try {
          const j = JSON.parse(text);
          throw new Error(j.details || j.error || text || "Failed to load software");
        } catch {
          throw new Error(text || "Failed to load software");
        }
      }
      return JSON.parse(text) as {
        items: Array<{ name: string; version?: string | null; publisher?: string | null }>;
      };
    },
  });

  // Filter + de-duplicate
  const items = useMemo(() => {
    let arr = data?.items ?? [];

    if (hideVendors) {
      const ignoresLower = ignorePublishers.map((p) => p.toLowerCase());
      arr = arr.filter(
        (x) => !x.publisher || !ignoresLower.some((p) => x.publisher!.toLowerCase().includes(p))
      );
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter(
        (x) =>
          x.name?.toLowerCase().includes(q) ||
          x.publisher?.toLowerCase().includes(q) ||
          (x.version ?? "").toLowerCase().includes(q)
      );
    }

    // remove empties & duplicates (by name+version)
    const key = (x: any) => `${x.name}__${x.version ?? ""}`.toLowerCase();
    const seen = new Set<string>();
    const dedup: typeof arr = [];
    for (const it of arr) {
      if (!it.name) continue;
      const k = key(it);
      if (seen.has(k)) continue;
      seen.add(k);
      dedup.push(it);
    }
    return dedup.sort((a, b) => a.name.localeCompare(b.name));
  }, [data, hideVendors, ignorePublishers, search]);

  const importMutation = useMutation({
    mutationFn: async (payload: { tenantId: string; deviceAssetId?: string; items: any[] }) => {
      const r = await fetch(`/api/software/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    onSuccess: (resp) => {
      toast({
        title: "Imported",
        description: `Added ${resp.created} app(s) to Software inventory.`,
      });
      // If you cache a Software page list under ["assets","Software"], refresh it:
      qc.invalidateQueries({ queryKey: ["assets", "Software"] });
    },
    onError: (e: any) => {
      toast({
        title: "Import failed",
        description: e?.message ?? "Unknown error",
        variant: "destructive",
      });
    },
  });

  const toggle = (key: string) =>
    setSelected((s) => ({ ...s, [key]: !s[key] }));

  const selectedItems = useMemo(() => {
    const map = new Map<string, any>();
    for (const it of items) {
      const k = `${it.name}__${it.version ?? ""}`;
      if (selected[k]) map.set(k, it);
    }
    return Array.from(map.values());
  }, [items, selected]);

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading software…</div>;
  }

  if (isError) {
    const msg = error instanceof Error ? error.message : "Failed to load software";
    return (
      <div className="space-y-2">
        <div className="text-sm text-red-500">
          Failed to load software: {msg}
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    // constrain the modal content height so the list can scroll
    <div className="space-y-3 w-full max-w-3xl max-h-[80vh] overflow-auto">
      <div className="flex items-center gap-2">
        <input
          className="border rounded px-2 py-1 text-sm w-60"
          placeholder="Search name / publisher / version"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={hideVendors}
            onCheckedChange={(v) => setHideVendors(Boolean(v))}
          />
          Hide system vendors
        </label>
      </div>

      {/* scrollable table area */}
      <div className="rounded-md border max-h-[60vh] overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 sticky top-0">
            <tr>
              <th className="text-left p-2 w-8"></th>
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2">Version</th>
              <th className="text-left p-2">Publisher</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => {
              const key = `${it.name}__${it.version ?? ""}`;
              return (
                <tr key={key} className="border-t">
                  <td className="p-2">
                    <Checkbox
                      checked={!!selected[key]}
                      onCheckedChange={() => toggle(key)}
                    />
                  </td>
                  <td className="p-2">{it.name}</td>
                  <td className="p-2">{it.version ?? "-"}</td>
                  <td className="p-2">{it.publisher ?? "-"}</td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-muted-foreground">
                  No user-installed software found (filtered).
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* sticky action bar so buttons stay visible */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t px-2 py-3 flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {selectedItems.length} selected
        </div>
        <Button
          size="sm"
          onClick={() =>
            importMutation.mutate({
              tenantId,
              deviceAssetId: assetId,
              items: selectedItems.map((x) => ({
                name: x.name,
                version: x.version ?? null,
                publisher: x.publisher ?? null,
              })),
            })
          }
          disabled={selectedItems.length === 0 || importMutation.isPending}
        >
          Add to Software Inventory
        </Button>
      </div>
    </div>
  );
}
