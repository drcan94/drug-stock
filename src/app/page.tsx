import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/server/auth";
import { createCaller } from "@/server/api/root";
import { createTRPCContext } from "@/server/api/trpc";
import { HydrateClient } from "@/trpc/server";

export default async function Home() {
  const session = await auth();
  let stats: {
    totalUnits: number;
    totalDrugs: number;
    groupSummary: { group: string; drugCount: number; unitCount: number }[];
  } | null = null;
  if (session?.user) {
    const h = await headers();
    const globalHeaders = h as unknown as Headers;
    const ctx = await createTRPCContext({ headers: globalHeaders });
    const caller = createCaller(ctx);
    stats = await caller.drug.stats();
  }

  return (
    <HydrateClient>
      <section className="flex flex-col items-center justify-center px-4 py-20 text-center">
        <div className="w-full max-w-3xl px-4">
          <div className="mx-auto w-full max-w-3xl rounded-2xl border border-white/20 bg-white/10 p-8 shadow-lg backdrop-blur-lg">
            <h1 className="mb-4 text-4xl font-bold text-gray-800 sm:text-5xl">
              DrugStock
            </h1>
            <p className="mb-8 max-w-xl text-lg text-gray-600 sm:text-xl">
              Local ilaç stok yönetim aracınıza hoş geldiniz. Güvenli ve hızlı
              stok işlemleri sizi bekliyor.
            </p>
            {session?.user ? (
              <>
                {stats && (
                  <div className="mb-8 w-full max-w-xl text-left">
                    <h2 className="mb-4 text-2xl font-semibold">
                      İstatistikler
                    </h2>
                    <ul className="space-y-2">
                      <li>
                        Toplam birim sayısı: <strong>{stats.totalUnits}</strong>
                      </li>
                      <li>
                        Farklı ilaç sayısı: <strong>{stats.totalDrugs}</strong>
                      </li>
                    </ul>
                    <h3 className="mt-4 text-xl font-medium">Grup Bazlı</h3>
                    <table className="mt-2 w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="py-1 text-left">Grup</th>
                          <th className="py-1 text-right">Grupda İlaç Adedi</th>
                          <th className="py-1 text-right">Toplam Birim</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.groupSummary.map((g) => (
                          <tr key={g.group} className="hover:bg-gray-100">
                            <td className="py-1">{g.group}</td>
                            <td className="py-1 text-right">{g.drugCount}</td>
                            <td className="py-1 text-right">{g.unitCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <Link
                  href="/drugs"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 mt-6 inline-block rounded-md px-6 py-3 text-lg font-medium transition"
                >
                  Stok Yönetimine Git
                </Link>
              </>
            ) : (
              <Link
                href="/signin?callbackUrl=/drugs"
                className="bg-primary text-primary-foreground hover:bg-primary/90 inline-block rounded-md px-6 py-3 text-lg font-medium transition"
              >
                Giriş Yap
              </Link>
            )}
          </div>
        </div>
      </section>
    </HydrateClient>
  );
}
