import filter from 'blocks/utils/filter';
import registry from 'blocks/registry';
import handlebars from 'handlebars/dist/cjs/handlebars';

export default (node, data) => {
  // node.classList.remove('entryscape');
  registry.onChange(data.use, (results) => {
    node.classList.add('esbResults');
    let templateStr = '';
    if (data.template) {
      templateStr = data.template;
    } else if (filter.isEmpty() && !(results.term && results.term !== '' && results.term !== '*')) {
      node.classList.remove('esbResults--filtered');
      if (data.templatenofilter || data.templateNoFilter) {
        // No filter
        templateStr = data.templatenofilter || data.templateNoFilter;
      }
    } else {
      node.classList.add('esbResults--filtered');
      if (results.resultsize > 0) {
        if (data.templatefilter || data.templateFilter) {
          // Filter & results
          templateStr = data.templatefilter || data.templateFilter;
        }
      } else if (data.templatefilternoresults || data.templateFilterNoResults) {
        // Filter & no results
        templateStr = data.templatefilternoresults || data.templateFilterNoResults;
      }
    }
    const handlebarTemplate = handlebars.compile(templateStr, { data: { strict: true, knownHelpersOnly: true } });
    node.innerHTML = handlebarTemplate(results);
  }, true);
};
