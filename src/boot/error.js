export default function (node, data) {
  node.innerHTML = 'Blocks error, click to see details.';
  node.setAttribute('title', data.error);
  node.classList.add('entryscape-boot-error');
  node.onclick = () => {
    alert(`${data.error}\n${data.errorCause}`);
  };
}
