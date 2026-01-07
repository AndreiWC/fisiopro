export function formatPhone(phone: string) {
  // Remove todos os caracteres que não são dígitos
  const digits = phone.replace(/\D/g, "");

  if (digits.length === 11) {
    // Formato para números com 11 dígitos (ex: (99) 99999-9999)
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  } else if (digits.length === 10) {
    // Formato para números com 10 dígitos (ex: (99) 9999-9999)
    return digits.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  } else {
    return phone; // Retorna o número original se não corresponder aos formatos esperados
  }
}

export function unformatPhone(formattedPhone: string) {
  // Remove todos os caracteres que não são dígitos
  return formattedPhone.replace(/[\(\)\s-]/g, "");
}
