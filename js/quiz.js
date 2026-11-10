/* Shared data rules also power the local editor. No participant data is stored. */
const Quest = {
  validate(data) {
    if (!data || !data.settings || !Number.isInteger(data.settings.questionsPerRound) || data.settings.questionsPerRound < 1 || data.settings.questionsPerRound > 100) throw Error('Questions per round must be a whole number from 1 to 100.');
    // Older published banks and browser drafts inherit the new default.
    if (data.settings.autoAdvanceDelay === undefined) data.settings.autoAdvanceDelay = 3;
    if (!Number.isInteger(data.settings.autoAdvanceDelay) || data.settings.autoAdvanceDelay < 2 || data.settings.autoAdvanceDelay > 10) throw Error('Auto-advance delay must be a whole number from 2 to 10 seconds.');
    if (!Array.isArray(data.questions)) throw Error('The question bank must contain a questions array.');
    const ids = new Set();
    data.questions.forEach((q, i) => {
      if (!q || typeof q.id !== 'string' || !q.id.trim() || ids.has(q.id)) throw Error(`Question ${i + 1}: a unique text ID is required.`);
      ids.add(q.id);
      if (typeof q.question !== 'string' || !q.question.trim() || !Array.isArray(q.options) || q.options.length !== 4 || q.options.some(o => typeof o !== 'string' || !o.trim()) || new Set(q.options.map(o => o.trim().toLowerCase())).size !== 4 || !Number.isInteger(q.correctAnswer) || q.correctAnswer < 0 || q.correctAnswer > 3 || typeof q.explanation !== 'string' || typeof q.enabled !== 'boolean') throw Error(`Question ${i + 1}: provide text, four distinct options, one correct answer, an explanation string and an enabled flag.`);
    });
    return data;
  },
  shuffle(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[result[i], result[j]] = [result[j], result[i]]; }
    return result;
  },
  async load() { const response = await fetch('data/questions.json', { cache: 'no-store' }); if (!response.ok) throw Error('Published questions could not be loaded.'); return this.validate(await response.json()); }
};
function el(tag, text, className) { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; }
function button(text, action, className = 'primary') { const node = el('button', text, className); node.type = 'button'; node.addEventListener('click', action); return node; }
const app = document.getElementById('app');
if (app) {
  let bank, round, position, answered, advancing = false, resumeCountdown = null;
  const timers = new Set();
  function later(action, delay) {
    const timer = setTimeout(() => { timers.delete(timer); action(); }, delay);
    timers.add(timer); return timer;
  }
  function clearTimers() { timers.forEach(clearTimeout); timers.clear(); }
  window.addEventListener('pagehide', clearTimers);
  // Pause while away; returning never skips unread questions or strands a transition.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearTimers(); else if (resumeCountdown) resumeCountdown();
  });
  window.addEventListener('pageshow', () => { if (resumeCountdown) resumeCountdown(); });
  const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Short-lived, non-interactive particles; never retain animation nodes between rounds.
  function sparkleBurst(target, count = 10) {
    if (reducedMotion()) return;
    for (let i = 0; i < count; i++) {
      const spark = el('span', '✦', 'sparkle');
      const angle = i / count * Math.PI * 2;
      spark.style.setProperty('--x', `${Math.cos(angle) * (65 + Math.random() * 65)}px`);
      spark.style.setProperty('--y', `${Math.sin(angle) * (50 + Math.random() * 65)}px`);
      spark.style.setProperty('--turn', `${Math.random() * 180}deg`);
      spark.style.color = i % 2 ? '#97B854' : '#12A8B5';
      spark.setAttribute('aria-hidden', 'true'); target.append(spark);
      setTimeout(() => spark.remove(), 1100);
    }
  }
  function display(...nodes) { app.replaceChildren(...nodes); const heading = app.querySelector('h1,h2'); if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); } window.scrollTo(0, 0); }
  function welcome() {
    const title = el('h1'); title.append('CBIEV', el('br'), el('em', 'QUIZ POP!'));
    const art = el('div', undefined, 'hero-art'); art.setAttribute('aria-hidden', 'true'); const ticket = el('div', undefined, 'ticket'); ticket.append('EXPLORE · DISCOVER', el('strong', 'INNOVATE ✦')); art.append(el('span', '✦', 'star'), ticket, el('span', '✧', 'star'));
    const action = el('div', undefined, 'welcome-action'); action.append(button("Let’s Play!  →", start, 'primary wide'), el('p', 'No sign-up. Take your time to answer.', 'micro'));
    const steps = el('div', undefined, 'steps');['Pick an answer', 'Learn something', 'Claim your gift'].forEach((s, i) => { const item = el('span'); item.append(el('b', String(i + 1)), s); steps.append(item) });
    display(el('span', 'CBIEV BOOTH · IIPC 2026', 'eyebrow'), title, el('p', 'Tap. Think. Win!', 'tagline'), el('p', `Answer ${Math.min(bank.settings.questionsPerRound, bank.questions.filter(q => q.enabled).length)} quick questions and claim your gift!`, 'intro'), art, action, steps, el('p', 'Demo question bank · General innovation & entrepreneurship', 'micro'));
  }
  function start() { clearTimers(); resumeCountdown = null; document.body.classList.remove('quest-completed'); document.querySelectorAll('.confetti').forEach(node => node.remove()); round = Quest.shuffle(bank.questions.filter(q => q.enabled)).slice(0, bank.settings.questionsPerRound); position = 0; showQuestion(); }
  function showQuestion() {
    clearTimers(); resumeCountdown = null; advancing = false; answered = false;
    const label = el('div', undefined, 'progress-label'); label.append(el('span', `Question ${position + 1} of ${round.length}`), el('span', 'Keep that spark going ✦'));
    const bar = el('div', undefined, 'progress'); bar.setAttribute('role', 'progressbar'); bar.setAttribute('aria-label', 'Questions completed'); bar.setAttribute('aria-valuemin', '0'); bar.setAttribute('aria-valuemax', String(round.length)); bar.setAttribute('aria-valuenow', String(position)); const fill = el('span'); fill.style.width = `${position / round.length * 100}%`; bar.append(fill);
    const q = round[position], card = el('section', undefined, 'card question-card'), answers = el('div', undefined, 'answers'), feedback = el('div');
    card.append(el('span', 'A BRIGHT LITTLE CHALLENGE', 'tag'), el('h2', q.question), el('p', 'Tap the answer that feels right.', 'micro'), answers);
    const options = Quest.shuffle(q.options.map((text, index) => ({ text, index })));
    options.forEach((option, i) => {
      const choice = button('', () => {
        if (answered) return; answered = true;
        const correct = option.index === q.correctAnswer;
        [...answers.children].forEach((node, j) => {
          node.disabled = true;
          if (options[j].index === q.correctAnswer) {
            node.classList.add('correct', 'answer-pop');
            node.firstChild.textContent = '✓';
            node.setAttribute('aria-label', `Correct answer: ${options[j].text}`);
            sparkleBurst(node);
          } else if (node === choice) {
            node.classList.add('wrong', 'wrong-fade'); node.firstChild.textContent = '×';
          } else node.classList.add('answer-muted');
        });
        if (!reducedMotion() && typeof navigator.vibrate === 'function') {
          try { navigator.vibrate(correct ? 25 : [25, 35, 25]); } catch { /* Haptics are optional. */ }
        }
        fill.style.width = `${(position + 1) / round.length * 100}%`;
        bar.setAttribute('aria-valuenow', String(position + 1));
        const note = el('div', undefined, 'feedback feedback-enter');
        note.tabIndex = -1;
        note.append(el('strong', correct ? 'CORRECT!' : 'NOT QUITE!', `result-badge ${correct ? '' : 'result-retry'}`));
        note.append(el('p', `Correct answer: ${q.options[q.correctAnswer]}`));
        if (q.explanation) note.append(el('p', q.explanation));
        const countdown = el('span', '', 'countdown-label');
        countdown.setAttribute('aria-live', 'off');
        const track = el('div', undefined, 'countdown-track');
        track.setAttribute('aria-hidden', 'true');
        const countdownFill = el('span'); track.append(countdownFill);
        let remaining = bank.settings.autoAdvanceDelay;
        const finishAdvance = () => { resumeCountdown = null; position++; position < round.length ? showQuestion() : complete(); };
        const advance = () => {
          if (advancing) return;
          advancing = true; clearTimers(); next.disabled = true;
          card.classList.add('question-exit');
          resumeCountdown = finishAdvance;
          later(finishAdvance, reducedMotion() ? 0 : 200);
        };
        const next = button('Next Now →', advance, 'secondary next-now');
        const controls = el('div', undefined, 'countdown-controls'); controls.append(countdown, next);
        note.append(controls, track);
        feedback.append(note); feedback.className = 'feedback-dock';
        note.focus({ preventScroll: true });
        const tick = () => {
          countdown.textContent = `${position === round.length - 1 ? 'Celebrating' : 'Next question'} in ${remaining}…`;
          countdownFill.style.width = `${remaining / bank.settings.autoAdvanceDelay * 100}%`;
          if (remaining === 0) { advance(); return; }
          later(() => { remaining--; tick(); }, 1000);
        };
        resumeCountdown = () => { clearTimers(); tick(); };
        tick();
      }, 'answer'); choice.append(el('b', String.fromCharCode(65 + i)), el('span', option.text)); answers.append(choice)
    });
    display(label, bar, card, feedback);
  }
  function complete() {
    clearTimers(); resumeCountdown = null;
    document.body.classList.add('quest-completed');
    const card = el('section', undefined, 'card complete'); card.append(el('div', '✓', 'badge'), el('p', 'CBIEV QUIZ POP!', 'eyebrow'), el('h1', 'QUIZ COMPLETED!'), el('p', `${round.length} of ${round.length} questions completed. A little wiser, a little brighter.`), el('div', 'Show this screen to our booth staff to claim your gift!', 'gift'), button('Play Again', start, 'secondary'), el('p', 'Thanks for exploring with CBIEV at IIPC 2026.', 'micro')); display(card); sparkleBurst(card, 18);
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) for (let i = 0; i < 36; i++) { const piece = el('i', undefined, 'confetti'); piece.style.left = `${Math.random() * 100}%`; piece.style.background = ['#12A8B5', '#97B854', '#ffdc75', '#98cce8'][i % 4]; piece.style.animationDelay = `${Math.random() * .6}s`; piece.setAttribute('aria-hidden', 'true'); document.body.append(piece); setTimeout(() => piece.remove(), 3600) }
  }
  async function init() { try { bank = await Quest.load(); if (!bank.questions.some(q => q.enabled)) throw Error('There are no active questions yet.'); welcome() } catch (error) { display(el('h1', 'A tiny pit stop.'), el('p', 'Our quest is taking a breather. Please let our booth staff know.', 'intro'), el('p', `${error.message} Staff: check data/questions.json and serve the website over HTTP, not file://.`, 'micro'), button('Try again', init)) } }
  init();
}
