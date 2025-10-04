declare module '@/config' {
  export interface Social {
    name: string
    icon: string
    url: string
    color: string
  }

  export interface ColorPair {
    light: string
    dark: string
  }

  export interface Site {
    url: string
    title: string
    description: string
    keywords: string
    lang: string
    favicon: string
    appleTouchIcon: string
  }

  export interface Author {
    name: string
    twitterId: string
    avatar: string
  }

  export interface Hero {
    greeting: string
    name: string
    bio: string
    description: string
    socials: Social[]
    yiyan: string
  }

  export interface Color {
    accent: ColorPair[]
    bg: {
      primary: ColorPair
      secondary: ColorPair
    }
    text: {
      primary: ColorPair
      secondary: ColorPair
    }
    border: {
      primary: ColorPair
    }
  }

  export interface Menu {
    name: string
    link: string
    icon: string
  }

  export interface Posts {
    perPage: number
  }

  export interface Footer {
    startTime: string
  }

  export interface Waline {
    serverURL: string
  }

  export interface Sponsor {
    wechat: string
  }

  export interface Analytics {
    enable: boolean
    google: {
      measurementId: string
    }
    umami: {
      serverUrl: string
      websiteId: string
    }
    microsoftClarity: {
      projectId: string
    }
  }

  export interface Like {
    enable: boolean
    showInCard: boolean
    showRanking: boolean
    rankingCount: number
  }

  export interface Config {
    site: Site
    author: Author
    hero: Hero
    color: Color
    menus: Menu[]
    posts: Posts
    footer: Footer
    waline: Waline
    sponsor: Sponsor
    analytics: Analytics
    like: Like
  }

  export const site: Site
  export const author: Author
  export const hero: Hero
  export const color: Color
  export const menus: Menu[]
  export const posts: Posts
  export const footer: Footer
  export const waline: Waline
  export const sponsor: Sponsor
  export const analytics: Analytics
  export const like: Like

  const config: Config
  export default config
}
