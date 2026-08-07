import { createContext, useContext, useEffect, useState } from "react";

const TableSortContext = createContext(null);

export function TableSortProvider({ children }) {
  const [sorts, setSorts] = useState(() => {
    const saved = localStorage.getItem("tableSorts");
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem("tableSorts", JSON.stringify(sorts));
  }, [sorts]);

  const setSort = (table, key, dir) => {
    setSorts((prev) => ({
      ...prev,
      [table]: { key, dir },
    }));
  };

  const getSort = (table) => sorts[table] || null;

  return (
    <TableSortContext.Provider
      value={{
        getSort,
        setSort,
      }}
    >
      {children}
    </TableSortContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTableSort() {
  const context = useContext(TableSortContext);

  if (!context) {
    throw new Error("useTableSort must be used within a TableSortProvider");
  }

  return context;
}
