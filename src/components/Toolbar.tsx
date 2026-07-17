import type { GroupBy } from '../types'

type Props = {
  filter: string
  onFilterChange: (value: string) => void
  groupBy: GroupBy
  onGroupByChange: (value: GroupBy) => void
  onOpenAdd: () => void
  onOpenGit: () => void
  onOpenImport: () => void
}

export function Toolbar({
  filter,
  onFilterChange,
  groupBy,
  onGroupByChange,
  onOpenAdd,
  onOpenGit,
  onOpenImport,
}: Props) {
  return (
    <div className="toolbar">
      <label className="search">
        <span className="sr-only">Filter accounts</span>
        <input
          type="search"
          placeholder="Filter by issuer, account, group, or tag…"
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
          autoComplete="off"
        />
      </label>

      <label className="select-field">
        <span>Group</span>
        <select
          value={groupBy}
          onChange={(e) => onGroupByChange(e.target.value as GroupBy)}
        >
          <option value="none">None</option>
          <option value="issuer">By issuer</option>
          <option value="group">By custom group</option>
          <option value="tag">By tag</option>
        </select>
      </label>

      <div className="toolbar__actions">
        <button type="button" className="btn btn--primary" onClick={onOpenAdd}>
          Add secret
        </button>
        <button type="button" className="btn" onClick={onOpenGit}>
          Git sync
        </button>
        <button type="button" className="btn" onClick={onOpenImport}>
          Import
        </button>
      </div>
    </div>
  )
}
