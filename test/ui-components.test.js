import test from 'node:test';
import assert from 'node:assert';
import { SUITS, VALUES, createCard } from '../lib/truco/cards.ts';
import { sounds } from '../lib/sound/audio.ts';

test('UI Components - Card Suit and Value coverage', async (t) => {
  await t.test('all 40 cards have valid suits and display values', () => {
    for (const suit of SUITS) {
      for (const value of VALUES) {
        const card = createCard(value, suit);
        assert.ok(card.id.length > 0);
        assert.ok(['espada', 'basto', 'oro', 'copa'].includes(card.suit));
        assert.ok(card.rank >= 1 && card.rank <= 14);
      }
    }
  });

  await t.test('special cards (Ancho de Espada, Siete Bravo) have distinct ranks', () => {
    const anchoEspada = createCard(1, 'espada');
    const anchoBasto = createCard(1, 'basto');
    const sieteEspada = createCard(7, 'espada');
    const sieteOro = createCard(7, 'oro');

    assert.strictEqual(anchoEspada.rank, 14);
    assert.strictEqual(anchoBasto.rank, 13);
    assert.strictEqual(sieteEspada.rank, 12);
    assert.strictEqual(sieteOro.rank, 11);
  });
});

test('UI Components - Audio Controller', async (t) => {
  await t.test('sound controller methods execute safely in Node environment without crashing', () => {
    assert.strictEqual(typeof sounds.playCard, 'function');
    assert.strictEqual(typeof sounds.playDeal, 'function');
    assert.strictEqual(typeof sounds.playCanto, 'function');
    assert.strictEqual(typeof sounds.playWin, 'function');
    assert.strictEqual(typeof sounds.playLose, 'function');
    assert.strictEqual(typeof sounds.playCantoVoice, 'function');
    assert.strictEqual(typeof sounds.playTruco, 'function');
    assert.strictEqual(typeof sounds.playRetruco, 'function');
    assert.strictEqual(typeof sounds.playValeCuatro, 'function');
    assert.strictEqual(typeof sounds.playEnvido, 'function');
    assert.strictEqual(typeof sounds.playRealEnvido, 'function');
    assert.strictEqual(typeof sounds.playFaltaEnvido, 'function');
    assert.strictEqual(typeof sounds.playQuiero, 'function');
    assert.strictEqual(typeof sounds.playNoQuiero, 'function');

    // Should not throw even when window/AudioContext is not present in Node
    assert.doesNotThrow(() => sounds.playCard());
    assert.doesNotThrow(() => sounds.playDeal());
    assert.doesNotThrow(() => sounds.playCanto());
    assert.doesNotThrow(() => sounds.playWin());
    assert.doesNotThrow(() => sounds.playLose());
    assert.doesNotThrow(() => sounds.playTruco());
    assert.doesNotThrow(() => sounds.playRetruco());
    assert.doesNotThrow(() => sounds.playValeCuatro());
    assert.doesNotThrow(() => sounds.playEnvido());
    assert.doesNotThrow(() => sounds.playRealEnvido());
    assert.doesNotThrow(() => sounds.playFaltaEnvido());
    assert.doesNotThrow(() => sounds.playQuiero());
    assert.doesNotThrow(() => sounds.playNoQuiero());
    assert.doesNotThrow(() => sounds.playCantoVoice('truco'));
  });

  await t.test('sound controller toggle works', () => {
    sounds.enabled = false;
    assert.strictEqual(sounds.enabled, false);
    assert.doesNotThrow(() => sounds.playCard());
    assert.doesNotThrow(() => sounds.playTruco());

    sounds.enabled = true;
    assert.strictEqual(sounds.enabled, true);
  });
});
