import { CompareView } from "@/components/CompareView";

export const metadata = { title: "Compare — AirQ India" };

export default function ComparePage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Compare stations</h1>
        <p className="text-sm text-muted-foreground">
          Put two monitoring stations side by side.
        </p>
      </div>
      <CompareView />
    </div>
  );
}
