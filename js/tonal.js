/* ===========================================================
   tonal.js — the daykeeper gift on the 404 page.

   Twenty solar seals and thirteen tones, turning together as the
   Mayan count of days keeps them. Shared from the tradition this
   hearth walks with; meanings follow Adi Marie's daykeeper key.

   THE COUNT'S ANCHOR: until the true kin is set, the count runs
   from this hearth's own anchor (ANCHOR_DATE = ANCHOR_KIN below).
   To align it with the living count, change ANCHOR_KIN to the kin
   number of ANCHOR_DATE (or change both) — one edit, nothing else.
   =========================================================== */
(function () {
  'use strict';

  // Color families of the four directions, tuned to the site's palette.
  var RED = '#B85C48', WHITE = '#9A917F', BLUE = '#5F7B8F', YELLOW = '#C9A84C';

  var SEALS = [
    { n: 'Red Dragon', e: 'Memory', col: RED,
      g: "<path d='M34 72 q26 14 52 0'/><path d='M36 68 l5 -11 l7 9 l6 -12 l7 10 l6 -11 l7 9 l6 -8'/><circle cx='47' cy='75' r='2.6' fill='CUR' stroke='none'/>",
      d: 'The first seal: the primal mother, the being of the waters that nurtures everything into form. Dragon days carry primal trust in divine nurturance, the giving and receiving of love, and the deep memory of where we all began. What is born today is fed from the oldest source there is.',
      c: 'Let yourself be nourished without earning it. Speak a dream or a desire out loud so it can be fed.' },
    { n: 'White Wind', e: 'Spirit', col: WHITE,
      g: "<path d='M62 60 a6 6 0 1 1 -6 -6 a12 12 0 1 0 12 12 a19 19 0 1 1 -19 -19'/><path d='M80 46 h12 M82 58 h14 M80 70 h12'/>",
      d: 'The breath of spirit moving through all things. Wind days ask for the present moment: going with the flow, speaking truth simply, letting inspiration arrive on its own weather. You are not the author of the wind, only the reed it plays. Co-create; do not force.',
      c: 'Simplify one thing. Say one true sentence. Then let the day carry it where it will.' },
    { n: 'Blue Night', e: 'Abundance', col: BLUE,
      g: "<path d='M42 80 v-26 q0 -18 18 -18 t18 18 v26'/><circle cx='52' cy='62' r='2.2' fill='CUR' stroke='none'/><circle cx='60' cy='54' r='2.2' fill='CUR' stroke='none'/><circle cx='68' cy='62' r='2.2' fill='CUR' stroke='none'/>",
      d: 'The house of the dream, the fertile dark. Night days invite the conscious dreamer downward: into the abyss that is not empty but full, into the self where abundance is stored like seed grain in winter. What looks like darkness is the storehouse of everything not yet born.',
      c: 'Keep a dream, night or day, and write it down. Descend gladly; the wealth is below.' },
    { n: 'Yellow Seed', e: 'Flowering', col: YELLOW,
      g: "<circle cx='60' cy='70' r='11'/><path d='M60 59 q-3 -10 5 -17 M60 59 q9 -5 5 -17'/><circle cx='60' cy='70' r='3' fill='CUR' stroke='none'/>",
      d: 'The sign of what is coiled and waiting. Seed days hold the whole flowering folded inside a husk: new possibilities, self-germination, the patient intelligence that knows exactly when to crack open. Nothing needs to be rushed; everything needs to be planted where it can be reached by light.',
      c: 'Plant one intention in actual ground: write it, say it, begin its first small motion.' },
    { n: 'Red Serpent', e: 'Life force', col: RED,
      g: "<path d='M34 72 q12 -12 22 -3 q10 9 20 -3 q4 -5 8 -4'/><circle cx='84' cy='60' r='4.5'/><path d='M88 58 l8 -3 M88 62 l8 2'/>",
      d: 'The body electric, wisdom carried belly-to-earth. Serpent days move the life force itself: passion, instinct, desire, the creative fire that rises up the spine of things when it is trusted. The body already knows; the day asks you to listen from the skin inward.',
      c: 'Move the body until it hums: walk, stretch, dance. Trust the first instinct before the second thought.' },
    { n: 'White World-Bridger', e: 'Release', col: WHITE,
      g: "<circle cx='60' cy='54' r='16'/><circle cx='54' cy='51' r='2.6' fill='CUR' stroke='none'/><circle cx='66' cy='51' r='2.6' fill='CUR' stroke='none'/><path d='M58 58 l2 4 l2 -4'/><path d='M48 70 h24 M53 70 v8 M60 70 v9 M67 70 v8'/>",
      d: 'The one who spans the worlds by letting go. World-Bridger days carry death in its kindest form: release, forgiveness, surrender, the ease that follows humility. Every bridge is built from something that agreed to lie down. What you release today becomes the way across.',
      c: 'Forgive one thing, even partially. Set down one weight and notice the bridge it becomes.' },
    { n: 'Blue Hand', e: 'Accomplishment', col: BLUE,
      g: "<path d='M46 80 q14 8 28 0'/><path d='M48 78 v-18 M56 76 v-24 M64 76 v-26 M72 78 v-20'/><path d='M46 66 q-9 0 -7 11'/>",
      d: 'The healing hand, the tool-bearer. Hand days are for completion: the spiritual gifts you carry are meant to be used, and finishing one true thing opens more than starting ten. Being whole and beautiful in your work quietly gives everyone near you permission to be the same.',
      c: 'Finish something with your own hands today, and let it be seen.' },
    { n: 'Yellow Star', e: 'Art', col: YELLOW,
      g: "<path d='M60 42 l15 18 l-15 18 l-15 -18 z'/><circle cx='60' cy='32' r='2.2' fill='CUR' stroke='none'/><circle cx='60' cy='88' r='2.2' fill='CUR' stroke='none'/><circle cx='32' cy='60' r='2.2' fill='CUR' stroke='none'/><circle cx='88' cy='60' r='2.2' fill='CUR' stroke='none'/>",
      d: 'The harmony sign, beauty as a way of knowing. Star days tune the world: expanded love, radiant influence, the new chord the Earth is learning. Art is not decoration here; it is navigation, the way-shower. Whatever you make beautiful today, you also make more true.',
      c: 'Beautify one corner of the day on purpose: the meal, the sentence, the doorway, the gesture.' },
    { n: 'Red Moon', e: 'Purification', col: RED,
      g: "<path d='M66 34 a26 26 0 1 0 0 52 a21 21 0 1 1 0 -52'/><circle cx='74' cy='60' r='2.8' fill='CUR' stroke='none'/>",
      d: 'The beacon of the waters, self-remembrance moving in tides. Moon days purify by feel: intuition sharpens, signs and signals multiply, the inner knowing speaks in its native tongue. You do not need to decode everything. You need only to notice what keeps arriving.',
      c: 'Follow the signal that has come three times. Water, in any form, will help you hear it.' },
    { n: 'White Dog', e: 'Love', col: WHITE,
      g: "<path d='M42 74 q-2 -18 14 -22 l5 -12 l8 11 q15 1 15 15 q0 9 -9 11 q-16 3 -33 -3'/><circle cx='66' cy='60' r='2.4' fill='CUR' stroke='none'/><path d='M78 70 l8 4'/>",
      d: 'The loyal heart, walking beside. Dog days gather the companions of destiny: the ones who resonate with you, guide you, and break through with you into new beginnings. Love here is not a feeling first; it is a faithfulness, four-footed and patient, that keeps showing up.',
      c: 'Walk beside someone today, literally or in spirit, and let them know they are not alone.' },
    { n: 'Blue Monkey', e: 'Magic', col: BLUE,
      g: "<circle cx='54' cy='48' r='9'/><path d='M50 57 q-6 14 6 22 q8 5 16 2'/><path d='M72 80 q14 0 13 -11 a7 7 0 1 0 -7 7'/><circle cx='51' cy='46' r='1.7' fill='CUR' stroke='none'/><circle cx='57' cy='46' r='1.7' fill='CUR' stroke='none'/>",
      d: 'The divine trickster, keeper of the serious-and-fun axis. Monkey days work their magic through play: spontaneity, laughter, the inner child who tells the truth by joking. Transparency is the trick; nothing hidden, everything light. What refuses to be solemn today is probably sacred.',
      c: 'Play, actually play, at something. Let one laugh come all the way from the belly.' },
    { n: 'Yellow Human', e: 'Free will', col: YELLOW,
      g: "<path d='M44 60 q16 14 32 0'/><path d='M44 60 v14 q16 11 32 0 v-14'/><circle cx='60' cy='42' r='6'/>",
      d: 'The open vessel, the chalice being re-wired for finer frequencies. Human days cleanse and widen the channel: abundance and harvest come not from grasping but from choosing, freely, what to receive and what to pour. The will is the cup; the day fills it to the shape you hold.',
      c: 'Make one free, deliberate choice you have been leaving to habit. Then receive what follows.' },
    { n: 'Red Skywalker', e: 'Prophecy', col: RED,
      g: "<path d='M46 82 v-32 M74 82 v-32'/><path d='M40 46 q20 -13 40 0'/><path d='M46 66 h28'/>",
      d: 'The pillar between heaven and earth, the explorer of the Unknown. Skywalker days loosen the moorings: courage rises, the horizon leans closer, and heaven asks to be brought down into rooms and schedules and bodies. Prophecy is only this: walking as if the bridge is there, and finding it is.',
      c: 'Take one brave step into what is not yet mapped. Bring back a piece of sky for someone.' },
    { n: 'White Wizard', e: 'Timelessness', col: WHITE,
      g: "<path d='M44 72 q0 -24 16 -24 t16 24'/><path d='M50 62 q5 4 10 0 M60 62 q5 4 10 0'/><path d='M44 46 q16 -14 32 0 M50 40 q10 -8 20 0'/>",
      d: 'The enchanter whose only spell is integrity. Wizard days align the personal will with the divine one, and in that alignment magic is simply allowed to happen. The wizard does not push; the wizard knows with the heart, eyes closed, outside of time, and the world rearranges to match.',
      c: 'Align before you act: one quiet minute, eyes closed, until the heart and the plan agree.' },
    { n: 'Blue Eagle', e: 'Vision', col: BLUE,
      g: "<path d='M34 70 q26 -24 52 0 M41 60 q19 -17 38 0 M48 50 q12 -10 24 0'/><circle cx='60' cy='40' r='3'/><path d='M63 40 l7 3 l-7 4'/>",
      d: 'The far-seer, the planetary servant. Eagle days lift the gaze until the whole pattern shows: dreams and visions, hope with wingspan, commitment that comes from believing in oneself because the view from height makes the path plain. See far today, then serve what you saw.',
      c: 'Rise above one tangle and look at it from the whole life. Choose from up there, then descend kindly.' },
    { n: 'Yellow Warrior', e: 'Intelligence', col: YELLOW,
      g: "<circle cx='52' cy='60' r='12'/><path d='M52 52 v16 M46 60 h12'/><path d='M74 40 v42 M70 44 l4 -6 l4 6'/>",
      d: 'The fearless questioner, grace under way. Warrior days trust the inner guidance completely: intelligence here is not cleverness but the clear conduit, the divine communication that comes when fear steps aside. Ask the bold question. The answer has been waiting for exactly that courage.',
      c: 'Ask the question you have been avoiding, of yourself or another, with grace and a straight spine.' },
    { n: 'Red Earth', e: 'Navigation', col: RED,
      g: "<circle cx='60' cy='60' r='20'/><path d='M60 40 q-5 10 2 15 q7 5 4 13'/><circle cx='51' cy='51' r='2.4' fill='CUR' stroke='none'/>",
      d: 'The Earth keeper, centered and barefoot. Earth days navigate by synchronicity: being grounded is the compass, and the planet herself supplies the signs. Watch what aligns, what repeats, what arrives at the exact moment. The way forward is written in the ground you are standing on.',
      c: 'Put your feet on actual earth. Follow one synchronicity the day offers, without needing to know why.' },
    { n: 'White Mirror', e: 'Clarity', col: WHITE,
      g: "<path d='M42 42 h36 v36 h-36 z'/><path d='M42 42 l36 36 M78 42 l-36 36'/>",
      d: 'The blade of clarity, the hall of honest reflections. Mirror days examine the shadow without flinching: discernment, truth-telling, the willingness to be a clean mirror for others by being clean within. Nothing is cut today except what was never real. What remains is exact and shining.',
      c: 'Look at one reflection you have been avoiding, and thank it. Honesty today is a kindness.' },
    { n: 'Blue Storm', e: 'Renewal', col: BLUE,
      g: "<path d='M38 58 q5 -14 22 -14 t22 14'/><path d='M44 66 l-4 10 M58 66 l-4 12 M72 66 l-4 10 M84 64 l-4 9'/>",
      d: 'The thundercloud that generates itself. Storm days arrive with intensity of feeling, breakdown and breakthrough riding the same wind. This is purification at full weather: the old structure comes apart not as punishment but as freedom. Let it rain all the way through; what is real will still be standing.',
      c: 'Let the strong feeling move all the way through you instead of managing it. Freedom is on its far side.' },
    { n: 'Yellow Sun', e: 'Radiance', col: YELLOW,
      g: "<circle cx='60' cy='60' r='14'/><path d='M60 36 v-8 M60 92 v-8 M36 60 h-8 M92 60 h-8 M43 43 l-6 -6 M77 43 l6 -6 M43 77 l-6 6 M77 77 l6 6'/><circle cx='60' cy='60' r='3' fill='CUR' stroke='none'/>",
      d: 'The last seal and the crown of the count: bliss, unconditional love, pure conscious awareness. Sun days do not ask you to become anything; they ask you to shine as what you already are, in every direction at once, the way light does, without choosing whom to warm.',
      c: 'Shine on everything equally today: the loved, the difficult, yourself. Withhold nothing.' }
  ];

  var TONES = [
    'Tone 1 · Magnetic — independence, unity, the growing essence of self',
    'Tone 2 · Lunar — polarity, co-operation, relationship',
    'Tone 3 · Electric — change, movement, flow, creativity woven into one',
    'Tone 4 · Self-Existing — give the dream discipline and form',
    'Tone 5 · Overtone — core purpose, foundation, central intent',
    'Tone 6 · Rhythmic — organic balance, heaven brought to earth, roots',
    'Tone 7 · Resonant — mystical alignment put to practical use',
    'Tone 8 · Galactic — harmonic resonance, empowerment, one heart',
    'Tone 9 · Solar — shine the light for others; expansion, mastery',
    'Tone 10 · Planetary — what does your heart desire to manifest?',
    'Tone 11 · Spectral — stripping away, dissolving, letting go',
    'Tone 12 · Crystal — stability in expansion, the framework of connectedness',
    'Tone 13 · Cosmic — universal movement, the wild card, welcome the unexpected'
  ];

  // ── The count's anchor ─────────────────────────────────
  // Until the true kin is set: this hearth counts ANCHOR_DATE as kin 1
  // (Red Magnetic Dragon). To align with the living count, set
  // ANCHOR_KIN to the real kin number of ANCHOR_DATE.
  var ANCHOR_DATE = Date.UTC(2026, 0, 1);
  var ANCHOR_KIN = 1;

  var now = new Date();
  var todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  var days = Math.round((todayUTC - ANCHOR_DATE) / 86400000);
  var kin = ((ANCHOR_KIN - 1 + days) % 260 + 260) % 260 + 1;
  var seal_ = SEALS[(kin - 1) % 20];
  var tone = ((kin - 1) % 13) + 1;

  function medallion(s) {
    var inner = s.g.replace(/CUR/g, s.col);
    return "<svg viewBox='0 0 120 120' role='img' aria-hidden='true'>" +
      "<g fill='none' stroke='#c9a84c' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'>" +
      "<circle cx='60' cy='60' r='55'/><circle cx='60' cy='60' r='48' stroke-dasharray='1 6' opacity='0.55'/></g>" +
      "<g fill='none' stroke='" + s.col + "' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'>" +
      inner + "</g></svg>";
  }

  var sealEl = document.getElementById('tonalSeal');
  if (!sealEl) return;
  sealEl.innerHTML = medallion(seal_);
  document.getElementById('tonalName').innerHTML = seal_.n + ' &middot; <span>' + seal_.e + '</span>';
  document.getElementById('tonalNumber').textContent = TONES[tone - 1] + ' · kin ' + kin;
  document.getElementById('tonalDesc').textContent = seal_.d;
  document.getElementById('tonalCarry').textContent = 'Carried today: ' + seal_.c;
})();
