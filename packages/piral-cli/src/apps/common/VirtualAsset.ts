import * as Bundler from 'parcel-bundler';
import { computeMd5 } from './hash';

export class VirtualAsset extends (Bundler as any).Asset {
  private readonly content: string;

  constructor(name, options) {
    super(name, options);
    const [refName] = name
      .split('/')
      .reverse()
      .map(m => m.replace(/\.vm$/, ''));
    this.content = `module.exports=require('${refName}');`;
  }

  load() {}

  generate() {
    return {
      js: this.content,
    };
  }

  generateHash() {
    return Promise.resolve(computeMd5(this.content));
  }
}