let d3;
const loadDependencies = async () => {
  if (!d3) {
    d3 = await import(/* webpackChunkName: "d3" */ 'd3');
  }
};

const addChildrenNodes = (expandableNode) => {
  const allChildren = expandableNode.data.children;
  const newHierarchyChildren = [];

  // create array of the nodes that we can add to the tree
  allChildren.forEach((child) => {
    const newNode = d3.hierarchy(child); // create a node
    newNode.depth = expandableNode.depth + 1; // update depth depends on parent
    newNode.height = expandableNode.height;
    newNode.parent = expandableNode; // set parent
    newNode.id = child.id; // set uniq id
    newNode.children = null;

    newHierarchyChildren.push(newNode);
  });

  // add to the parent's children array and collapse
  expandableNode.children = newHierarchyChildren;
};

/**
 * Correct type and default values
 *
 * @param {string|number} boxWidth
 * @param {string|number} boxHeight
 * @param {string|number} maxCharacter
 * @param {string|number} scale
 * @returns {{boxWidth: (number), boxHeight: (number), maxCharacter: (number), scale: (number)}}
 */
const getConfig = ({ boxWidth = 120, boxHeight = 12, maxCharacter = 20, scale = 1 }) => {
  const getNumber = (value) => {
    return typeof value === 'number' ? value : parseFloat(value);
  };

  return {
    boxWidth: getNumber(boxWidth),
    boxHeight: getNumber(boxHeight),
    maxCharacter: getNumber(maxCharacter),
    scale: getNumber(scale),
  };
};

export default (treeData, loadChildren, srcNode, data) => {
  loadDependencies().then(() => {
    const { boxWidth, boxHeight, maxCharacter, scale } = getConfig(data);
    const margin = ({ top: 10, right: 10, bottom: 10, left: 10 });
    const diagonal = d3.linkHorizontal().x(d => d.y).y(d => d.x).source(d =>
      ({ x: d.source.x, y: d.source.y + boxWidth }));
    const cutOfText = txt => (txt.length > maxCharacter ? `${txt.substr(0, maxCharacter)}…` : txt);

    const root = d3.hierarchy(treeData);
    root.x0 = 0;
    root.y0 = 0;
    const tree = d3.tree().nodeSize([boxHeight + 4, boxWidth + 80]);
    root.descendants().forEach((d, i) => {
      d.id = d.data.id;
    });

    const svg = d3.select(srcNode).append('svg')
      .style('font', '10px sans-serif')
      .style('user-select', 'none');

    const gLink = svg.append('g')
      .attr('fill', 'none')
      .attr('stroke', '#555')
      .attr('stroke-opacity', 0.4)
      .attr('stroke-width', 1.5);

    const gNode = svg.append('g')
      .attr('pointer-events', 'all');

    function update(source) {
      const duration = d3.event && d3.event.altKey ? 2500 : 250;
      const nodes = root.descendants().reverse();
      const links = root.links();

      // Compute the new tree layout.
      tree(root);

      let left = root;
      let right = root;
      let top = root;
      let bottom = root;
      root.eachBefore((node) => {
        if (node.x < left.x) left = node;
        if (node.x > right.x) right = node;
        if (node.y < top.y) top = node;
        if (node.y > bottom.y) bottom = node;
      });

      const height = right.x - left.x + margin.top + margin.bottom;
      const width = bottom.y - top.y + margin.left + margin.right+boxWidth;

      const transition = svg.transition()
        .duration(duration)
        .attr('viewBox', [-margin.left, left.x - margin.top, width, height])
        .tween('resize', window.ResizeObserver ? null : () => () => svg.dispatch('toggle'));
      svg.style('width', `${width * scale}px`);


      // Update the nodes…
      const node = gNode.selectAll('g')
        .data(nodes, d => d.id);

      // Enter any new nodes at the parent's previous position.
      const nodeEnter = node.enter().append('g')
        .attr('transform', () => `translate(${source.y0},${source.x0})`)
        .attr('class', (d) => {
          if (d === root) {
            return 'esbHierarchy__node esbHierarchy__rootNode';
          } else if (d.data.hasChildren) {
            return 'esbHierarchy__node esbHierarchy__expandableNode';
          }
          return 'esbHierarchy__node esbHierarchy__leafNode';
        })
        .on('click', (event, d) => {
          if (d.children) {
            d.children = null;
            d.data.open = false;
            update(d);
          } else if (d.data.hasChildren) {
            loadChildren(d.data).then(() => {
              if (d.data.children) {
                d.data.open = true;
                addChildrenNodes(d);
              }
              update(d);
            });
          }
        });

      nodeEnter.append('rect')
        .attr('y', -6)
        .attr('width', boxWidth)
        .attr('height', boxHeight);

      nodeEnter.append('text')
        .attr('dy', '0.31em')
        .attr('x', 6)
        .attr('text-anchor', 'start')
        .text(d => cutOfText(d.data.name))
        .clone(true)
        .lower()
        .attr('stroke-linejoin', 'round')
        .attr('stroke-width', 3)
        .attr('stroke', 'white');

      // Transition nodes to their new position.
      node.merge(nodeEnter).transition(transition)
        .attr('transform', d => `translate(${d.y},${d.x})`)
        .attr('fill-opacity', 1)
        .attr('stroke-opacity', 1);

      // Transition exiting nodes to the parent's new position.
      node.exit().transition(transition).remove()
        .attr('transform', () => `translate(${source.y},${source.x})`)
        .attr('fill-opacity', 0)
        .attr('stroke-opacity', 0);

      // Update the links…
      const link = gLink.selectAll('path')
        .data(links, d => d.target.id);

      // Enter any new links at the parent's previous position.
      const linkEnter = link.enter().append('path')
        .attr('d', () => {
          const o = { x: source.x0, y: source.y0 };
          return diagonal({ source: o, target: o });
        });

      // Transition links to their new position.
      link.merge(linkEnter).transition(transition)
        .attr('d', diagonal);

      // Transition exiting nodes to the parent's new position.
      link.exit().transition(transition).remove()
        .attr('d', () => {
          const o = { x: source.x, y: source.y };
          return diagonal({ source: o, target: o });
        });

      // Stash the old positions for transition.
      root.eachBefore((d) => {
        d.x0 = d.x;
        d.y0 = d.y;
      });
    }

    update(root);
  });
};
