import main from './main.js'

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(main(env.CACHE, env));
  },
};
