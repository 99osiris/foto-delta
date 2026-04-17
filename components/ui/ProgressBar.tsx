export default function ProgressBar({ value }: { value: number }) {
  return (
    <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
      <div
        className="h-full bg-emerald-400 transition-all duration-200"
        style={{ width: `${Math.round(value)}%` }}
      />
    </div>
  )
}
