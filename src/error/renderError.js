import DOMUtil from 'blocks/utils/htmlUtil';
import getEntry from 'blocks/utils/getEntry';
import { INPROGRESS } from './Async';
import { setOpen, setProgressDelay, setOnOpenCallback, setErrorStateCallback } from './errorHandler';

const MISSING_ENTRY = 10;

const isInViewport = (element) => {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
};

export default (node, data) => {
  if (data.delay) {
    setProgressDelay(parseInt(data.delay, 10));
  }
  node.style.display = 'none';
  const errorContainer = DOMUtil.create('div', {
    class: 'esbError alert alert-warning alert-dismissible fade show',
    role: 'alert',
    'aria-live': 'polite',
  }, node);
  const messageIconSpinner = DOMUtil.create('i', {
    'aria-hidden': 'true',
    class: 'fas fa-spinner fa-spin esbError__icon',
  }, errorContainer);
  const messageIconWarning = DOMUtil.create('i', {
    'aria-hidden': 'true',
    class: 'fas fa-exclamation-triangle esbError__icon',
  }, errorContainer);
  messageIconWarning.style.display = 'none';

  const message = DOMUtil.create('span', { class: 'esbError_message' }, errorContainer);
  const dissmiss = DOMUtil.create('button', {
    type: 'button',
    class: 'close',
    title: data.close || 'close',
    'aria-label': data.close || 'close',
  }, errorContainer);
  DOMUtil.create('i', { 'aria-hidden': 'true', class: 'fas fa-times' }, dissmiss);
  dissmiss.onclick = () => setOpen(false);
  setOnOpenCallback((b) => {
    node.style.display = b ? 'block' : 'none';
  });

  const errorStateCallback = (state) => {
    if (state === INPROGRESS) {
      messageIconSpinner.style.display = 'inline-block';
      messageIconWarning.style.display = 'none';
      dissmiss.style.display = 'none';
      errorContainer.classList.remove('alert-danger');
      errorContainer.classList.add('alert-warning');
    } else {
      messageIconSpinner.style.display = 'none';
      messageIconWarning.style.display = 'inline-block';
      dissmiss.style.display = 'inline-block';
      errorContainer.classList.remove('alert-warning');
      errorContainer.classList.add('alert-danger');
    }
    if (state === INPROGRESS) {
      message.innerHTML = data.inprogress || data.inProgress || 'Slow internet connection, please wait.';
    } else if (state === MISSING_ENTRY) {
      if (data.missingEntryRedirect) {
        window.location.href = data.missingEntryRedirect;
      }
      message.innerHTML = data.missingEntry || 'Missing page parameters, unclear which entry to show.';
      node.style.display = 'block';
    } else {
      if (data.genericRedirect) {
        window.location.href = data.genericRedirect;
      }
      message.innerHTML = data.generic || 'An error occured, please try again later or reload the page.';
    }
    if (!isInViewport(errorContainer)) {
      errorContainer.scrollIntoView({
        behavior: 'smooth',
      });
    }
  };
  setErrorStateCallback(errorStateCallback);
  if (data.requireEntry) {
    getEntry(data, (entry) => {
      if (!entry) {
        errorStateCallback(MISSING_ENTRY);
      }
    }, () => {
      errorStateCallback(MISSING_ENTRY);
    });
/*    params.onInit((urlParams) => {
      const cid = urlParams.context || config.econfig.context;
      const eid = urlParams.entry || config.econfig.entry;
      const uri = urlParams.uri || config.econfig.uri;
      const lookup = urlParams.lookup || config.econfig.lookup;
      if ((cid === undefined || eid === undefined) && uri === undefined && lookup === undefined) {
        errorStateCallback(MISSING_ENTRY);
        setOpen(true);
      }
    });*/
  }
};
