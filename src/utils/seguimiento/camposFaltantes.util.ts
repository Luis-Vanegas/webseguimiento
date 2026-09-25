// Traduce los errores de react-hook-form a un aviso que nombra los campos
// que faltan. Separado de RegistrarVisita para poder probar el texto sin
// montar el formulario: es lo único que ve el usuario cuando el submit se
// corta por validación, así que si queda mal nadie se entera de por qué no
// se guardó.

// Nombre visible de cada campo validado, para poder decir QUÉ falta en vez
// de un "revisá el formulario" genérico. Las claves son las de FormVisita.
const ETIQUETA_CAMPO: Record<string, string> = {
  fechaVisita: 'Fecha de visita',
  porcentajeAvanceCampo: '% de avance observado en campo',
  porcentajeProgramado: '% programado',
  porcentajePagado: '% pagado',
  alertas: 'Descripción de la alerta',
}

// Recibe Record en vez de FieldErrors<FormVisita> a proposito: solo usa las
// claves, y tipar el parametro obligaria a que utils importara react-hook-form
// y el tipo del formulario, que vive en la pagina.
export function mensajeDeCamposFaltantes(errores: Record<string, unknown>): string {
  const nombres = Object.keys(errores).map((campo) => ETIQUETA_CAMPO[campo] ?? campo)
  if (nombres.length === 0) return 'Revisá los datos del formulario antes de guardar.'
  return `No se guardó: falta completar ${nombres.join(', ')}. Está marcado en rojo más arriba.`
}
