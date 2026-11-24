function BrandMark() {
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-white shadow-sm">
      <span aria-hidden="true" className="relative size-8 overflow-hidden">
        <span className="absolute left-[-16px] top-[-16px] size-16">
          <img
            src="/nexus-logo.png"
            alt=""
            className="size-full object-contain"
          />
        </span>
      </span>
    </span>
  )
}

export default BrandMark
