export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-7 w-36 bg-gray-200 rounded" />
      <div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_,i)=><div key={i} className="h-24 bg-gray-100 rounded-xl"/>)}</div>
      <div className="h-64 bg-gray-100 rounded-xl" />
      <div className="grid grid-cols-2 gap-4"><div className="h-56 bg-gray-100 rounded-xl"/><div className="h-56 bg-gray-100 rounded-xl"/></div>
    </div>
  )
}
