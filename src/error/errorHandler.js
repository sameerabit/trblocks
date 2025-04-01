import registry from 'blocks/registry';
import {
  GENERIC_PROBLEM,
  UNAUTHORIZED,
  INPROGRESS,
  SIGNED_OUT,
  LOST_CONNECTION,
  extractProblem,
  addIgnore,
  checkIgnoreTrue,
  checkIgnore,
} from './Async';

// Case Generic problem: Something went wrong... send error report / continue anyway / ok,
//  proceed anyway.
// Case signed out: Sign in again - > close dialog and open sign in dialog
// Case lost connection: No contact with server, retry

let progressDelay = 2000;

let timer;
let open;
let _setOpen;
let promises = [];
let setErrorState;

const setPromises = (ps) => {
  promises = ps;
};

export const setOpen = (b) => {
  if (_setOpen) {
    _setOpen(b);
  }
  open = b;
  if (!b) {
    setPromises([]);
  }
};

const removePromiseTimer = (obj) => {
  clearTimeout(obj.timer);
  delete obj.timer;
  timer = false;
};
const getPromiseObject = promise =>
  promises.find(o => o.promise === promise);

const getWorstReason = () => {
  let rejectionReason = INPROGRESS;
  for (let i = 0; i < promises.length; i++) {
    const obj = promises[i];
    if (obj.resolved === false) {
      const reason = extractProblem(obj.err);
      if (reason > rejectionReason) {
        rejectionReason = reason;
      }
    }
  }
  return rejectionReason;
};

const updateErrorState = () => {
  const rejectionReason = getWorstReason(promises);
  // ! The following part leads to an infinite loop, continually adding getUserInfo promises
  // if (rejectionReason === UNAUTHORIZED) {
  //   entrystore
  //     .getAuth()
  //     .getUserInfo(true)
  //     .then((userinfo) => {
  //       setErrorState(userinfo.id === '_guest' ? SIGNED_OUT : GENERIC_PROBLEM);
  //     });
  // } else {
  if (setErrorState) {
    setErrorState(rejectionReason);
  }
  // }
};

const update = () => {
  const allResolved = promises.find(p => !p.resolved) === undefined;
  if (allResolved) {
    setOpen(false);
  } else {
    setOpen(true);
    updateErrorState();
  }
};

const setNewTimer = () => {
  if (open) {
    return;
  }
  if (!timer) {
    for (let i = 0; i < promises.length; i++) {
      const obj = promises[i];
      if (!obj.resolved) {
        const remaining = progressDelay - (new Date().getTime() - obj.time);
        if (remaining < 0) {
          update();
        } else {
          // eslint-disable-next-line no-loop-func
          obj.timer = setTimeout(() => {
            delete obj.timer;
            timer = false;
            update();
          }, remaining);
          timer = true;
        }
        break;
      }
    }
  }
};

const resolved = (promise) => {
  const obj = getPromiseObject(promise);
  if (!obj) {
    return;
  }
  obj.resolved = true;
  if (open) {
    update();
  } else {
    promises.splice(promises.indexOf(obj), 1);
  }
  if (obj.timer) {
    removePromiseTimer(obj);
    setNewTimer();
  }
  // Only needed to remove from ignoreNext when callType and status is a match
  checkIgnore(obj);
};

const rejected = (promise, value) => {
  const obj = getPromiseObject(promise);
  if (!obj) {
    return;
  }
  obj.resolved = false;
  obj.err = value;
  if (checkIgnore(obj)) {
    promises.splice(promises.indexOf(obj), 1);
    if (obj.timer) {
      removePromiseTimer(obj);
    }
    update();
    return;
  }
  if (open) {
    updateErrorState();
  } else {
    for (let i = 0; i < promises.length; i++) {
      const o = promises[i];
      if (o.timer) {
        removePromiseTimer(o);
      }
    }
    update();
  }
};

const check = (promise, callType) => {
  if (checkIgnoreTrue(callType)) {
    return;
  }
  const obj = {
    promise,
    callType,
    time: new Date().getTime(),
  };
  setPromises(promises.concat([obj]));
  promise.then(
    value => resolved(promise, value),
    value => rejected(promise, value),
  );
  setNewTimer();
};

export const setErrorStateCallback = (f) => {
  setErrorState = f;
};

export const setOnOpenCallback = (f) => {
  _setOpen = f;
};

export const setProgressDelay = (delay) => {
  progressDelay = delay;
};

export const registerHandler = () => {
  const entrystore = registry.get('entrystore');
  entrystore.addAsyncListener(check);
  registry.set('asynchandler', {
    extractProblem,
    addIgnore,
    checkIgnore,
    checkIgnoreTrue,
    codes: {
      GENERIC_PROBLEM,
      UNAUTHORIZED,
      INPROGRESS,
      SIGNED_OUT,
      LOST_CONNECTION,
    },
  });
};
