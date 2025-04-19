"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function Nav() {
  const { data: session } = useSession();
  return (
    <div className="flex items-center space-x-4">
      <Link href="/" className="text-gray-600 hover:text-gray-800">
        Anasayfa
      </Link>
      {session?.user && (
        <>
          <Link href="/drugs" className="text-gray-600 hover:text-gray-800">
            Stok Yönetimi
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="text-gray-600 hover:text-gray-800"
          >
            Çıkış Yap
          </button>
        </>
      )}
    </div>
  );
}
