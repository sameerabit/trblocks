export default (node, data) => {
  const style = document.createElement('style');
  const media = [];
  if (data.media) {
    media.push(data.media);
  }
  if (data.max) {
    media.push(`(max-width: ${data.max})`);
  }
  if (data.min) {
    media.push(`(min-width: ${data.min})`);
  }

  let rules = [];
  if (data.rules) {
    Object.keys(data.rules).forEach(rule => rules.push(`${rule} {${data.rules[rule]}}`));
  } else {
    const selector = data.selector ? data.selector : `.${data.class}`;
    rules.push(`${selector} {${data.style}}`);
  }
  style.innerHTML = `
@media ${media.join(' and ')} {
  ${rules.join('\n')}
}`;
  document.head.appendChild(style);
};
