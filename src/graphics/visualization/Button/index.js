import './escoButton.css';

/**
 * https://www.w3schools.com/bootstrap/bootstrap_ref_css_buttons.asp
 * element : HTML element to use for button
 * type : btn-?
 * text : text in button
 * className : a single class name TODO make array
 * onclick : function
 *
 * @type {{view: ((vnode))}}
 */
export default {
  bid: 'escoButton btn',
  view(vnode) {
    const {
      Element = 'button',
      Inner = 'span',
      href,
      target,
      externalLink = false,
      text = null,
      popover,
      onclick,
      iconClassNames = null,
      disabled = false,
      classNames = [],
    } = vnode.attrs;
    classNames.push(this.bid);
    if (externalLink) {
      classNames.push('spaExplicitLink');
    }
    return <Element
      title={popover}
      class={classNames.join(' ')}
      onclick={onclick}
      disabled={disabled}
      href={href}
      target={target}>
      {text !== null && <Inner>{text}</Inner>}
      {iconClassNames !== null && <i class={['fas', iconClassNames].join(' ')}></i>}
    </Element>;
  },
};
