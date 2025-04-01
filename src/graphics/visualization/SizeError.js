export default class SizeError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SizeError';
  }
}
