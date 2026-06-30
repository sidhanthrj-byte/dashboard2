export default function Loading() {
  return (
    <div className="flex gap-6 animate-pulse">
      <div className="w-52 h-80 bg-gray-100 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-4">
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_,i) => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
        </div>
        <div className="h-64 bg-gray-100 rounded-xl" />
        <div className="h-48 bg-gray-100 rounded-xl" />
      </div>
    </div>
  )
}
