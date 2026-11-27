function DirectorPageHeader({ title, description, action }) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-violet-600">
          Director workspace
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{title}</h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
        )}
      </div>
      {action}
    </header>
  )
}

export default DirectorPageHeader
