import { Skeleton } from "@/components/ui/skeleton";

export function CampaignsListSkeleton() {
  return (
    <div className="w-full mt-8">
      <div className="border rounded-md">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <th key={i} className="p-4 text-left">
                  <Skeleton className="h-4 w-[100px]" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i} className="border-b">
                {[1, 2, 3, 4, 5, 6].map((j) => (
                  <td key={j} className="p-4">
                    <Skeleton className="h-4 w-[100px]" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
