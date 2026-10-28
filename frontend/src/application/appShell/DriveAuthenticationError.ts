/** Deliberate sanitized Drive authentication failure, not provider response text. */
export class DriveAuthenticationError extends Error {
  constructor(message: string, private readonly ownsSession: () => boolean = () => true) {
    super(message);
    this.name = 'DriveAuthenticationError';
  }

  /** Rechecked at consumption: authorization may change after rejection. */
  get ownsCurrentSession(): boolean { return this.ownsSession(); }
}
