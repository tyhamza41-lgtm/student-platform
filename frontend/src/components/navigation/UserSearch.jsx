import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { getUserRoleLabel } from '../../constants/navigation'
import { ROUTES } from '../../constants/routes'
import { Avatar, SearchInput } from '../ui'
import * as usersService from '../../features/users/users.service'

function getSearchRole(user) {
  const role = getUserRoleLabel(user)
  return role === 'Association' ? 'Student Association' : role
}

function UserSearch() {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [searchRevision, setSearchRevision] = useState(0)
  const [searchResult, setSearchResult] = useState({ key: '', users: [], error: '' })
  const searchId = useId()
  const searchRef = useRef(null)
  const navigate = useNavigate()
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const searchKey = normalizedQuery ? `${normalizedQuery}:${searchRevision}` : ''

  useEffect(() => {
    if (!searchKey) return undefined
    let active = true
    usersService.getAll()
      .then((records) => {
        if (active) setSearchResult({ key: searchKey, users: records, error: '' })
      })
      .catch((error) => {
        if (active) {
          setSearchResult({
            key: searchKey,
            users: [],
            error: error.message || 'People could not be loaded.',
          })
        }
      })
    return () => { active = false }
  }, [searchKey])

  const resultIsCurrent = searchResult.key === searchKey
  const matches = useMemo(() => {
    if (!normalizedQuery || !resultIsCurrent) return []
    return searchResult.users
      .filter((user) => user.name?.toLocaleLowerCase().includes(normalizedQuery))
      .slice(0, 8)
  }, [normalizedQuery, resultIsCurrent, searchResult.users])

  useEffect(() => {
    function handleOutsidePointerDown(event) {
      if (!searchRef.current?.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('pointerdown', handleOutsidePointerDown)
    return () => document.removeEventListener('pointerdown', handleOutsidePointerDown)
  }, [])

  function selectUser(user) {
    setIsOpen(false)
    setQuery('')
    setSearchRevision((revision) => revision + 1)
    navigate(ROUTES.USER_PROFILE(user.id))
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowDown' && matches.length > 0) {
      event.preventDefault()
      setIsOpen(true)
      setActiveIndex((index) => Math.min(index + 1, matches.length - 1))
    } else if (event.key === 'ArrowUp' && matches.length > 0) {
      event.preventDefault()
      setIsOpen(true)
      setActiveIndex((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter' && isOpen && matches[activeIndex]) {
      event.preventDefault()
      selectUser(matches[activeIndex])
    } else if (event.key === 'Escape') {
      setIsOpen(false)
    }
  }

  const listboxId = `${searchId}-results`
  const activeOptionId = isOpen && matches[activeIndex]
    ? `${listboxId}-${matches[activeIndex].id}`
    : undefined

  return (
    <div ref={searchRef} className="relative min-w-0 flex-1 lg:w-[320px] lg:flex-none xl:w-[360px]">
      <SearchInput
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          setActiveIndex(0)
          setIsOpen(true)
        }}
        onClear={() => {
          setQuery('')
          setActiveIndex(0)
          setIsOpen(true)
          setSearchRevision((revision) => revision + 1)
        }}
        onFocus={() => {
          setIsOpen(true)
          setSearchRevision((revision) => revision + 1)
        }}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-label="Search people"
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-autocomplete="list"
        aria-activedescendant={activeOptionId}
        placeholder="Search people"
        size="sm"
        wrapperClassName="w-full"
        className="min-w-0 rounded-xl bg-slate-50 focus:bg-white"
      />

      {isOpen && (
        <div
          id={listboxId}
          className="fixed inset-x-3 top-[72px] z-50 max-h-[min(70vh,24rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl sm:absolute sm:inset-x-0 sm:top-full sm:mt-2 sm:max-h-80"
        >
          {!normalizedQuery ? (
            <p role="status" className="px-4 py-3 text-sm text-slate-500">
              Search for students, directors, associations, or representatives.
            </p>
          ) : !resultIsCurrent ? (
            <p role="status" className="px-4 py-3 text-sm text-slate-500">
              Searching people…
            </p>
          ) : searchResult.error ? (
            <p role="alert" className="px-4 py-3 text-sm text-red-700">
              {searchResult.error}
              <button
                type="button"
                onClick={() => setSearchRevision((revision) => revision + 1)}
                className="ml-2 font-semibold underline"
              >
                Try again
              </button>
            </p>
          ) : matches.length === 0 ? (
            <p role="status" className="px-4 py-3 text-sm text-slate-500">
              No people found for “{query.trim()}”.
            </p>
          ) : (
            <div role="listbox" aria-label="People search results">
              {matches.map((user, index) => {
                return (
                  <button
                    key={user.id}
                    id={`${listboxId}-${user.id}`}
                    type="button"
                    role="option"
                    aria-selected={index === activeIndex}
                    tabIndex={-1}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectUser(user)}
                    className="flex w-full min-w-0 items-center gap-3 px-3 py-2.5 text-left hover:bg-violet-50 focus-visible:bg-violet-50 focus-visible:outline-none"
                  >
                    <Avatar
                      src={user.avatarUrl}
                      name={user.name}
                      alt=""
                      size="sm"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-900">
                        {user.name}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {getSearchRole(user)}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default UserSearch
