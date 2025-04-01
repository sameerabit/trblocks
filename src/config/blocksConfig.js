const STATIC = {
  URL: 'https://static.cdn.entryscape.com/',
  APP: 'suite',
  VERSION: 'latest',
};

const ASSETS_URL = `${STATIC.URL}${STATIC.APP}/${STATIC.VERSION}/assets/`;
const LOGO_SVG_URL = `${ASSETS_URL}entryscape.svg`;
export default {
  entrystore: { authentification: false },
  itemstore: {
    '!choosers': [
      'EntryChooser',
      'GeonamesChooser',
      'GeoChooser',
    ],
    relativeBundlePath: true,
  },
  entryscape: {
    static: {
      url: STATIC.URL,
      app: STATIC.APP,
      version: STATIC.VERSION,
    },
  },
  theme: {
    appName: 'EntryScape',
    oneRowNavbar: false,
    localTheme: false,
    default: {
      appName: 'EntryScape',
      logo: LOGO_SVG_URL,
      themePath: ASSETS_URL,
      assetsPath: ASSETS_URL,
    },
  },
  locale: {
    fallback: 'en',
    supported: [
      { lang: 'en', flag: 'gb', label: 'English', labelEn: 'English' },
      { lang: 'sv', flag: 'se', label: 'Svenska', labelEn: 'Swedish' },
    ],
  },
  site: null
};