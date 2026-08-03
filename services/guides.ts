
// Guías de autoprotección basadas en las recomendaciones de Protección Civil
// (Ministerio del Interior) y AEMET. Contenido estático: funciona sin conexión,
// sin claves y sin IA — cuando más falta hace.

export interface Guide {
  id: string;
  title: string;
  icon: string; // nombre de icono lucide
  // Palabras clave de categoría de alerta que activan la sugerencia de esta guía
  matches: string[];
  before: string[];
  during: string[];
  after: string[];
}

export const GUIDES: Guide[] = [
  {
    id: 'incendio',
    title: 'Incendio forestal',
    icon: 'Flame',
    matches: ['incendio', 'fuego', 'forestal'],
    before: [
      'Ten preparada una mochila con agua, linterna, radio, medicación y documentación.',
      'Identifica al menos dos vías de salida de tu zona.',
      'Mantén limpio de matorral y leña el entorno de la vivienda.',
    ],
    during: [
      'Llama al 112 y sigue siempre las indicaciones de las autoridades.',
      'Si te ordenan evacuar, hazlo de inmediato: no vuelvas a por objetos.',
      'Aléjate en dirección contraria al viento y perpendicular al avance del fuego.',
      'Si te rodea el humo, busca zona sin vegetación y cúbrete boca y nariz con ropa húmeda.',
      'Nunca intentes atravesar el frente de llamas ni refugiarte en barrancos.',
      'Si te quedas en casa: cierra puertas y ventanas, retira toldos y baja persianas.',
    ],
    after: [
      'No regreses hasta que las autoridades lo autoricen.',
      'Vigila posibles rebrotes y avisa al 112 si detectas humo.',
    ],
  },
  {
    id: 'inundacion',
    title: 'Inundación o lluvias intensas',
    icon: 'CloudRain',
    matches: ['inundac', 'lluvia', 'dana', 'temporal', 'riada', 'crecida'],
    before: [
      'Coloca los objetos de valor y productos tóxicos en las plantas altas.',
      'Ten a mano linterna y radio a pilas por si se corta la luz.',
      'Revisa dónde están las llaves de luz, agua y gas.',
    ],
    during: [
      'Sube a las plantas altas. No bajes a garajes, sótanos ni trasteros.',
      'No cruces zonas inundadas: 30 cm de agua bastan para arrastrar un coche.',
      'Si conduces y el agua sube, abandona el vehículo y busca zona elevada.',
      'Aléjate de cauces, barrancos y ramblas aunque estén secos.',
      'Desconecta la electricidad si el agua puede alcanzar los enchufes.',
    ],
    after: [
      'No bebas agua del grifo hasta que se confirme que es potable.',
      'No uses aparatos eléctricos que se hayan mojado.',
      'Desecha alimentos que hayan estado en contacto con el agua.',
    ],
  },
  {
    id: 'calor',
    title: 'Ola de calor',
    icon: 'Sun',
    matches: ['calor', 'temperatura', 'altas temperatura'],
    before: [
      'Prevé bebida suficiente y persianas o toldos para las horas centrales.',
      'Identifica lugares climatizados cercanos (centros comerciales, bibliotecas).',
    ],
    during: [
      'Bebe agua con frecuencia aunque no tengas sed; evita alcohol y bebidas muy azucaradas.',
      'Evita salir y hacer esfuerzo entre las 12:00 y las 18:00.',
      'Usa ropa ligera, gorra y protección solar; busca sombra.',
      'Nunca dejes a personas ni animales dentro de un vehículo cerrado.',
      'Vigila a mayores, bebés y personas enfermas: son los más vulnerables.',
    ],
    after: [
      'Ante mareo, dolor de cabeza, confusión o piel caliente y seca, llama al 112: puede ser un golpe de calor.',
      'Mientras llega ayuda, lleva a la persona a un lugar fresco y refresca su piel con agua.',
    ],
  },
  {
    id: 'nieve',
    title: 'Nevada o frío extremo',
    icon: 'Snowflake',
    matches: ['nieve', 'nevada', 'hielo', 'frío', 'frio'],
    before: [
      'Ten reservas de alimento, agua, mantas y medicación para varios días.',
      'Prepara el vehículo: cadenas, depósito lleno, ropa de abrigo y agua en el maletero.',
    ],
    during: [
      'Evita desplazamientos; si son imprescindibles, consulta la DGT antes de salir.',
      'Si te quedas atrapado en el coche, permanece dentro y señaliza tu posición.',
      'Ventila si usas estufas o braseros: riesgo de intoxicación por monóxido de carbono.',
      'Abriga cabeza, manos y pies; usa varias capas de ropa.',
    ],
    after: [
      'Cuidado con las placas de hielo y con la caída de nieve desde tejados.',
      'Retira la nieve acumulada en accesos y tejados si es seguro hacerlo.',
    ],
  },
  {
    id: 'apagon',
    title: 'Apagón eléctrico',
    icon: 'ZapOff',
    matches: ['apagón', 'apagon', 'eléctric', 'electric', 'suministro'],
    before: [
      'Ten linternas con pilas (mejor que velas) y una radio a pilas.',
      'Guarda una batería externa cargada para el móvil.',
      'Apunta en papel los teléfonos importantes: sin batería no hay agenda.',
    ],
    during: [
      'Usa linterna, no velas: son la principal causa de incendio en apagones.',
      'Mantén nevera y congelador cerrados: aguantan el frío varias horas.',
      'Desconecta los aparatos sensibles para evitar daños al volver la luz.',
      'Ahorra batería del móvil: modo avión y brillo bajo.',
    ],
    after: [
      'Conecta los aparatos de forma escalonada, no todos a la vez.',
      'Revisa los alimentos refrigerados antes de consumirlos.',
    ],
  },
];

/** Devuelve la guía relevante para una categoría de alerta, si existe. */
export const guideForCategory = (category: string): Guide | undefined => {
  const c = (category || '').toLowerCase();
  return GUIDES.find(g => g.matches.some(m => c.includes(m)));
};
