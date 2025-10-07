import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import yaml from 'js-yaml'

export function yamlConfigPlugin() {
  const virtualModuleId = '@/config'
  const resolvedVirtualModuleId = '\0' + virtualModuleId
  let configPath

  return {
    name: 'vite-plugin-yaml-config',
    resolveId(id) {
      if (
        id === virtualModuleId ||
        id === './src/config' ||
        id === virtualModuleId.replace('@/', './src/')
      ) {
        return resolvedVirtualModuleId
      }
    },
    load(id) {
      if (id === resolvedVirtualModuleId) {
        configPath = join(dirname(fileURLToPath(import.meta.url)), '../config.yaml')
        // 添加文件到监听列表,文件变化时会触发热重载
        this.addWatchFile(configPath)

        const configFile = readFileSync(configPath, 'utf8')
        const config = yaml.load(configFile)

        return `export default ${JSON.stringify(config, null, 2)};
export const site = ${JSON.stringify(config.site, null, 2)};
export const author = ${JSON.stringify(config.author, null, 2)};
export const hero = ${JSON.stringify(config.hero, null, 2)};
export const color = ${JSON.stringify(config.color, null, 2)};
export const menus = ${JSON.stringify(config.menus, null, 2)};
export const posts = ${JSON.stringify(config.posts, null, 2)};
export const footer = ${JSON.stringify(config.footer, null, 2)};
export const waline = ${JSON.stringify(config.waline, null, 2)};
export const sponsor = ${JSON.stringify(config.sponsor, null, 2)};
export const analytics = ${JSON.stringify(config.analytics, null, 2)};`
      }
    },
    handleHotUpdate({ file, server }) {
      // 当 config.yaml 文件变化时,触发完整页面重载
      if (file === configPath) {
        server.ws.send({
          type: 'full-reload',
          path: '*',
        })
      }
    },
  }
}
