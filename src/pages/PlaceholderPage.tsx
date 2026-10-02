import DashboardLayout from "@/components/layout/DashboardLayout";
import { useLocation } from "react-router-dom";

interface PlaceholderPageProps {
  title: string;
  description: string;
}

const PlaceholderPage = ({ title, description }: PlaceholderPageProps) => {
  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      <div className="stat-card flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <p className="text-lg font-semibold font-heading text-muted-foreground">Coming Soon</p>
          <p className="text-sm text-muted-foreground mt-1">This module is under development.</p>
        </div>
      </div>
    </div>
  );
};

export default PlaceholderPage;
