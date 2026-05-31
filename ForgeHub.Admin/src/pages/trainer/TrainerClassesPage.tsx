import { classesApi } from "../../api/classesApi";
import { EntityPage } from "../shared/EntityPage";
import type { GymClass } from "../../types/class";
export function TrainerClassesPage() { return <EntityPage<GymClass> title="My Classes" loader={classesApi.getClasses} columns={[{ key: "name", label: "Class" }, { key: "time", label: "Time" }, { key: "capacity", label: "Capacity" }, { key: "booked", label: "Booked" }, { key: "status", label: "Status", badge: true }]} />; }
