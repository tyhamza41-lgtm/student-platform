import { Camera } from 'lucide-react'
import { Avatar, Badge, Card } from '../../../components/ui'
import { getUserRoleLabel } from '../../../constants/navigation'
import { USER_ROLES } from '../../../constants/roles'

function ProfileDetails({
  profile,
  headingLevel = 2,
  avatarUrl = profile.avatarUrl,
  onChangePhoto,
  photoInputRef,
  onPhotoChange,
  photoError,
  processingPhoto = false,
}) {
  const classGroup = profile.classGroup
  const NameHeading = `h${headingLevel}`

  return (
    <Card padding="lg" className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left">
      {onChangePhoto ? (
        <div className="flex shrink-0 flex-col items-center gap-2">
          <button
            type="button"
            aria-label="Change profile picture"
            onClick={onChangePhoto}
            disabled={processingPhoto}
            className="group relative block size-20 shrink-0 overflow-hidden rounded-full p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
          >
            <Avatar src={avatarUrl} name={profile.name} alt="" size="xl" />
            <span className="profile-photo-change-overlay absolute inset-0 hidden items-center justify-center gap-1 bg-slate-950/65 text-center text-xs font-semibold text-white group-hover:flex group-focus-visible:flex">
              <Camera size={15} aria-hidden="true" />
              Change photo
            </span>
            <span className="profile-photo-camera-badge absolute bottom-0.5 right-0.5 hidden size-7 items-center justify-center rounded-full border-2 border-white bg-violet-600 text-white">
              <Camera size={14} aria-hidden="true" />
            </span>
          </button>
          <input
            ref={photoInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            aria-label="Choose profile picture"
            className="hidden"
            onChange={onPhotoChange}
          />
          {photoError && (
            <p role="alert" className="max-w-40 text-center text-xs leading-5 text-red-700">
              {photoError}
            </p>
          )}
        </div>
      ) : (
        <Avatar src={avatarUrl} name={profile.name} alt={`${profile.name} profile`} size="xl" />
      )}
      <div className="mt-4 min-w-0 space-y-3 sm:ml-5 sm:mt-1">
        <div>
          <NameHeading className="text-2xl font-bold tracking-tight text-slate-950">{profile.name}</NameHeading>
          <Badge variant="outline" className="mt-2">{getUserRoleLabel(profile)}</Badge>
        </div>

        {profile.role === USER_ROLES.STUDENT && (
          <p className="text-sm text-slate-600">
            {classGroup
              ? `Class/Group: ${classGroup.name} (${classGroup.id})`
              : 'No class/group assigned'}
          </p>
        )}

        {profile.association && (
          <section aria-labelledby="profile-association-heading" className="space-y-1">
            <h3 id="profile-association-heading" className="text-sm font-semibold text-slate-900">
              Association: {profile.association.name} ({profile.association.id})
            </h3>
            {profile.association.institution && (
              <p className="text-sm text-slate-500">{profile.association.institution}</p>
            )}
            {profile.association.description && (
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                {profile.association.description}
              </p>
            )}
          </section>
        )}

        {profile.bio && (
          <section aria-labelledby="profile-bio-heading">
            <h3 id="profile-bio-heading" className="text-sm font-semibold text-slate-900">
              About
            </h3>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">{profile.bio}</p>
          </section>
        )}
      </div>
    </Card>
  )
}

export default ProfileDetails
