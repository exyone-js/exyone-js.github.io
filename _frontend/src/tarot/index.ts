/*!
 * Sortes Sacrae · bundle entry
 *
 * All six tarot pages share one stylesheet and one script bundle
 * (`tarot.bundle.js`, built from this file). Each page declares its identity in
 * `<body data-page="…">`, and only the matching controller is mounted — so a
 * visitor to `/tarot/deck/` never executes the draw-table or reading logic, even
 * though the code sits in the same file.
 *
 * Keeping the tarot code in its own bundle (never merged into the site's main
 * `bundle.js`) matters: the deck data is heavy, and nothing outside `/tarot/`
 * needs it.
 */
import { q } from './core';
import * as home from './home';
import * as draw from './draw';
import * as reading from './reading';
import * as codex from './codex';
import * as history from './history';
import * as about from './about';

type Mountable = { mount?: () => void };

const controllers: Record<string, Mountable> = {
  index: home,
  draw,
  reading,
  codex,
  history,
  about
};

const page = (q<HTMLElement>('body')?.dataset.page ?? 'index') || 'index';
const controller = controllers[page];

if (controller && typeof controller.mount === 'function') {
  controller.mount();
}
