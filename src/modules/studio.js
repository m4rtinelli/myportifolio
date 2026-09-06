/**
 * Conteúdo do modal "Press F to see my studio".
 *
 * As notas de cada equipamento dizem em quais discos ele aparece, e isso
 * saiu do seu próprio doc de releases — não invente aqui, é o tipo de
 * detalhe que alguém confere.
 *
 * Os sete primeiros são os que estão modelados na cena (mesmos nomes dos
 * meshes no .glb); o resto vem do doc e não tem modelo.
 */
export const studio = {
  /*
   * TODO: coloque a foto em static/fotos/studio/ e aponte aqui,
   * ex. "/fotos/studio/setup.jpg". Enquanto estiver vazio o modal mostra
   * um bloco de espera no lugar, em vez de uma imagem quebrada.
   */
  photo: "",
  photoCaption: "",

  // TODO: reescrever com a sua voz — isto é só um rascunho a partir do doc.
  intro:
    "Almost everything I release starts on hardware: drum machines and a 303 " +
    "clone tracked live as jams, then arranged and processed afterwards. " +
    "These are the machines that keep coming back.",

  equipment: [
    {
      name: "Korg Electribe EMX-1",
      note: "Valve-driven groovebox. On Sem Sono, Plano Z and Dixava.",
    },
    {
      name: "Korg Electribe ESX-1",
      note: "Sampling sibling of the EMX. On Sem Sono and Ducentésimo Dia.",
    },
    {
      name: "Cyclone TT-303 Bass Bot mk1",
      note: "TB-303 clone — the acid lines on Sem Sono, Plano Z, Dixava and Snitchin' Bitches.",
    },
    {
      name: "Acidlab Miami",
      note: "TR-808 clone. On Sem Sono, Plano Z and Snitchin' Bitches.",
    },
    {
      name: "Yamaha DX7",
      note: "FM synthesis, mostly for pads and bells. On Sem Sono and Plano Z.",
    },
    {
      name: "Access Virus B",
      note: "Virtual analog workhorse — Plano Z, Ferramentas Vol. I, Ducentésimo Dia, Ai Que Raiva, UD004 and Kengaral.",
    },
    {
      name: "Akai MPC Live",
      note: "Sampling and sequencing. On Dixava and Ducentésimo Dia.",
    },
    {
      name: "Roland TR-909",
      note: "On Ducentésimo Dia, UD004 and Spiral Signals.",
    },
    {
      name: "Roland TR-808",
      note: "Often distorted through the RAT. On Dixava, Ai Que Raiva, Kengaral and Black Earth.",
    },
    {
      name: "Roland Juno-106",
      note: "On Dixava, Ferramentas Vol. I and Spiral Signals.",
    },
    {
      name: "Roland TR-707",
      note: "On Dixava.",
    },
    {
      name: "Korg MS-20",
      note: "On Dixava.",
    },
    {
      name: "Make Noise 0-Coast",
      note: "Semi-modular, used for texture. On Dixava.",
    },
    {
      name: "Eventide H9",
      note: "Effects processing. On Dixava.",
    },
    {
      name: "Empirical Labs Distressor",
      note: "Compression on the way in. On Dixava.",
    },
    {
      name: "ProCo RAT",
      note: "Distortion pedal the 808 gets recorded through. On Plano Z and Snitchin' Bitches.",
    },
  ],
};
