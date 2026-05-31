import { Card } from "../../components/ui/Card";
import { PageHeader } from "../../components/ui/PageHeader";
import { useAuth } from "../../hooks/useAuth";
export function TrainerProfilePage() { const { session } = useAuth(); return <><PageHeader title="Profile" /><Card><p className="font-bold">{session?.user.fullName}</p><p className="text-forge-muted">{session?.user.email}</p></Card></>; }
