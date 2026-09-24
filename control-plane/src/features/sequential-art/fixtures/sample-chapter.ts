/**
 * sample-chapter — committed M12 fixture (labeled sample in the UI).
 *
 * 3 scenes × 11 beats = 33 beats → 10 pages (target range 8–10).
 * Dialogue is verbatim editable text (UAT-M12-01 pass criterion).
 */

import type { BeatKind, ChapterBeat, ChapterManuscript } from '../types';

function beat(id: string, kind: BeatKind, description: string, extra: Partial<ChapterBeat> = {}): ChapterBeat {
  return { id, kind, description, ...extra };
}

export const SAMPLE_CHAPTER: ChapterManuscript = {
  chapterId: 'ch-faro-de-sal',
  title: 'El faro de sal',
  readingDirection: 'ltr',
  scenes: [
    {
      id: 'scene-faro-01',
      beats: [
        beat('b01', 'establishing', 'Amanecer sobre la bahía; el faro de sal destaca entre la niebla.', { characters: [], importance: 0.6 }),
        beat('b02', 'establishing', 'Nora sube el sendero de conchas con la lata de su abuela bajo el brazo.', { characters: ['nora'], importance: 0.7 }),
        beat('b03', 'dialogue', 'Nora mira la puerta entreabierta del faro.', { characters: ['nora'], dialogue: [{ speaker: 'nora', text: 'Abuela… ¿estás ahí?' }] }),
        beat('b04', 'action', 'El viento empuja la puerta; dentro, las escaleras giran hacia arriba.', { characters: ['nora'], importance: 0.65 }),
        beat('b05', 'dialogue', 'Desde arriba baja un eco teñido de sal.', { dialogue: [{ speaker: 'abuela', text: 'Sube, nieta. La marea no espera.' }], importance: 0.75 }),
        beat('b06', 'reaction', 'Nora aprieta la lata y sube dos peldaños de golpe.', { characters: ['nora'], importance: 0.6 }),
        beat('b07', 'establishing', 'La linterna del faro, cubierta de cristales de sal, gira despacio.', { importance: 0.7 }),
        beat('b08', 'reveal', 'Entre los cristales brilla una llave pequeña hecha de espuma apelmazada.', { importance: 0.9, dialogue: [{ speaker: 'nora', text: 'Eso es imposible.' }] }),
        beat('b09', 'dialogue', 'La abuela sostiene un cuaderno salado.', { characters: ['abuela'], dialogue: [{ speaker: 'abuela', text: 'Todo lo que el mar guarda, alguien lo tuvo que anotar.' }] }),
        beat('b10', 'action', 'Nora abre la lata: dentro, una página arrancada del mismo cuaderno.', { characters: ['nora'], importance: 0.85 }),
        beat('b11', 'transition', 'Las dos miran la página; el faro gira sobre ellas.', { characters: ['nora', 'abuela'], importance: 0.8 }),
      ],
    },
    {
      id: 'scene-faro-02',
      beats: [
        beat('b12', 'establishing', 'El despacho del faro: mapas, corchos, una taza con arena.', { importance: 0.55 }),
        beat('b13', 'dialogue', 'Nora extiende la página sobre la mesa.', { characters: ['nora'], dialogue: [{ speaker: 'nora', text: 'Mi nombre está escrito aquí. Y no lo recuerdo.' }] }),
        beat('b14', 'reaction', 'La abuela cierra los ojos un instante demasiado largo.', { characters: ['abuela'], importance: 0.7 }),
        beat('b15', 'dialogue', 'La abuela señala la costa con el dedo.', { characters: ['abuela'], dialogue: [{ speaker: 'abuela', text: 'Hay una isla que solo aparece cuando la marea baja del todo.' }] }),
        beat('b16', 'action', 'Sobre el mapa, una ruta de corchos une el faro con un vacío blanco.', { importance: 0.75 }),
        beat('b17', 'dialogue', 'Nora repite la palabra del mapa.', { characters: ['nora'], dialogue: [{ speaker: 'nora', text: '«Sil»… así se llama la isla.' }] }),
        beat('b18', 'reveal', 'La llave de espuma se curva sola hacia el vacío del mapa.', { importance: 0.9 }),
        beat('b19', 'action', 'La abuela guarda el cuaderno y coge un farol de aceite.', { characters: ['abuela'], importance: 0.65 }),
        beat('b20', 'dialogue', 'Aviso sereno antes de bajar.', { characters: ['abuela'], dialogue: [{ speaker: 'abuela', text: 'Tráete la lata. El mar cobra en recuerdos.' }] }),
        beat('b21', 'transition', 'Las dos descienden; la marea empieza a retirarse.', { importance: 0.7 }),
      ],
    },
    {
      id: 'scene-faro-03',
      beats: [
        beat('b22', 'establishing', 'La playa desierta al anochecer; la arena brilla como sal molida.', { importance: 0.6 }),
        beat('b23', 'action', 'Nora y su abuela caminan hacia la línea donde el agua duda.', { characters: ['nora', 'abuela'], importance: 0.7 }),
        beat('b24', 'dialogue', 'Nora frena al borde del agua.', { characters: ['nora'], dialogue: [{ speaker: 'nora', text: '¿Y si la isla no quiere devolverme lo que sé?' }] }),
        beat('b25', 'dialogue', 'La abuela sonríe sin apartar la vista del horizonte.', { characters: ['abuela'], dialogue: [{ speaker: 'abuela', text: 'Entonces negociaremos. Yo sé regatear con mareas.' }] }),
        beat('b26', 'reveal', 'Entre la niebla, una silueta de roca blanca emerge: la isla Sil.', { importance: 0.95 }),
        beat('b27', 'reaction', 'La llave de espuma vibra dentro de la lata.', { characters: ['nora'], importance: 0.8 }),
        beat('b28', 'establishing', 'Una barca vieja, medio enterrada, espera junto a unos tablones.', { importance: 0.6 }),
        beat('b29', 'action', 'La abuela empuja la barca hacia el agua con un hombro.', { characters: ['abuela'], importance: 0.7 }),
        beat('b30', 'dialogue', 'Nora sube primero, con la lata abrazada.', { characters: ['nora'], dialogue: [{ speaker: 'nora', text: 'Si algo me borra, recuerda tú por mí.' }] }),
        beat('b31', 'dialogue', 'La abuela rema hacia la niebla.', { characters: ['abuela'], dialogue: [{ speaker: 'abuela', text: 'El mar no borra, nieta. Cambia de sitio las cosas.' }] }),
        beat('b32', 'transition', 'La isla Sil crece entre la bruma; el faro queda pequeño atrás.', { importance: 0.85 }),
        beat('b33', 'transition', 'Primera estrella sobre el agua; la barca cruza la línea de espuma.', { importance: 0.8 }),
      ],
    },
  ],
};
