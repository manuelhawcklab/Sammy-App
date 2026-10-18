import { useState } from "react";
import { CalendarDays, ClipboardList, FolderOpen } from "lucide-react";
import type { User } from "../../lib/db";
import type { Page } from "../../App";
import { Segmented } from "../../components/ui";
import SchedulePage from "../Schedule";
import MaterialsPage from "../Materials";
import ProgressPage from "../Progress";

export default function ContentPage({ me, go }: { me: User; go: (p: Page) => void }) {
  const [tab, setTab] = useState<"schedule" | "materials" | "progress">("schedule");
  return (
    <div>
      <div className="mb-6">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: "schedule", label: "Horarios", icon: <CalendarDays size={15} /> },
            { value: "materials", label: "Materiales", icon: <FolderOpen size={15} /> },
            { value: "progress", label: "Avances", icon: <ClipboardList size={15} /> },
          ]}
        />
      </div>
      {tab === "schedule" ? (
        <SchedulePage me={me} go={go} />
      ) : tab === "materials" ? (
        <MaterialsPage me={me} go={go} />
      ) : (
        <ProgressPage me={me} go={go} />
      )}
    </div>
  );
}
