import { Chalk } from 'chalk';

let _colorForced = false;

export function setColorForced(forced: boolean): void {
  _colorForced = forced;
}

function isColorEnabled(): boolean {
  if (process.env.NO_COLOR) return false;
  if (_colorForced) return true;
  return Boolean(process.stderr.isTTY);
}

export function createChalk() {
  const level = isColorEnabled() ? undefined : 0;
  return new Chalk({ level });
}

export function error(msg: string): string {
  return createChalk().red(msg);
}

export function success(msg: string): string {
  return createChalk().green(msg);
}

export function dim(msg: string): string {
  return createChalk().dim(msg);
}

export function bold(msg: string): string {
  return createChalk().bold(msg);
}
