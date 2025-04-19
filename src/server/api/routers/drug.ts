import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const drugRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(10),
        search: z.string().optional(),
        sortField: z
          .enum([
            "name",
            "group",
            "brand",
            "form",
            "unitsInStock",
            "expirationDate",
          ])
          .default("name"),
        sortOrder: z.enum(["asc", "desc"]).default("asc"),
        ingredient: z.string().optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      // Fetch all records and apply JS filtering for search and ingredient
      const all = await ctx.db.drug.findMany();
      let filtered = all;
      // Text search across name, brand, group, form, or ingredients
      if (input.search) {
        const term = input.search.toLowerCase();
        filtered = filtered.filter((d) => {
          const fields = [d.name, d.brand, d.group, d.form || ""].map((f) =>
            f.toLowerCase(),
          );
          const matchField = fields.some((f) => f.includes(term));
          // Parse JSON ingredients
          let ings: string[] = [];
          if (Array.isArray(d.activeIngredients))
            ings = d.activeIngredients as string[];
          else if (typeof d.activeIngredients === "string") {
            try {
              ings = JSON.parse(d.activeIngredients);
            } catch {}
          }
          const matchIng = ings.some((i) => i.toLowerCase().includes(term));
          return matchField || matchIng;
        });
      }
      // Exact ingredient filter
      if (input.ingredient) {
        filtered = filtered.filter((d) => {
          let ings: string[] = [];
          if (Array.isArray(d.activeIngredients))
            ings = d.activeIngredients as string[];
          else if (typeof d.activeIngredients === "string") {
            try {
              ings = JSON.parse(d.activeIngredients);
            } catch {}
          }
          return ings.includes(input.ingredient!);
        });
      }
      // JS sort (strings, numbers, and dates)
      const order = input.sortOrder === "asc" ? 1 : -1;
      filtered.sort((a, b) => {
        switch (input.sortField) {
          case "name":
            return a.name.localeCompare(b.name) * order;
          case "group":
            return a.group.localeCompare(b.group) * order;
          case "brand":
            return a.brand.localeCompare(b.brand) * order;
          case "form":
            return (a.form ?? "").localeCompare(b.form ?? "") * order;
          case "unitsInStock":
            return (a.unitsInStock - b.unitsInStock) * order;
          case "expirationDate": {
            const aTime = a.expirationDate ? a.expirationDate.getTime() : 0;
            const bTime = b.expirationDate ? b.expirationDate.getTime() : 0;
            return (aTime - bTime) * order;
          }
          default:
            return 0;
        }
      });
      // Pagination
      const total = filtered.length;
      const skip = (input.page - 1) * input.pageSize;
      const items = filtered.slice(skip, skip + input.pageSize);
      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        group: z.string(),
        brand: z.string(),
        activeIngredients: z.array(z.string()),
        dosage: z.string().optional(),
        form: z.string().optional(),
        unitsCount: z.number().optional(),
        expirationDate: z.string().optional(),
        unitsInStock: z.number(),
        isEmergency: z.boolean().optional().default(false),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const data: any = { ...input };
      if (input.expirationDate)
        data.expirationDate = new Date(input.expirationDate);
      // Create the Drug and log initial stock transaction
      const drug = await ctx.db.drug.create({ data });
      await ctx.db.stockTransaction.create({
        data: {
          drugId: drug.id,
          delta: input.unitsInStock,
          reason: "initial stock",
        },
      });
      return drug;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string(),
        group: z.string(),
        brand: z.string(),
        activeIngredients: z.array(z.string()),
        dosage: z.string().optional(),
        form: z.string().optional(),
        unitsCount: z.number().optional(),
        expirationDate: z.string().optional(),
        unitsInStock: z.number(),
        isEmergency: z.boolean().optional().default(false),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { id, expirationDate, ...rest } = input;
      const data: any = { ...rest };
      if (expirationDate) data.expirationDate = new Date(expirationDate);
      // Log stock change if unitsInStock differs
      const prev = await ctx.db.drug.findUnique({ where: { id } });
      if (prev && prev.unitsInStock !== input.unitsInStock) {
        await ctx.db.stockTransaction.create({
          data: {
            drugId: id,
            delta: input.unitsInStock - prev.unitsInStock,
            reason: "update stock",
          },
        });
      }
      return ctx.db.drug.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      return ctx.db.drug.delete({ where: { id: input.id } });
    }),

  adjustUnits: protectedProcedure
    .input(
      z.object({
        drugId: z.number(),
        delta: z.number(),
        reason: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // record the transaction
      await ctx.db.stockTransaction.create({ data: input });
      // update the stock
      return ctx.db.drug.update({
        where: { id: input.drugId },
        data: { unitsInStock: { increment: input.delta } },
      });
    }),

  // Returns overall and per-group stock statistics
  stats: protectedProcedure.query(async ({ ctx }) => {
    const all = await ctx.db.drug.findMany();
    const totalUnits = all.reduce((sum, d) => sum + d.unitsInStock, 0);
    const totalDrugs = all.length;
    const map = new Map<string, { drugCount: number; unitCount: number }>();
    all.forEach((d) => {
      const grp = d.group;
      const entry = map.get(grp) ?? { drugCount: 0, unitCount: 0 };
      entry.drugCount++;
      entry.unitCount += d.unitsInStock;
      map.set(grp, entry);
    });
    const groupSummary = Array.from(map.entries()).map(
      ([group, { drugCount, unitCount }]) => ({ group, drugCount, unitCount }),
    );
    return { totalUnits, totalDrugs, groupSummary };
  }),
});
