import Selectize from '@selectize/selectize';

Selectize.define('preserve_search', function () {
  const self = this;

  this.onBlur = (function () {
    const original = self.onBlur;

    return function (e) {
      const inputValue = this.$control_input.val();
      original.apply(this, [e]);
      this.setTextboxValue(inputValue);
    };
  }());
});
