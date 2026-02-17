import HomeForm from "./ui/HomeForm";
import Logs from "./ui/Logs";


export default function Page() {
  return <div>
    <HomeForm />
    <div className="mt-12 mx-auto w-full backdrop-blur-2xl bg-white/10 border border-white/20 rounded-lg shadow-2xl px-5 py-5">
      <h2 className="text-xl mb-3 text-slate-200 font-medium">Логи за неделю</h2>
      <Logs />
    </div>
  </div>;
}