"use client";
import React, { useState, useEffect } from "react";
import { api } from "@/trpc/react";
import type { RouterInputs, RouterOutputs } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Search, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

// Options for dosage form
const DRUG_FORMS = [
  "Tablet",
  "Kapsül",
  "Süspansiyon",
  "Ampul",
  "Efervesan",
  "Damlalık",
  "Krem",
  "Jel",
  "Şurup",
] as const;

// Type-safe input types for create and update
type DrugCreateInput = RouterInputs["drug"]["create"];
type DrugUpdateInput = RouterInputs["drug"]["update"];
// Type-safe output type for drugs
type DrugListOutput = RouterOutputs["drug"]["list"];
type Drug = DrugListOutput["items"][number];

export default function DrugsPage() {
  const utils = api.useUtils();

  // List state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortField, setSortField] =
    useState<RouterInputs["drug"]["list"]["sortField"]>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [ingredientFilter, setIngredientFilter] = useState<string | undefined>(
    undefined,
  );
  // Create/Edit modal state and validation error
  const [isEditing, setIsEditing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  // Dispense modal state
  const [dispenseModal, setDispenseModal] = useState(false);
  const [dispenseForm, setDispenseForm] = useState<{
    drugId: number;
    packCount: number;
    leftoverUnits: number;
    unitsCount: number;
  }>({ drugId: 0, packCount: 0, leftoverUnits: 0, unitsCount: 1 });

  // debounce search
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(id);
  }, [search]);

  const listParams = {
    page,
    pageSize,
    sortField,
    sortOrder,
    search: debouncedSearch || undefined,
    ingredient: ingredientFilter,
  } as const;

  const listQuery = api.drug.list.useQuery(listParams);

  const createMutation = api.drug.create.useMutation({
    onSuccess: () => {
      utils.drug.list.invalidate();
      setShowModal(false);
    },
  });
  const updateMutation = api.drug.update.useMutation({
    onSuccess: () => {
      utils.drug.list.invalidate();
      setShowModal(false);
    },
  });
  const deleteMutation = api.drug.delete.useMutation({
    onSuccess: () => utils.drug.list.invalidate(),
  });

  // Initialize form with split stock (packs + units)
  const [form, setForm] = useState<
    Partial<DrugCreateInput> & {
      id?: number;
      packCount?: number;
      leftoverUnits?: number;
    }
  >({ isEmergency: false, packCount: 0, leftoverUnits: 0 });

  // Adjust units mutation for quick stock deduction
  const adjustUnitsMutation = api.drug.adjustUnits.useMutation({
    onSuccess: () => utils.drug.list.invalidate(),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Front‑end validation – ensure mandatory fields are filled
    if (
      !form.name ||
      !form.group ||
      !form.brand ||
      !(
        form.activeIngredients &&
        form.activeIngredients.filter((a) => a.trim()).length
      )
    ) {
      setFormError("Lütfen tüm zorunlu alanları doldurun.");
      return;
    }
    setFormError(null);

    // calculate total units from packs + leftover units with safe defaults
    const packNum = Number(form.packCount) || 0;
    const leftoverNum = Number(form.leftoverUnits) || 0;
    const perPack = Number(form.unitsCount) > 0 ? Number(form.unitsCount) : 1;
    const totalUnits = packNum * perPack + leftoverNum;
    const input: DrugCreateInput = {
      name: form.name!,
      group: form.group!,
      brand: form.brand!,
      activeIngredients: form.activeIngredients!.map((s) => s.trim()),
      dosage: form.dosage,
      form: form.form,
      expirationDate: form.expirationDate,
      unitsCount: form.unitsCount,
      unitsInStock: totalUnits,
      isEmergency: form.isEmergency ?? false,
    };
    if (isEditing && form.id != null) {
      const updateInput: DrugUpdateInput = {
        id: form.id,
        ...input,
      };
      updateMutation.mutate(updateInput);
    } else {
      createMutation.mutate(input);
    }
    setForm({ isEmergency: false, packCount: 0, leftoverUnits: 0 });
    setIsEditing(false);
  };

  const handleEdit = (drug: Drug) => {
    const ingredients = Array.isArray(drug.activeIngredients)
      ? (drug.activeIngredients as string[])
      : typeof drug.activeIngredients === "string"
        ? (JSON.parse(drug.activeIngredients) as string[])
        : [];

    const perPack = drug.unitsCount ?? 1;
    setForm({
      id: drug.id,
      name: drug.name,
      group: drug.group,
      brand: drug.brand,
      activeIngredients: ingredients,
      dosage: drug.dosage ?? undefined,
      form: drug.form ?? undefined,
      unitsCount: drug.unitsCount ?? undefined,
      unitsInStock: drug.unitsInStock,
      packCount: Math.floor(drug.unitsInStock / perPack),
      leftoverUnits: drug.unitsInStock % perPack,
      expirationDate: drug.expirationDate
        ? drug.expirationDate.toISOString().split("T")[0]
        : undefined,
      isEmergency: drug.isEmergency,
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate({ id });
  };

  // Helpers for sorting icons and toggling
  type SortField = RouterInputs["drug"]["list"]["sortField"];
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  const sortIcon = (field: SortField) => {
    if (sortField !== field) return "";
    return sortOrder === "asc" ? "▲" : "▼";
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="mb-4 text-3xl font-bold sm:mb-0">İlaç Stok Yönetimi</h1>
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              placeholder="Ara ilaç, grup, marka veya etken..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="focus:ring-primary w-64 rounded-md border border-gray-300 py-2 pr-3 pl-10 text-sm focus:ring-2 focus:outline-none"
            />
          </div>
          <Button
            onClick={() => {
              setForm({ isEmergency: false, activeIngredients: [""] });
              setIsEditing(false);
              setShowModal(true);
            }}
          >
            Yeni İlaç Ekle
          </Button>
          <div>
            <label htmlFor="pageSize" className="mr-2 text-sm">
              Sayfa başına:
            </label>
            <select
              id="pageSize"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="rounded border border-gray-300 px-2 py-1 text-sm"
            >
              {[20, 30, 50, 75, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      {showModal && (
        <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
          <div className="w-full max-w-lg rounded-lg bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {isEditing ? "İlacı Düzenle" : "Yeni İlaç Ekle"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            <form
              onSubmit={handleSubmit}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.preventDefault();
              }}
              className="space-y-4"
            >
              {formError && <p className="text-sm text-red-500">{formError}</p>}
              <label className="text-sm font-medium text-gray-700">
                İlaç Adı <span className="text-red-500">*</span>
              </label>
              <input
                required
                placeholder=""
                value={form.name ?? ""}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              />
              <label className="text-sm font-medium text-gray-700">
                Grup <span className="text-red-500">*</span>
              </label>
              <input
                required
                placeholder=""
                value={form.group ?? ""}
                onChange={(e) => setForm({ ...form, group: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              />
              <label className="text-sm font-medium text-gray-700">
                Marka <span className="text-red-500">*</span>
              </label>
              <input
                required
                placeholder=""
                value={form.brand ?? ""}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              />
              <div>
                <label className="mb-1 block">
                  Etken Maddeler <span className="text-red-500">*</span>
                </label>
                {(form.activeIngredients ?? []).map((ing, idx) => (
                  <div key={idx} className="mb-2 flex gap-2">
                    <input
                      value={ing}
                      onChange={(e) => {
                        const arr = [...(form.activeIngredients ?? [])];
                        arr[idx] = e.target.value;
                        setForm({ ...form, activeIngredients: arr });
                      }}
                      className="flex-1 rounded-md border border-gray-300 px-3 py-2"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const arr = [...(form.activeIngredients ?? [])];
                        arr.splice(idx, 1);
                        setForm({ ...form, activeIngredients: arr });
                      }}
                      className="text-red-500"
                    >
                      Sil
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setForm({
                      ...form,
                      activeIngredients: [
                        ...(form.activeIngredients ?? []),
                        "",
                      ],
                    });
                  }}
                  className="text-primary underline"
                >
                  Etken Madde Ekle
                </button>
              </div>
              <input
                placeholder="Dozaj (ör: 25mg/500mg)"
                value={form.dosage ?? ""}
                onChange={(e) => setForm({ ...form, dosage: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              />
              <label className="text-sm font-medium text-gray-700">
                İlaç Formu
              </label>
              <select
                value={form.form ?? ""}
                onChange={(e) => setForm({ ...form, form: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              >
                <option value="">Seçiniz</option>
                {DRUG_FORMS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Kutu Sayısı
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.packCount ?? 0}
                    onFocus={(e) => e.currentTarget.select()}
                    onChange={(e) =>
                      setForm({ ...form, packCount: Number(e.target.value) })
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Artak Birim
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.leftoverUnits ?? 0}
                    onFocus={(e) => e.currentTarget.select()}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        leftoverUnits: Number(e.target.value),
                      })
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>
              </div>
              <label className="text-sm font-medium text-gray-700">
                Adet (birim başına)
              </label>
              <input
                placeholder="Adet Sayısı"
                type="number"
                value={form.unitsCount?.toString() ?? ""}
                onFocus={(e) => e.currentTarget.select()}
                onChange={(e) =>
                  setForm({ ...form, unitsCount: Number(e.target.value) })
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              />
              <label className="text-sm font-medium text-gray-700">
                Son Kullanma Tarihi
              </label>
              <input
                placeholder="Son Kullanma Tarihi"
                type="date"
                value={form.expirationDate?.toString().split("T")[0] ?? ""}
                onChange={(e) =>
                  setForm({ ...form, expirationDate: e.target.value })
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              />
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isEmergency ?? false}
                  onChange={(e) =>
                    setForm({ ...form, isEmergency: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />{" "}
                Acil İlaç
              </label>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowModal(false)}>
                  İptal
                </Button>
                <Button type="submit">{isEditing ? "Güncelle" : "Ekle"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {ingredientFilter && (
        <div className="mb-4">
          <span className="bg-primary text-primary-foreground inline-flex items-center gap-1 rounded-sm px-2 py-1 text-xs">
            {ingredientFilter}
            <button
              onClick={() => {
                setIngredientFilter(undefined);
                setPage(1);
              }}
              className="ml-1"
            >
              ×
            </button>
          </span>
        </div>
      )}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-lg">
        <Table className="min-w-[800px] text-xs sm:text-sm">
          <TableHeader>
            <TableRow className="sticky top-0 border-b border-gray-200 bg-white">
              <TableHead
                onClick={() => toggleSort("name")}
                className="cursor-pointer px-4 py-3 font-medium text-gray-700 uppercase"
              >
                <div className="flex items-center justify-center gap-1">
                  Ad <ChevronsUpDown className="h-4 w-4 text-gray-400" />{" "}
                  {sortIcon("name")}
                </div>
              </TableHead>
              <TableHead
                onClick={() => toggleSort("group")}
                className="hidden cursor-pointer px-4 py-3 font-medium text-gray-700 uppercase sm:table-cell"
              >
                <div className="flex items-center justify-center gap-1">
                  Grup <ChevronsUpDown className="h-4 w-4 text-gray-400" />{" "}
                  {sortIcon("group")}
                </div>
              </TableHead>
              <TableHead className="px-4 py-3 font-medium text-gray-700 uppercase">
                Etken Madde
              </TableHead>
              <TableHead
                onClick={() => toggleSort("brand")}
                className="hidden cursor-pointer px-4 py-3 font-medium text-gray-700 uppercase sm:table-cell"
              >
                <div className="flex items-center justify-center gap-1">
                  Marka <ChevronsUpDown className="h-4 w-4 text-gray-400" />{" "}
                  {sortIcon("brand")}
                </div>
              </TableHead>
              <TableHead className="hidden px-4 py-3 font-medium text-gray-700 uppercase sm:table-cell">
                Dozaj
              </TableHead>
              <TableHead
                onClick={() => toggleSort("form")}
                className="hidden cursor-pointer px-4 py-3 font-medium text-gray-700 uppercase md:table-cell"
              >
                <div className="flex items-center justify-center gap-1">
                  Form <ChevronsUpDown className="h-4 w-4 text-gray-400" />{" "}
                  {sortIcon("form")}
                </div>
              </TableHead>
              <TableHead className="hidden px-4 py-3 font-medium text-gray-700 uppercase md:table-cell">
                Birim Adet
              </TableHead>
              <TableHead
                onClick={() => toggleSort("unitsInStock")}
                className="hidden cursor-pointer px-4 py-3 font-medium text-gray-700 uppercase sm:table-cell"
              >
                <div className="flex items-center justify-center gap-1">
                  Stok <ChevronsUpDown className="h-4 w-4 text-gray-400" />{" "}
                  {sortIcon("unitsInStock")}
                </div>
              </TableHead>
              <TableHead
                onClick={() => toggleSort("expirationDate")}
                className="hidden cursor-pointer px-4 py-3 font-medium text-gray-700 uppercase md:table-cell"
              >
                <div className="flex items-center justify-center gap-1">
                  SKT <ChevronsUpDown className="h-4 w-4 text-gray-400" />{" "}
                  {sortIcon("expirationDate")}
                </div>
              </TableHead>
              <TableHead className="hidden px-4 py-3 font-medium text-gray-700 uppercase lg:table-cell">
                Acil
              </TableHead>
              <TableHead className="px-4 py-3 font-medium text-gray-700 uppercase">
                İşlemler
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listQuery.data?.items.map((drug) => (
              <TableRow
                key={drug.id}
                className={cn(
                  "cursor-pointer transition-colors hover:bg-gray-100",
                  drug.unitsCount != null &&
                    Math.floor(drug.unitsInStock / drug.unitsCount) < 5
                    ? "bg-red-100"
                    : "even:bg-gray-50",
                )}
              >
                <TableCell className="px-4 py-3">{drug.name}</TableCell>
                <TableCell className="hidden px-4 py-3 sm:table-cell">
                  {drug.group}
                </TableCell>
                <TableCell className="flex flex-wrap justify-center gap-1 px-4 py-3">
                  {(drug.activeIngredients as string[]).map((ing) => {
                    // Generate color based on string hash
                    const hash = Array.from(ing).reduce(
                      (h, c) => h + c.charCodeAt(0),
                      0,
                    );
                    const colors = [
                      "bg-red-50 text-red-800",
                      "bg-orange-50 text-orange-800",
                      "bg-amber-50 text-amber-800",
                      "bg-yellow-50 text-yellow-800",
                      "bg-lime-50 text-lime-800",
                      "bg-green-50 text-green-800",
                      "bg-emerald-50 text-emerald-800",
                      "bg-teal-50 text-teal-800",
                      "bg-cyan-50 text-cyan-800",
                      "bg-sky-50 text-sky-800",
                      "bg-blue-50 text-blue-800",
                      "bg-indigo-50 text-indigo-800",
                      "bg-violet-50 text-violet-800",
                      "bg-purple-50 text-purple-800",
                      "bg-pink-50 text-pink-800",
                      "bg-rose-50 text-rose-800",
                    ];
                    const cls = colors[hash % colors.length];
                    return (
                      <span
                        key={ing}
                        onClick={() => {
                          setIngredientFilter(ing);
                          setPage(1);
                        }}
                        className={cn(
                          "cursor-pointer rounded px-2 py-1 text-xs font-medium",
                          cls,
                          ingredientFilter === ing && "ring-primary ring-1",
                        )}
                      >
                        {ing}
                      </span>
                    );
                  })}
                </TableCell>
                <TableCell className="hidden border-b border-gray-200 px-4 py-3 sm:table-cell">
                  {drug.brand}
                </TableCell>
                <TableCell className="hidden border-b border-gray-200 px-4 py-3 sm:table-cell">
                  {drug.dosage ?? "-"}
                </TableCell>
                <TableCell className="hidden border-b border-gray-200 px-4 py-3 md:table-cell">
                  {drug.form ?? "-"}
                </TableCell>
                <TableCell className="hidden border-b border-gray-200 px-4 py-3 md:table-cell">
                  {drug.unitsCount ?? "-"}
                </TableCell>
                <TableCell className="hidden border-b border-gray-200 px-4 py-3 sm:table-cell">
                  {drug.unitsCount
                    ? `${Math.floor(drug.unitsInStock / drug.unitsCount)} kutu + ${drug.unitsInStock % drug.unitsCount} adet`
                    : drug.unitsInStock}
                </TableCell>
                <TableCell
                  className={cn(
                    "hidden border-b border-gray-200 px-4 py-3 md:table-cell",
                    drug.expirationDate &&
                      (() => {
                        const exp = new Date(drug.expirationDate);
                        const now = new Date();
                        return (
                          exp.getFullYear() < now.getFullYear() ||
                          (exp.getFullYear() === now.getFullYear() &&
                            exp.getMonth() < now.getMonth())
                        );
                      })() &&
                      "bg-red-200 text-red-800",
                  )}
                >
                  {drug.expirationDate
                    ? new Date(drug.expirationDate).toLocaleDateString(
                        undefined,
                        { year: "numeric", month: "2-digit", day: "2-digit" },
                      )
                    : "-"}
                </TableCell>
                <TableCell className="hidden border-b border-gray-200 px-4 py-3 lg:table-cell">
                  {drug.isEmergency ? "Evet" : "Hayır"}
                </TableCell>
                <TableCell className="px-4 py-3">
                  <div className="flex h-full items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(drug)}
                    >
                      Düzenle
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (confirm("Silmek istediğinize emin misiniz?")) {
                          handleDelete(drug.id);
                        }
                      }}
                    >
                      Sil
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setDispenseForm({
                          drugId: drug.id,
                          packCount: 0,
                          leftoverUnits: 0,
                          unitsCount: drug.unitsCount ?? 1,
                        });
                        setDispenseModal(true);
                      }}
                    >
                      Stok Düşür
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Dispense Modal */}
      {dispenseModal && (
        <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold">Stok Düşür</h2>
            <div className="mb-4 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium">Kutu Sayısı</label>
                <input
                  type="number"
                  min={0}
                  value={dispenseForm.packCount}
                  onFocus={(e) => e.currentTarget.select()}
                  onChange={(e) =>
                    setDispenseForm({
                      ...dispenseForm,
                      packCount: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Artak Birim</label>
                <input
                  type="number"
                  min={0}
                  value={dispenseForm.leftoverUnits}
                  onFocus={(e) => e.currentTarget.select()}
                  onChange={(e) =>
                    setDispenseForm({
                      ...dispenseForm,
                      leftoverUnits: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDispenseModal(false)}>
                İptal
              </Button>
              <Button
                onClick={() => {
                  const delta = -(
                    dispenseForm.packCount * dispenseForm.unitsCount +
                    dispenseForm.leftoverUnits
                  );
                  adjustUnitsMutation.mutate({
                    drugId: dispenseForm.drugId,
                    delta,
                    reason: "dispense",
                  });
                  setDispenseModal(false);
                }}
              >
                Onayla
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Pagination */}
      {listQuery.data && (
        <div className="mt-4 flex items-center justify-center gap-4 text-sm">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Önceki
          </Button>
          <span>
            Sayfa {page} / {Math.ceil(listQuery.data.total / pageSize)}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page * pageSize >= listQuery.data.total}
            onClick={() => setPage((p) => p + 1)}
          >
            Sonraki
          </Button>
        </div>
      )}
    </div>
  );
}
