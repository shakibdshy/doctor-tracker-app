"use client";

import { StatCard } from "@doctor-tracker-app/ui/components/stat-card";
import { StethoscopeIcon, UserPlusIcon, UsersIcon, UserXIcon } from "lucide-react";

// Sample values — the live KPIs arrive with the analytics dashboard ticket
// (#7). This demonstrates the shared StatCard building block.
export default function Dashboard() {
  return (
    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Total doctors"
        value="24"
        hint="Across 4 hospitals"
        icon={StethoscopeIcon}
      />
      <StatCard
        label="Total patients"
        value="912"
        hint="+63 this month"
        icon={UsersIcon}
      />
      <StatCard
        label="Unassigned patients"
        value="17"
        hint="Waiting for a doctor"
        icon={UserXIcon}
      />
      <StatCard
        label="New this month"
        value="63"
        hint="Patient intake"
        icon={UserPlusIcon}
      />
    </div>
  );
}
