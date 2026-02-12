import HomeForm from "./ui/HomeForm";
import Logs from "./ui/Logs";


export default function Page() {
  return <div>
    <HomeForm />
    <div className="logs-container mx-20">
      <h2 className="text-xl mb-2">Логи за неделю:</h2>
      <Logs />
    </div>
  </div>;
}