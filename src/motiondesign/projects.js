/**
 * Fonte única de verdade da página de motion design.
 *
 * A grade em /motiondesign/ e a página de detalhe em /motiondesign/project/
 * leem daqui, então adicionar um trabalho novo é só acrescentar um objeto
 * nesta lista — não precisa mexer em HTML nem no vite.config.
 *
 * Os caminhos são absolutos (/videos/…) porque as duas páginas estão em
 * profundidades diferentes; caminho relativo quebraria em uma das duas.
 *
 * Campos vazios ("") são TODO: preencha e eles aparecem sozinhos na página.
 * Enquanto estiverem vazios, a página simplesmente não mostra a linha.
 *
 * `media` aceita vídeo e imagem na mesma lista — o tipo vem da extensão
 * (ver isImage abaixo), então basta acrescentar o caminho na ordem em que a
 * peça deve aparecer. O primeiro item da lista é a prévia do card.
 */
export const projects = [
  {
    id: "everest",
    title: "Everest",
    tools: "After Effects, Blender, Premiere Pro", 
    client: "Everest", 
    year: "2026", 
    role: "Motion Designer, Video Editor", 
    description: "In 2026 I joined Colírio communication team as a motion designer for the Everest brand. The project involved creating a series of campaigns and animations to enhance the brand's communication identity.", 
    media: [
      "/videos/everest/06.png",
      "/videos/everest/Reels_Conceito_1000x1500.mp4",
      "/videos/everest/Niva_Gelo_Final_3.mp4",
      "/videos/everest/04.png",
    ],
  },
  {
    id: "outermost-records",
    title: "Outermost Records",
    tools: "After Effects and Blender",
    client: "Outermost Records", // TODO: confirmar
    year: "2023", // TODO
    role: "Motion Designer", // TODO: ex. "Identidade em movimento e promos"
    description: "Moving visual identity for Outermost Records while studying motion design at Aprender Design. This case was a highlight and later atteched to aprender design students work page.", // TODO
    media: [
      "/videos/OMR MOTION 2 (BW).mp4",
      "/videos/omr final reel art.mp4",
      "/videos/THE VISUAL.mp4",
      "/videos/OMR MOTION 3 (BW).mp4",
      "/videos/OMR MOTION 4 (BW).mp4",
      "/videos/OMR-DIF-1.mp4",
      "/videos/splash 1 final.mp4",
    ],
  },
  {
    id: "perx",
    title: "PERX",
    tools: "After Effects",
    client: "Paradoxy Records", // TODO
    year: "2025", // TODO
    role: "Album Release",
    description: "Motion Design for the album release and promotional campaign", // TODO
    media: ["/videos/PERX TRACK 1.mp4"],
  },
  {
    id: "anddy-williams",
    title: "Animated agenda",
    tools: "After Effects",
    client: "Anddy Williams", 
    year: "2026", 
    role: "Motion Designer", 
    description: "Animated Motions design for the agenda of Anddy Williams designed by Joyce Kiesel", 
    media: ["/videos/Anddy_Agenda.mp4"],
  },
  {
    id: "under-division",
    title: "Under Division",
    tools: "After Effects + Blender",
    client: "Under Division", 
    year: "2026",
    role: "Animated flyer",
    description: "Recreated a 2D flyer in a 3D environment with physics interaction in the logotype", 
    media: ["/videos/UD_FLYER.mp4"],
  },
  {
    id: "1010-bh",
    title: "1010 BH",
    tools: "After Effects",
    client: "1010 BH", 
    year: "2025", 
    role: "Animated flyer",
    description: "Animated flyer for 1010 BH based on Joyce Kiesel's design", 
    media: ["/videos/1010_Listas_Motion.mp4"],
  },
  {
    id: "le-chope-des-artistes",
    title: "Le chope des Artistes",
    tools: "After Effects",
    client: "Le chope des Artistes Paris", 
    year: "2025", 
    role: "Animated flyer",
    description: "Animated flyer for Le chope des Artistes Paris based on Joyce Kiesel's design", 
    media: ["/videos/Flyer_Paris.mp4"],
  },
  {
    id: "nossa-chance",
    title: "Nossa Chance",
    tools: "After Effects",
    client: "TZ da Coronel",
    year: "2025",
    role: "Motion Designer", 
    description: "Animated presentation introduction", 
    media: ["/videos/NC-1.mp4"],
  },
  {
    id: "evoe",
    title: "EVOÉ",
    tools: "After Effects",
    client: "EVOÉ",
    year: "2025", 
    role: "Motion Designer", 
    description: "Animated Website introduction, Logotype animation and Figma prototype for development", 
    media: ["/videos/evoe.mp4"],
  },
  {
    id: "paper-thin-films",
    title: "Paper Thin Films",
    tools: "After Effects",
    client: "Paper Thin Films", // TODO
    year: "2025", // TODO
    role: "Motion Designer", // TODO
    description: "Animated logotype for Paper Thin Films's movies introductions", // TODO
    media: ["/videos/Paper-thin-logo-5.mp4"],
  },
  {
    id: "santander-data-week",
    title: "Santander Data Week",
    tools: "After Effects",
    client: "Santander", 
    year: "2025", 
    role: "Motion Designer", 
    description: "Animated layouts for LED panels in the Santander Data Week event", 
    media: ["/videos/DTW-25-Motion-TV-5.mp4"],
  },
  {
    id: "casa-do-povo",
    title: "Casa do Povo",
    tools: "After Effects",
    client: "Casa do Povo", 
    year: "2025", 
    role: "Motion Designer", 
    description: "Animated logotype for Casa do Povo, UX and UI motion prototypes", 
    media: ["/videos/render-1.mp4", "/videos/render-2.mp4"],
  },
  {
    id: "experimentos",
    title: "Estudos",
    tools: "After Effects",
    client: "", 
    year: "2024", 
    role: "Motion Designer", 
    description: "", 
    media: ["/videos/ex-branding-1.mp4", "/videos/808909.mp4"],
  },
  {
    id: "estudos",
    title: "Estudos",
    tools: "After Effects",
    client: "Motion Design Course", 
    year: "2023", 
    role: "Motion Designer", 
    description: "Logotype animation studies at Aprender Design", 
    media: ["/videos/EX-2-USEBERRY-LOGOS-CORREÇÃO.mp4"],
  },
];

/*
 * O tipo da peça vem da extensão do arquivo: assim `media` continua sendo
 * uma lista simples de caminhos, sem precisar declarar o tipo item a item.
 */
const IMAGE_EXTENSIONS = /.(png|jpe?g|webp|avif|gif)$/i;

export const isImage = (src) => IMAGE_EXTENSIONS.test(src);

export const findProject = (id) => projects.find((p) => p.id === id);
