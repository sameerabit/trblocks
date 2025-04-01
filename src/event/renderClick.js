import registry from 'blocks/registry';
import handlebars from 'blocks/boot/handlebars';
import htmlUtil from 'blocks/utils/htmlUtil';
import params from 'blocks/boot/params';


export default (node, data) => {
  if (data.class) {
    htmlUtil.addClass(node, data.class);
  }

  if (data.template) {
    params.onInit((urlParams) => {
      handlebars.run(node, data, null, null);
      const inputs = node.querySelectorAll('input');
      if (urlParams[data.signal]) {
        const stateval = urlParams[data.signal] || [];
        inputs.forEach((inp) => {
          if (stateval.indexOf(inp.value) !== -1) {
            inp.checked = true;
            registry.set(data.signal, inp.value);
          } else {
            inp.checked = false;
          }
        });
      }
      inputs.forEach((inp) => {
        inp.onchange = () => {
          const latestUrlParams = params.getUrlParams();
          latestUrlParams[data.signal] = inp.value;
          params.setLocation('', latestUrlParams);
          registry.set(data.signal, inp.value);
        };
      });
    });
  } else {
    node.onclick = (ev) => {
      registry.set(data.signal, {
        event: ev,
        data,
      });
    };
  }
};
