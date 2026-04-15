const escapeCell = (value: string) => {
  const needsQuotes = value.includes(",") || value.includes("\n") || value.includes("\"");
  const escaped = value.replace(/\"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
};

export const toCsv = (headers: string[], rows: Array<Record<string, string>>) => {
  const headerRow = headers.map(escapeCell).join(",");
  const dataRows = rows.map((row) =>
    headers.map((key) => escapeCell(row[key] ?? "")).join(","),
  );

  return [headerRow, ...dataRows].join("\n");
};

export const parseCsv = (text: string) => {
  const rows: string[][] = [];
  let current: string[] = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (char === "\"") {
      if (inQuotes && text[index + 1] === "\"") {
        value += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      current.push(value);
      value = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && text[index + 1] === "\n") {
        index += 1;
      }

      current.push(value);
      value = "";
      if (current.length > 1 || current[0] !== "") {
        rows.push(current);
      }
      current = [];
      continue;
    }

    value += char;
  }

  if (value.length > 0 || current.length > 0) {
    current.push(value);
    rows.push(current);
  }

  return rows;
};
