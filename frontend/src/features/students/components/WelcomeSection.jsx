import { Avatar, Card } from '../../../components/ui'

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
      className="overflow-hidden rounded-2xl border-slate-200/75 bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.035)] sm:p-7"
    >
      <div className="flex items-center justify-between gap-5">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
            {formattedDate}
          </p>
          <h1 className="mt-2 text-[23px] font-bold leading-tight tracking-[-0.025em] text-slate-950 sm:text-[28px]">
            Welcome back, {student.name}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
            Here is what is happening in your class and across campus today.
          </p>
        </div>
        <div className="hidden shrink-0 sm:block">
          <Avatar
            src={student.avatarUrl}
            name={student.name}
            alt={`${student.name} profile`}
            size="lg"
            status="online"
          />
        </div>
      </div>
    </Card>
  )
}

export default WelcomeSection
