import * as THREE from "three";

/**
 * Troca de ambiente sem trocar de cena.
 *
 * Os dois mundos vivem na mesma THREE.Scene e alternam por visibilidade, em
 * vez de duas Scenes com um RenderPass reapontado. O EffectComposer é montado
 * dentro do handler do ENTER e o renderPass fica no escopo dele; mexer nisso
 * para uma troca de sala seria remexer no pipeline de render inteiro por um
 * ganho nenhum — visibilidade já tira o mundo inativo do render e desliga as
 * luzes dele junto.
 *
 * Cada mundo guarda onde você estava ao sair, então voltar devolve o jogador
 * no lugar de onde ele saiu, e não no spawn.
 */
export class WorldManager {
  /**
   * @param {object} deps
   * @param {THREE.Scene} deps.scene
   * @param {THREE.Camera} deps.camera
   * @param {object} deps.controls – o FirstPersonCameraControl
   */
  constructor({ scene, camera, controls }) {
    this.scene = scene;
    this.camera = camera;
    this.controls = controls;

    this.worlds = new Map();
    this.current = null;
  }

  /**
   * @param {string} id
   * @param {object} world
   * @param {THREE.Object3D} world.root      – o que aparece
   * @param {THREE.Object3D} world.colliders – contra o que o jogador esbarra
   * @param {THREE.Vector3}  world.spawn
   * @param {THREE.Vector3} [world.lookAt]
   * @param {*} [world.background]  – aplicado em scene.background ao entrar
   * @param {*} [world.environment] – idem para scene.environment
   * @param {Function} [world.onEnter]
   * @param {Function} [world.onExit]
   */
  register(id, world) {
    this.worlds.set(id, { id, ...world, lastPosition: null, lastQuaternion: null });
  }

  get currentId() {
    return this.current?.id ?? null;
  }

  /**
   * @param {string} id
   * @param {object} [options]
   * @param {boolean} [options.resume=true] – voltar para onde parou, se já
   *   esteve neste mundo antes; false força o spawn.
   */
  enter(id, { resume = true } = {}) {
    const next = this.worlds.get(id);
    if (!next || next === this.current) return;

    const previous = this.current;

    if (previous) {
      // Guarda a pose antes de qualquer coisa mexer na câmera.
      previous.lastPosition = this.camera.position.clone();
      previous.lastQuaternion = this.camera.quaternion.clone();
      previous.root.visible = false;
      previous.onExit?.();
    }

    next.root.visible = true;

    if (next.background !== undefined) this.scene.background = next.background;
    if (next.environment !== undefined) this.scene.environment = next.environment;

    /*
     * A câmera vai para o lugar antes de o controle religar: o setter
     * `enabled` do fpControls guarda o euler atual, então religar primeiro
     * congelaria a rotação antiga por cima da nova.
     */
    this.controls.enabled = false;

    if (resume && next.lastPosition) {
      this.camera.position.copy(next.lastPosition);
      this.camera.quaternion.copy(next.lastQuaternion);
    } else {
      this.camera.position.copy(next.spawn);
      if (next.lookAt) this.camera.lookAt(next.lookAt);
    }

    this.controls.colliders = next.colliders;
    this.controls.enabled = true;

    this.current = next;
    next.onEnter?.();
  }
}
