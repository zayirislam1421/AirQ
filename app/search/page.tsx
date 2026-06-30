import { StationSearch } from "@/components/StationSearch";

export const metadata = { title: "Search — AirQ India" };

export default function SearchPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">Search stations</h1>
      <StationSearch />
    </div>
  );
}
