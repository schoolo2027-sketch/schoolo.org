import { Construction } from "lucide-react";

const PlaceholderTab = ({ title, description }: { title: string; description?: string }) => (
  <div className="bg-card border rounded-xl p-12 text-center">
    <Construction className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
    <h3 className="font-semibold text-lg">{title}</h3>
    <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2">
      {description || "This module is part of the Payment & Accounts rollout and will be enabled in the next phase."}
    </p>
  </div>
);

export default PlaceholderTab;
