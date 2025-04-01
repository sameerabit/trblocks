const commonProperties = ['innerHTML', 'innerText', 'src'];
const htmlUtil = {
  toggleAttribute(nodes, attr, value) {
    nodes.forEach((n) => (n.hasAttribute(attr) ? n.removeAttribute(attr) : n.setAttribute(attr, value)));
  },

  toggleEnabledDisabled(domNodes) {
    this.toggleAttribute(domNodes, 'disabled', 'disabled');
  },

  /**
   * @param {string} type
   * @param {object} attributes
   * @param {Node} parent
   * @param {boolean|Node} before - An optional argument to specify the position of the node.
   * If true, then insert first and if instance of Node insert before the given node.
   *
   * @returns {HTMLElement}
   */
  create(type, attributes, parent, before = null) {
    const newDOMNode = document.createElement(type);

    if (attributes) {
      Object.entries(attributes).forEach(([attribute, value]) => {
        if (value === undefined) return;
        if (commonProperties.includes(attribute)) {
          newDOMNode[attribute] = value;
        } else if (attribute === 'class') {
          htmlUtil.addClass(newDOMNode, value);
        } else {
          newDOMNode.setAttribute(attribute, value);
        }
      });
    }
    if (parent) {
      if (before instanceof Node) {
        parent.insertBefore(newDOMNode, before);
      } else if (before === true) {
        parent.insertBefore(newDOMNode, parent.firstChild);
      } else if (before === 'after') {
        parent.parentNode.insertBefore(newDOMNode, parent.nextSibling);
      } else {
        parent.appendChild(newDOMNode);
      }
    }

    return newDOMNode;
  },
  addClass(node, classes) {
    const allClasses = classes.split(' ');

    allClasses.forEach((className) => {
      if (className.length > 0) { // className must not be empty, see classList.add
        node.classList.add(className);
      }
    });

    return node;
  },
  removeClass(node, classes) {
    const allClasses = classes.split(' ');

    allClasses.forEach((className) => node.classList.remove(className));

    return node;
  },
};

export default htmlUtil;
