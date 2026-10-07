export function exportarCsv(nomeFicheiro, linhas, colunas) {
  const cabecalho = colunas.map((c) => c.rotulo).join(";");
  const corpo = linhas.map((row) =>
    colunas
      .map((c) => {
        const valor = c.valor(row);
        const texto = valor == null ? "" : String(valor).replaceAll(";", ",");
        return `"${texto.replaceAll('"', '""')}"`;
      })
      .join(";"),
  );
  const csv = `\uFEFF${[cabecalho, ...corpo].join("\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const ancora = document.createElement("a");
  ancora.href = url;
  ancora.download = nomeFicheiro;
  ancora.click();
  URL.revokeObjectURL(url);
}
