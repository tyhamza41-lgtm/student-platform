import { Card } from '../../../components/ui'

function WelcomeSection({ student }) {
  const formattedDate = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())

  return (
    <Card
      padding="none"
      className="relative isolate min-h-[190px] overflow-hidden rounded-2xl border-slate-200/75 bg-slate-900 bg-cover bg-[center_52%] p-6 shadow-[0_8px_24px_rgba(15,23,42,0.035)] sm:min-h-[206px] sm:p-8"
      style={{ backgroundImage: 'url("/ofppt-building.jpg")' }}
    >
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/60 to-slate-950/20" />
      <div className="relative z-10">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/80">
            {formattedDate}
          </p>
          <h1 className="mt-2 text-[23px] font-bold leading-tight tracking-[-0.025em] text-white sm:text-[28px]">
            Welcome back, {student.name}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/85">
            Here is what is happening in your class and across campus today.
          </p>
        </div>
      </div>
    </Card>
  )
}

export default WelcomeSection
