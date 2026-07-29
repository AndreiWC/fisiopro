import Link from "next/link";

export function LabelSubscription({ expired }: { expired: boolean }) {
  return (
    <div className="bg-red-400 text-white text-sm md:text-base px-3 py-2 my-4 rounded-md flex flex-col md:flex-row items-center md:items-center justify-between gap-1">
      <div>
        {expired ? (
          <h3 className="font-semibold">
            Seu plano expirou ou você não tem uma assinatura ativa!
          </h3>
        ) : (
          <h3 className="font-semibold">Você excedeu o limite do seu plano!</h3>
        )}
        <p className="text-sm text-gray-100">
          Acesse seu plano para verificar sua assinatura.
        </p>
      </div>
      <Link
        href="/dashboard/plans"
        className="bg-zinc-900 text-white px-3 py-1 rounded-md w-fit"
      >
        Renovar assinatura
      </Link>
    </div>
  );
}
