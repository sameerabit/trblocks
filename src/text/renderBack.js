export default (node, data) => {
  let referrer = document.referrer;
  if (referrer) {
    if (data.test) {
      try {
        if (!new RegExp(data.test).test(referrer)) {
          referrer = undefined;
        }
      } catch (e) {
      }
    } else if (referrer.indexOf(window.location.origin) !== 0) {
      referrer = undefined;
    }
  }

  let a;
  if (node.nodeName === 'A') {
    a = node;
  } else {
    if (node.parentElement.nodeName === 'A') {
      a = node.parentElement;
    } else {
      document.createElement('a');
      a.href = data.href;
      a.innerHTML = data.label;
      a.tooltip = data.tooltip;
      a.className = data.className;
      node.appendChild(a);
    }
  }
  if (referrer && window.history.length > 1) {
    a.onclick = () => {
      setTimeout(() => {
        window.history.back();
      }, 1);
      return false;
    };
  }
};
