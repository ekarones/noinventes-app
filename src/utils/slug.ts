// Mirrors Laravel's Str::slug(): transliterate accents, lowercase, turn any run
// of non-alphanumeric characters into a single hyphen, and trim hyphens off the
// ends. Used to auto-generate a variation code the same way the server does, so
// client and backend stay consistent.
//
//   slugify('Rojo')        -> 'rojo'
//   slugify('Azul cielo')  -> 'azul-cielo'
//   slugify('Está grande') -> 'esta-grande'
export function slugify(input: string): string {
  return input
    .normalize('NFD') // split accented letters into base + combining mark
    .replace(/[̀-ͯ]/g, '') // drop the combining marks (é -> e, ñ -> n)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // any non-alphanumeric run -> single hyphen
    .replace(/^-+|-+$/g, ''); // trim leading/trailing hyphens
}

// Builds a variation code: the product code (kept verbatim) + a hyphen-joined
// slug of the chosen attribute values, in the given order.
//
//   buildVariationCode('POLO-01', ['Rojo', 'M']) -> 'POLO-01-rojo-m'
export function buildVariationCode(productCode: string, values: string[]): string {
  const slug = values.map(slugify).filter(Boolean).join('-');
  return slug ? `${productCode}-${slug}` : productCode;
}
