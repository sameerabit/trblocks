export default (config) => {
  if (config.routes) {
    const url = window.location.href;
    const route = config.routes.find(r => r.regex.test(url));
    if (route) {
      const exploded = url.match(route.regex);

      const result = {};
      const extract = (prop) => {
        const val = route[prop];
        // eslint-disable-next-line default-case
        let newval = val;
        switch (typeof val) {
          case 'number':
            result[prop] = exploded[val];
            break;
          case 'string':
            if (val.indexOf('${1}') !== -1) {
              newval = newval.replace('${1}', exploded[1]);
            }
            if (val.indexOf('${2}') !== -1) {
              newval = newval.replace('${2}', exploded[2]);
            }
            result[prop] = newval;
            break;
          case 'object':
            result[prop] = newval;
        }
      };
      extract('page_language');
      extract('uri');
      extract('entry');
      extract('context');
      extract('lookup');
      extract('lookupLiteral');
      extract('lookupURI');
      extract('constraints');
      return result;
    }
  }
  return undefined;
};
