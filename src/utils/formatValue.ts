export function formatvalue(value: string) {
  // Remove todos os caracteres que não são dígitos
  const numericValue = value.replace(/\D/g, "");
  // Formata o valor como moeda brasileira (R$)
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(parseFloat(numericValue) / 100);
}
export function unformatvalue(formattedValue: string) {
  // Remove o símbolo de moeda e espaços
  const numericString = formattedValue.replace(/[R$\s]/g, "");
  // Remove pontos e substitui vírgulas por pontos para conversão correta
  const normalizedString = numericString.replace(/\./g, "").replace(/,/g, ".");
  // Converte para número
  const numberValue = parseFloat(normalizedString);
  return isNaN(numberValue) ? 0 : numberValue;
}

export function unformatvalueToCents(formattedValue: string) {
  const numericString = formattedValue.replace(/[R$\s]/g, "");
  const normalizedString = numericString.replace(/\./g, "").replace(/,/g, ".");
  const numberValue = parseFloat(normalizedString);
  return isNaN(numberValue) ? 0 : Math.round(numberValue * 100);
}

export function formatvalueToReal(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}
