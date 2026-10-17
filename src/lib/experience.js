import { keyOf, validTitle } from './library.js'

export const emptyGroup = { enabled: false, members: [
  { name: 'Viewer 1', type: 'either', genres: [] },
  { name: 'Viewer 2', type: 'either', genres: [] },
] }
export const defaultWorkspace = { hidden: [], folders: [], plans: [], spoilerFree: false, group: emptyGroup }
function validGroup(group) {
  return group && typeof group.enabled === 'boolean' && Array.isArray(group.members) && group.members.length >= 2 && group.members.length <= 6 && group.members.every(member => member && typeof member.name === 'string' && member.name.length <= 30 && ['either', 'movie', 'tv'].includes(member.type) && Array.isArray(member.genres) && member.genres.length <= 30 && member.genres.every(name => typeof name === 'string' && name.length <= 60))
}
export function resolveGroup(group, type, genre) {
  if (!group.enabled) return { type, genres: [] }
  let types = type === 'either' ? ['movie', 'tv'] : [type]
  let common = genre === 'any' ? null : [genre]
  for (const member of group.members) {
    if (member.type !== 'either') types = types.filter(value => value === member.type)
    if (member.genres.length) common = common === null ? [...member.genres] : common.filter(value => member.genres.includes(value))
  }
  if (!types.length) throw new Error('Your group disagrees on movie versus TV. Change a viewer’s media preference to Either.')
  if (common && !common.length) throw new Error('No genre suits every viewer. Give someone another acceptable genre or choose Any genre.')
  return { type: types.length === 2 ? 'either' : types[0], genres: common || [] }
}
export function drawCandidates(pool, excluded, seen, previous, count = 1, random = Math.random) {
  const blocked = new Set(excluded.map(keyOf))
  const eligible = [...new Map(pool.filter(t => !blocked.has(keyOf(t))).map(t => [keyOf(t), t])).values()]
  let nextSeen = new Set(seen)
  let available = eligible.filter(t => !nextSeen.has(keyOf(t)))
  const restarted = eligible.length > 0 && available.length === 0
  if (restarted) {
    nextSeen = new Set()
    available = eligible.length > 1 ? eligible.filter(t => keyOf(t) !== keyOf(previous || {})) : [...eligible]
  }
  const titles = []
  const amount = Math.min(count, available.length)
  for (let i = 0; i < amount; i++) {
    const index = Math.floor(random() * available.length)
    const title = available.splice(index, 1)[0]
    titles.push(title); nextSeen.add(keyOf(title))
  }
  return { titles, nextSeen, restarted }
}
export function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T12:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}
export function cleanWorkspace(value, strict = false) {
  if (value == null) return { ...defaultWorkspace }
  const invalid = () => { throw new Error('Invalid planner or collections in this backup. Your data has not changed.') }
  if (typeof value !== 'object' || Array.isArray(value)) { if (strict) invalid(); return { ...defaultWorkspace } }
  const hidden = Array.isArray(value.hidden) ? value.hidden.filter(validTitle) : []
  const folders = Array.isArray(value.folders) ? value.folders.filter(name => typeof name === 'string' && name.trim() && name.length <= 40).map(name => name.trim()) : []
  const validPlan = plan => plan && typeof plan.id === 'string' && plan.id.length > 0 && plan.id.length <= 100 && validTitle(plan.title) && validDate(plan.date)
  const plans = Array.isArray(value.plans) ? value.plans.filter(validPlan) : []
  if (strict && ((value.hidden !== undefined && (!Array.isArray(value.hidden) || hidden.length !== value.hidden.length)) ||
    (value.folders !== undefined && (!Array.isArray(value.folders) || folders.length !== value.folders.length)) ||
    (value.plans !== undefined && (!Array.isArray(value.plans) || plans.length !== value.plans.length)) ||
    (value.spoilerFree !== undefined && typeof value.spoilerFree !== 'boolean') ||
    (value.group !== undefined && !validGroup(value.group)))) invalid()
  return { hidden: [...new Map(hidden.map(t => [keyOf(t), t])).values()], folders: [...new Map(folders.map(name => [name.toLocaleLowerCase(), name])).values()], plans: [...new Map(plans.map(plan => [plan.id, plan])).values()], spoilerFree: Boolean(value.spoilerFree), group: validGroup(value.group) ? value.group : emptyGroup }
}
export function readWorkspace(storage) {
  try { return cleanWorkspace(JSON.parse(storage.getItem('watchpick-workspace-v1') || 'null')) }
  catch { return { ...defaultWorkspace } }
}
export function mergeWorkspace(current, incoming) {
  const imported = cleanWorkspace(incoming, true)
  return cleanWorkspace({ hidden: [...current.hidden, ...imported.hidden], folders: [...imported.folders, ...current.folders], plans: [...imported.plans, ...current.plans], spoilerFree: current.spoilerFree || imported.spoilerFree, group: current.group.enabled ? current.group : imported.group })
}

// Undo only the affected title; preserve unrelated library edits made afterwards.
export function restoreTitleMembership(current, title, before) {
  const key = keyOf(title)
  function restore(list, snapshot) {
    const copy = list.filter(item => keyOf(item) !== key)
    const index = snapshot.findIndex(item => keyOf(item) === key)
    if (index >= 0) copy.splice(Math.min(index, copy.length), 0, snapshot[index])
    return copy
  }
  return { saved: restore(current.saved, before.saved), watched: restore(current.watched, before.watched) }
}
