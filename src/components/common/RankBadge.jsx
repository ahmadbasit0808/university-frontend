import React from "react";

/**
 * Computes a map of roll_no -> rank (1-based position) based on a numeric score property (e.g. marks_obtained, gpa, cgpa).
 * Uses standard competition ranking (ties share the same rank).
 */
export function computeRankMap(items, scoreKey = "marks_obtained") {
  if (!items || !Array.isArray(items) || items.length === 0) return new Map();

  // Filter items with valid numeric score and sort descending
  const validItems = items.filter(
    (item) => item && item[scoreKey] !== null && item[scoreKey] !== undefined && item[scoreKey] !== "" && !isNaN(item[scoreKey])
  );

  const sorted = [...validItems].sort((a, b) => {
    const valA = parseFloat(a[scoreKey]);
    const valB = parseFloat(b[scoreKey]);
    return valB - valA;
  });

  const rankMap = new Map();
  let currentRank = 1;

  sorted.forEach((item, idx) => {
    const val = parseFloat(item[scoreKey]);
    if (idx > 0) {
      const prevVal = parseFloat(sorted[idx - 1][scoreKey]);
      if (val < prevVal) {
        currentRank = idx + 1;
      }
    }
    const key = String(item.roll_no || item.id);
    if (key) {
      rankMap.set(key, currentRank);
    }
  });

  return rankMap;
}

/**
 * Renders a circular colored position badge with tooltip.
 */
export default function RankBadge({ rank, titlePrefix = "Position" }) {
  if (rank == null) return null;

  let rankClass = "rank-other";
  if (rank === 1) rankClass = "rank-1";
  else if (rank === 2) rankClass = "rank-2";
  else if (rank === 3) rankClass = "rank-3";
  else if (rank <= 10) rankClass = "rank-top10";

  return (
    <span
      className={`tracked-rank-badge ${rankClass}`}
      title={`${titlePrefix}: #${rank}`}
      aria-label={`${titlePrefix} ${rank}`}
    >
      {rank}
    </span>
  );
}
