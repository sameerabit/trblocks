export const INPROGRESS = 0;
export const GENERIC_PROBLEM = 1;
export const UNAUTHORIZED = 2;
export const SIGNED_OUT = 3;
export const LOST_CONNECTION = 4;

const _ignoreNext = {};
const _ignore = {};

export const extractProblem = (err) => {
  if (
    typeof err === 'object' &&
    err.response &&
    typeof err.response.status === 'number'
  ) {
    const { status } = err.response;
    const major = Math.floor(status / 100);
    switch (major) {
      case 0:
        return LOST_CONNECTION;
      case 1:
      case 3:
        return GENERIC_PROBLEM;
      case 4:
        // 403 is a specific error when a user is disabled
        // and the correct username/password combination was submitted
        return status === 401 || status === 403
          ? UNAUTHORIZED
          : GENERIC_PROBLEM;
      default:
    }
  }
  return GENERIC_PROBLEM;
};

export const addIgnore = (callType, status, forNextRequest) => {
  const ignoreObj = forNextRequest === true ? _ignoreNext : _ignore;
  if (typeof status === 'number') {
    ignoreObj[callType] = status;
  } else {
    ignoreObj[callType] = true;
  }
};

export const removeIgnore = (callType) => {
  delete _ignoreNext[callType];
  delete _ignore[callType];
};

export const checkIgnoreTrue = (callType) => {
  if (_ignoreNext[callType] === true) {
    delete _ignoreNext[callType];
    return true;
  }
  return _ignore[callType] === true;
};

export const checkIgnore = (obj) => {
  const ct = obj.callType;
  let status = -1;
  if (obj.err) {
    status = extractProblem(obj.err);
  }

  const ignoreNextStatus = _ignoreNext[ct];
  if (typeof ignoreNextStatus !== 'undefined') {
    delete _ignoreNext[ct];
    return ignoreNextStatus === true ? true : ignoreNextStatus === status;
  }

  const ignoreStatus = _ignore[ct];
  if (typeof ignoreStatus !== 'undefined') {
    return ignoreStatus === true ? true : ignoreStatus === status;
  }
  return false;
};
