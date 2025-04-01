import handlebars from 'handlebars';

export default function (template, names) {
  const group = {};
  names.forEach((name) => {
    handlebars.registerHelper(name, (options) => {
      group[name] = options.fn();
    });
  });
  handlebars.compile(template)({});
  names.forEach((name) => {
    handlebars.unregisterHelper(name);
  });

  return group;
}
