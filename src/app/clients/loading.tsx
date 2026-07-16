export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 bg-gray-100 rounded animate-pulse" />
        <div className="h-9 w-28 bg-gray-100 rounded animate-pulse" />
      </div>
      <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
      <div className="space-y-2">
        {[...Array(6)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}
      </div>
    </div>
  )
}
