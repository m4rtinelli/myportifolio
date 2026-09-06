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

  /*
   * TODO: escreva aqui o texto sobre o estúdio. Enquanto estiver vazio a
   * coluna da direita começa direto na lista, sem buraco nem placeholder.
   *
   * Para separar em parágrafos, troque por um array de strings — o
   * studioModal.js aceita os dois formatos.
   */
  intro: "",

  /*
   * O que é meu, na ordem que você passou. As notas dizem em quais discos
   * cada máquina aparece e saíram do seu doc de releases — não invente aqui,
   * é o tipo de detalhe que alguém confere. Item sem nota some a linha de
   * baixo sozinho, então é só apagar o campo se quiser a lista limpa.
   */
  equipment: [
    {
      name: "Access Virus B",
      note: "Plano Z, Ferramentas Vol. I, Ducentésimo Dia, Ai Que Raiva, UD004 and Kengaral.",
    },
    {
      name: "Akai MPC Live",
      note: "Sampling and sequencing. On Dixava and Ducentésimo Dia.",
    },
    {
      name: "Behringer Pro-1",
      note: "",
    },
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
      name: "Universal Audio Apollo",
      note: "Rack interface — everything gets tracked through it.",
    },
    {
      // TODO: a Behringer chama esse clone de MS-101 (nao pode usar o nome
      // SH-101). Troque para "Behringer SH-101" se preferir como voce fala.
      name: "Behringer MS-101",
      note: "SH-101 clone.",
    },
    {
      name: "ProCo RAT",
      note: "Distortion pedal the 808 gets recorded through. On Plano Z and Snitchin' Bitches.",
    },
  ],

  /* Vai depois da lista, em texto menor. Vazio, a linha nao aparece. */
  equipmentFootnote:
    "Anything else you hear on these records was borrowed from friends.",
};
