import * as THREE from "three";

/**
 * Gatilho de interação por proximidade.
 *
 * Alternativa ao raycast do centro da tela: em vez de exigir que a mira
 * encoste no mesh — o que é difícil com objetos pequenos como um 303 numa
 * prateleira —, a zona liga quando a câmera chega perto E está olhando na
 * direção dela.
 *
 * O "olhando para" é um produto escalar entre a frente da câmera e a direção
 * até a zona, não um raio: passa a valer um cone largo em vez de um ponto,
 * então o gatilho perdoa a mira sem virar um gatilho mágico que dispara de
 * costas.
 *
 * A âncora é o centro da caixa que envolve os meshes da zona, calculada uma
 * vez quando o modelo carrega. Assim nada aqui tem coordenada fixa: mexer os
 * objetos no Blender move a zona junto.
 */
export class ProximityZones {
  /**
   * @param {THREE.Camera} camera
   * @param {Array<{id: string, objects: string[], radius: number,
   *                facing?: number, modal: string, prompt: string}>} zones
   */
  constructor(camera, zones) {
    this.camera = camera;
    this.zones = zones.map((zone) => ({ facing: 0.35, ...zone, anchor: null }));

    /*
     * Mundo ativo. Uma zona com `world` so vale quando bate com este campo,
     * senao o gatilho do computador continuaria disparando dentro da galeria,
     * onde aquele mesh nem esta visivel.
     */
    this.world = null;

    // Reaproveitados a cada frame para não alocar Vector3 no loop de render.
    this._forward = new THREE.Vector3();
    this._toZone = new THREE.Vector3();
  }

  /**
   * Liga as zonas a um mundo já montado. Precisa rodar depois de o objeto
   * entrar na cena e receber escala/posição, senão a caixa sai no lugar
   * errado.
   *
   * Pode ser chamado uma vez por mundo: zona que não acha nenhum mesh neste
   * root fica intocada, com a âncora que já tinha. Sem isso, ligar a galeria
   * apagaria as zonas do quarto, que foram ligadas contra o .glb.
   *
   * @returns {Array<{id: string, found: number, missing: string[]}>} um
   *   relatório só das zonas que este root resolveu — nome errado no Blender
   *   vira uma zona que nunca dispara, e em silêncio isso é difícil de ver.
   */
  bind(root) {
    root.updateMatrixWorld(true);

    const box = new THREE.Box3();
    const report = [];

    this.zones.forEach((zone) => {
      box.makeEmpty();
      const missing = [];

      zone.objects.forEach((name) => {
        const object = root.getObjectByName(name);
        if (object) box.expandByObject(object);
        else missing.push(name);
      });

      // Nada deste root: a zona é de outro mundo, deixa como está.
      if (box.isEmpty()) return;

      zone.anchor = box.getCenter(new THREE.Vector3());
      report.push({
        id: zone.id,
        found: zone.objects.length - missing.length,
        missing,
      });
    });

    return report;
  }

  /**
   * A zona ativa neste frame: a mais próxima entre as que estão dentro do
   * raio e dentro do cone. Null quando nenhuma se qualifica.
   */
  update() {
    this.camera.getWorldDirection(this._forward);

    let best = null;
    let bestDistance = Infinity;

    for (const zone of this.zones) {
      if (!zone.anchor) continue;
      if (zone.world && zone.world !== this.world) continue;

      const distance = this.camera.position.distanceTo(zone.anchor);
      if (distance > zone.radius || distance >= bestDistance) continue;

      this._toZone.subVectors(zone.anchor, this.camera.position).normalize();
      if (this._forward.dot(this._toZone) < zone.facing) continue;

      best = zone;
      bestDistance = distance;
    }

    return best;
  }
}
