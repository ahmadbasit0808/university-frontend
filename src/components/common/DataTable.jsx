import { useState, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { useTableSort } from "../../context/TableSortContext";

export default function DataTable({
  columns,
  data,
  onEdit,
  onDelete,
  loading,
  emptyMessage,
  defaultSortKey,
  defaultSortDir = "desc",
  highlightKey,
  highlightValue,
  rowClassName,
  tableId,
  deleteLabel = "Delete",
  cardAccent,
  searchable = true,
}) {
  const { isAuthenticated } = useAuth();
  const { getSort, setSort } = useTableSort();

  const [sortKey, setSortKey] = useState(() => {
    if (tableId) {
      const saved = getSort(tableId);
      return saved?.key || defaultSortKey || null;
    }
    return defaultSortKey || null;
  });
  const [sortDir, setSortDir] = useState(() => {
    if (tableId) {
      const saved = getSort(tableId);
      return saved?.dir || defaultSortDir;
    }
    return defaultSortDir;
  });
  const [search, setSearch] = useState("");

  const handleSort = (key) => {
    let newKey, newDir;
    if (sortKey === key) {
      newKey = key;
      newDir = sortDir === "asc" ? "desc" : "asc";
    } else {
      newKey = key;
      newDir = "desc";
    }
    setSortKey(newKey);
    setSortDir(newDir);
    if (tableId) setSort(tableId, newKey, newDir);
  };

  const filteredData = useMemo(() => {
    if (!data || !search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter((row) =>
      columns.some((col) => {
        if (col.sortable === false) return false;
        const val = row[col.key];
        return val != null && String(val).toLowerCase().includes(q);
      })
    );
  }, [data, search, columns]);

  const sortedData = useMemo(() => {
    if (!filteredData || filteredData.length === 0 || !sortKey) return filteredData;
    return [...filteredData].sort((a, b) => {
      let aVal = a[sortKey];
      let bVal = b[sortKey];
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      if (
        typeof aVal === "string" &&
        typeof bVal === "string" &&
        !isNaN(aVal) &&
        !isNaN(bVal)
      ) {
        aVal = parseFloat(aVal);
        bVal = parseFloat(bVal);
      }
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      const strA = String(aVal).toLowerCase();
      const strB = String(bVal).toLowerCase();
      if (strA < strB) return sortDir === "asc" ? -1 : 1;
      if (strA > strB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortKey, sortDir]);

  if (loading) return <div className="table-loading">Loading data...</div>;

  return (
    <>
      {searchable && data && data.length > 0 && (
        <div className="table-search-bar">
          <input
            className="table-search-input"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {(!sortedData || sortedData.length === 0) && (
        <div className="table-empty">
          <span className="table-empty-icon">📭</span>
          {search ? "No results match your search." : (emptyMessage || "No records found.")}
        </div>
      )}

      {sortedData && sortedData.length > 0 && (
        <>
          {/* Desktop Table View */}
          <div className="table-wrapper table-desktop-view">
            <table className="data-table">
              <thead>
                <tr>
                  {columns
                    .filter((col) => !col.hideOnTable)
                    .map((col) => (
                      <th
                        key={col.key}
                        style={col.width ? { width: col.width } : undefined}
                        className={`sortable-header ${sortKey === col.key ? "sorted" : ""}`}
                        onClick={() => col.sortable !== false && handleSort(col.key)}
                      >
                        <span className="th-label">{col.label}</span>
                        {col.sortable !== false && sortKey === col.key && (
                          <span className="sort-arrow">
                            {sortDir === "asc" ? " ▲" : " ▼"}
                          </span>
                        )}
                      </th>
                    ))}
                  {isAuthenticated && (onEdit || onDelete) && (
                    <th className="actions-column">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {sortedData.map((row, index) => {
                  const isHighlighted =
                    highlightKey &&
                    highlightValue?.length > 0 &&
                    highlightValue.includes(String(row[highlightKey]));
                  return (
                    <tr
                      key={row.id || row.roll_no || row.course_code || row.teacher_id || index}
                      className={`${isHighlighted ? "row-highlighted" : ""} ${rowClassName ? rowClassName(row) : ""}`}
                    >
                      {columns
                        .filter((col) => !col.hideOnTable)
                        .map((col) => (
                          <td key={col.key}>
                            {col.render ? col.render(row[col.key], row) : row[col.key]}
                          </td>
                        ))}
                      {isAuthenticated && (onEdit || onDelete) && (
                        <td className="actions-column">
                          <div className="action-buttons">
                            {onEdit && (
                              <button className="btn btn-sm btn-secondary" onClick={() => onEdit(row)}>
                                Edit
                              </button>
                            )}
                            {onDelete && (
                              <button className="btn btn-sm btn-danger" onClick={() => onDelete(row)}>
                                {deleteLabel}
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile/Tablet Card View */}
          <div className="data-cards-sort data-cards-view">
            <div className="data-cards-sort-row">
              <div className="data-cards-sort-field">
                <label>Sort by</label>
                <select
                  value={sortKey || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val) {
                      setSortKey(val);
                      setSortDir(defaultSortDir);
                      if (tableId) setSort(tableId, val, defaultSortDir);
                    }
                  }}
                >
                  <option value="">— Select —</option>
                  {columns
                    .filter((col) => !col.hideOnTable && col.sortable !== false)
                    .map((col) => (
                      <option key={col.key} value={col.key}>
                        {col.label}
                      </option>
                    ))}
                </select>
              </div>
              <div className="data-cards-sort-field">
                <label>Order</label>
                <select
                  value={sortDir}
                  onChange={(e) => {
                    const newDir = e.target.value;
                    setSortDir(newDir);
                    if (tableId && sortKey) setSort(tableId, sortKey, newDir);
                  }}
                >
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </div>
            </div>
          </div>
          <div className="data-cards data-cards-view">
            {sortedData.map((row, index) => {
              const isHighlighted =
                highlightKey &&
                highlightValue?.length > 0 &&
                highlightValue.includes(String(row[highlightKey]));
              return (
                <div
                  className={`data-card ${isHighlighted ? "row-highlighted" : ""} ${rowClassName ? rowClassName(row) : ""}`}
                  style={!isHighlighted && cardAccent ? { borderLeftColor: cardAccent } : undefined}
                  key={row.id || row.roll_no || row.course_code || row.teacher_id || index}
                >
                  {columns.map((col) => (
                    <div className="data-card-row" key={col.key}>
                      <span className="data-card-label">{col.label}</span>
                      <span className="data-card-value">
                        {col.render ? col.render(row[col.key], row) : row[col.key]}
                      </span>
                    </div>
                  ))}
                  {isAuthenticated && (onEdit || onDelete) && (
                    <div className="data-card-actions">
                      {onEdit && (
                        <button className="btn btn-sm btn-secondary" onClick={() => onEdit(row)}>
                          Edit
                        </button>
                      )}
                      {onDelete && (
                        <button className="btn btn-sm btn-danger" onClick={() => onDelete(row)}>
                          {deleteLabel}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
