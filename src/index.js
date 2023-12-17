import main from './main.js'

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(main(env[env.KV_NAME], env));
  },
};
