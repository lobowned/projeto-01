/** Valida CPF pelos dígitos verificadores. Aceita com ou sem pontuação. */
export function cpfValido(entrada: string): boolean {
  const cpf = entrada.replace(/\D/g, "");
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digito = (base: string) => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (base.length + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(cpf.slice(0, 9)) === Number(cpf[9]) && digito(cpf.slice(0, 10)) === Number(cpf[10]);
}

/** Retorna true se a pessoa já tem 18 anos completos na data informada. */
export function maiorDeIdade(nascimento: Date, hoje = new Date()): boolean {
  const limite = new Date(hoje.getFullYear() - 18, hoje.getMonth(), hoje.getDate());
  return nascimento <= limite;
}
