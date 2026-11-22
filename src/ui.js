function $(id) {
  return document.getElementById(id);
}

function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

export function createUI(handlers) {
  const toast = $('toast');
  let toastTimer = 0;

  $('play-btn').addEventListener('click', () => handlers.onPlay());
  $('mute-btn').addEventListener('click', () => handlers.onMute());
  $('garage-btn').addEventListener('click', () => handlers.onGarage());
  $('cam-btn').addEventListener('click', () => handlers.onCamera());
  $('result-ok').addEventListener('click', () => handlers.onDismiss());
  $('polaroid-ok').addEventListener('click', () => handlers.onDismiss());
  $('gfx-high').addEventListener('click', () => handlers.onQuality('high'));
  $('gfx-low').addEventListener('click', () => handlers.onQuality('low'));

  return {
    setLoad(ratio, label) {
      const bar = $('load-bar');
      const wrap = $('load');
      const amount = Math.max(0, Math.min(1, ratio));
      if (wrap.hidden && amount < 1) return;
      bar.style.width = `${Math.round(amount * 100)}%`;
      $('load-label').textContent = label;
      const done = amount >= 1;
      wrap.hidden = done;
      $('play-btn').disabled = !done;
    },
    setReady(message) {
      document.body.classList.add('ready');
      const err = $('boot-error');
      if (message) {
        err.hidden = false;
        err.textContent = message;
        $('play-btn').disabled = true;
      }
    },
    setMode(mode) {
      document.body.dataset.mode = mode;
      $('start').hidden = mode !== 'menu';
      $('hud').hidden = mode === 'menu';
      $('touch').hidden = mode !== 'play';
      $('garage-btn').hidden = mode === 'menu';
      if (mode !== 'garage') $('garage').hidden = true;
      if (mode !== 'result') $('result').hidden = true;
      if (mode !== 'polaroid') $('polaroid').hidden = true;
    },
    setWallet(text) {
      $('wallet').textContent = text;
    },
    setCash(text) {
      $('cash').textContent = text;
    },
    setGraphics(level) {
      $('gfx-high').classList.toggle('on', level === 'high');
      $('gfx-low').classList.toggle('on', level === 'low');
      $('gfx-high').setAttribute('aria-pressed', level === 'high' ? 'true' : 'false');
      $('gfx-low').setAttribute('aria-pressed', level === 'low' ? 'true' : 'false');
    },
    setHud({ cash, shells, objective, timer, warn }) {
      $('cash').textContent = cash;
      $('shells').textContent = shells;
      $('objective').textContent = objective;
      const timerEl = $('timer');
      timerEl.textContent = timer || '';
      timerEl.classList.toggle('warn', Boolean(warn));
      timerEl.hidden = !timer;
    },
    setArrow(visible, radians, label) {
      const wrap = $('compass-wrap');
      wrap.hidden = !visible;
      if (!visible) return;
      $('arrow').style.transform = `rotate(${radians}rad)`;
      $('arrow-dist').textContent = label;
    },
    setCamera(show) {
      $('cam-btn').hidden = !show;
    },
    setMuted(muted) {
      const btn = $('mute-btn');
      btn.setAttribute('aria-pressed', muted ? 'true' : 'false');
      btn.textContent = muted ? 'Muted' : 'Sound';
      btn.classList.toggle('is-muted', muted);
    },
    toast(text) {
      toast.textContent = text;
      toast.classList.add('show');
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2400);
    },
    flash() {
      const node = $('flash');
      node.classList.remove('on');
      void node.offsetWidth;
      node.classList.add('on');
    },
    showResult({ title, body }) {
      this.setMode('result');
      $('result-title').textContent = title;
      $('result-body').textContent = body;
      $('result').hidden = false;
    },
    showPolaroid({ url, caption, reward }) {
      this.setMode('polaroid');
      const img = $('polaroid-img');
      if (url) img.src = url;
      img.alt = caption;
      $('polaroid-caption').textContent = caption;
      $('polaroid-reward').textContent = `Nice shot! +$${reward}`;
      $('polaroid').hidden = false;
    },
    showGarage(model, actions) {
      this.setMode('garage');
      $('garage-cash').textContent = `Wallet $${model.cash}`;
      $('garage-jobs').textContent = model.jobs;
      const cars = $('car-list');
      const colors = $('color-list');
      clear(cars);
      clear(colors);
      for (const car of model.cars) {
        const card = el('article', 'car-card');
        card.append(el('h3', null, car.name));
        card.append(el('p', null, car.blurb));
        const btn = el('button', 'choice');
        btn.type = 'button';
        btn.id = `car-${car.id}`;
        if (car.selected) {
          btn.textContent = 'Driving';
          btn.disabled = true;
        } else if (car.owned) {
          btn.textContent = 'Drive';
          btn.addEventListener('click', () => actions.onCar(car.id));
        } else if (model.cash < car.price) {
          btn.textContent = `Need $${car.price}`;
          btn.disabled = true;
        } else {
          btn.textContent = `Unlock $${car.price}`;
          btn.addEventListener('click', () => actions.onCar(car.id));
        }
        card.append(btn);
        cars.append(card);
      }
      for (const color of model.colors) {
        const btn = el('button', 'swatch');
        btn.type = 'button';
        btn.id = `color-${color.id}`;
        btn.style.setProperty('--swatch', color.hex);
        btn.setAttribute('aria-label', color.name);
        const name = el('span', null, color.owned ? color.name : `${color.name} $${color.price}`);
        btn.append(el('i'), name);
        if (color.selected) btn.classList.add('selected');
        if (!color.owned && model.cash < color.price) btn.disabled = true;
        btn.addEventListener('click', () => actions.onColor(color.id));
        colors.append(btn);
      }
      $('garage').hidden = false;
      $('garage-close').onclick = () => actions.onClose();
    },
  };
}
