import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen p-6">
      <section className="mx-auto max-w-7xl rounded-[2rem] bg-ovicore-emerald p-8 text-white shadow-2xl">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-100">
          OviCore Next
        </p>
        <h1 className="mt-3 max-w-4xl text-5xl font-black tracking-[-0.07em]">
          Breeder, hatchery and broiler planning starts here.
        </h1>
        <p className="mt-4 max-w-3xl text-emerald-100">
          This starter puts flock planning first, then connects breeder
          production, hatch egg forecasts, chick availability and broiler
          placement demand.
        </p>
        <Link
          href="/planning"
          className="mt-7 inline-flex rounded-2xl bg-white px-5 py-3 font-black text-ovicore-emerald"
        >
          Open flock planning
        </Link>
      </section>
    </main>
  );
}
